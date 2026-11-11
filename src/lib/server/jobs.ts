import "server-only";
import crypto from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { runAgent, type AgentAction, type AgentContext } from "./agent";
import { kvGet, kvSet } from "./store";

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

interface Thread {
  owner: string;
  messages: Anthropic.MessageParam[];
}

const JOB_TTL = 7 * 86400;
const THREAD_TTL = 30 * 86400;

export function getJob(id: string) {
  return kvGet<Job | null>(`job:${id}`, null);
}

const put = (j: Job) => kvSet(`job:${j.jobId}`, j, JOB_TTL);

/**
 * Creates a job and returns it together with the work promise. On serverless hosts the caller
 * must keep the function alive until `work` settles (Next.js `after()`).
 */
export async function submit(prompt: string, owner: string, ctx: AgentContext, threadId?: string) {
  const existing = threadId ? await kvGet<Thread | null>(`thread:${threadId}`, null) : null;
  const tid = existing && existing.owner === owner ? threadId! : crypto.randomUUID();
  const job: Job = { jobId: crypto.randomUUID(), threadId: tid, status: "pending", prompt, owner, createdAt: Date.now() };
  await put(job);

  const work = (async () => {
    job.status = "processing";
    await put(job);
    try {
      const t: Thread = existing && existing.owner === owner ? existing : { owner, messages: [] };
      t.messages.push({ role: "user", content: prompt });
      const r = await runAgent(t.messages, ctx);
      if ((await getJob(job.jobId))?.status === "cancelled") return;
      t.messages.push({ role: "assistant", content: r.text });
      t.messages = t.messages.slice(-30);
      await kvSet(`thread:${tid}`, t, THREAD_TTL);
      Object.assign(job, { status: "completed", response: r.text, actions: r.actions, completedAt: Date.now() });
    } catch (e) {
      Object.assign(job, { status: "failed", error: (e as Error).message, completedAt: Date.now() });
    }
    await put(job);
  })();

  return { job, work };
}

export async function cancel(id: string, owner: string) {
  const j = await getJob(id);
  if (!j || j.owner !== owner) return undefined;
  if (j.status === "pending" || j.status === "processing") {
    j.status = "cancelled";
    j.completedAt = Date.now();
    await put(j);
  }
  return j;
}
