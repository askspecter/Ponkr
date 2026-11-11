import { after } from "next/server";
import { authApiKey } from "@/lib/server/accounts";

export const maxDuration = 300;
import { submit } from "@/lib/server/jobs";
import { err, handle, json } from "@/lib/server/http";

/** POST /api/v1/agent/prompt { prompt, threadId? } -> 202 { jobId, threadId } */
export async function POST(req: Request) {
  return handle(async () => {
    const a = await authApiKey(req);
    if ("error" in a) return err(a.error!, a.status);
    const b = (await req.json()) as { prompt?: string; threadId?: string; imageUrl?: string };
    if (!b.prompt?.trim()) return err("prompt is required");
    const owner = a.key.id;
    const { job, work } = await submit(b.prompt.slice(0, 4000), owner, { channel: "api", wallet: a.key.owner, verifiedWallets: [a.key.owner], identity: `key:${a.key.id}`, attachedImage: b.imageUrl }, b.threadId);
    // Keep the serverless function alive until the agent finishes.
    after(() => work);
    return json({ success: true, jobId: job.jobId, threadId: job.threadId, status: job.status }, 202);
  });
}
