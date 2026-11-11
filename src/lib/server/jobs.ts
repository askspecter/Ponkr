import "server-only";
import crypto from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { runAgent, type AgentAction, type AgentContext } from "./agent";
import { load, save } from "./store";

export interface Job {
  jobId: string;
  threadId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  prompt: string;
  response?: string;
  actions?: AgentAction[];
  error?: string;
  owner: string;
  createdAt: number;
  completedAt?: number;
}

type Threads = Record<string, { owner: string; messages: Anthropic.MessageParam[] }>;

const jobs = () => load<Record<string, Job>>("jobs", {});

export function getJob(id: string) {
  return jobs()[id];
}

function put(j: Job) {
  const all = jobs();
  all[j.jobId] = j;
  // keep the latest 5000 jobs
  const ids = Object.keys(all);
  if (ids.length > 5000) for (const id of ids.slice(0, ids.length - 5000)) delete all[id];
  save("jobs", all);
}

export function submit(prompt: string, owner: string, ctx: AgentContext, threadId?: string) {
  const threads = load<Threads>("threads", {});
  const tid = threadId && threads[threadId]?.owner === owner ? threadId : crypto.randomUUID();
  const job: Job = { jobId: crypto.randomUUID(), threadId: tid, status: "pending", prompt, owner, createdAt: Date.now() };
  put(job);
  void (async () => {
    job.status = "processing";
    put(job);
    try {
      const t = threads[tid] ?? { owner, messages: [] };
      t.messages.push({ role: "user", content: prompt });
      const r = await runAgent(t.messages, ctx);
      if (getJob(job.jobId)?.status === "cancelled") return;
      t.messages.push({ role: "assistant", content: r.text });
      t.messages = t.messages.slice(-30);
      threads[tid] = t;
      save("threads", threads);
      Object.assign(job, { status: "completed", response: r.text, actions: r.actions, completedAt: Date.now() });
    } catch (e) {
      Object.assign(job, { status: "failed", error: (e as Error).message, completedAt: Date.now() });
    }
    put(job);
  })();
  return job;
}

export function cancel(id: string, owner: string) {
  const j = getJob(id);
  if (!j || j.owner !== owner) return undefined;
  if (j.status === "pending" || j.status === "processing") {
    j.status = "cancelled";
    j.completedAt = Date.now();
    put(j);
  }
  return j;
}
