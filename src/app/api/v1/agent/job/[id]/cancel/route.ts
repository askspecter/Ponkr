import { authApiKey } from "@/lib/server/accounts";
import { cancel } from "@/lib/server/jobs";
import { err, json } from "@/lib/server/http";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = authApiKey(req);
  if ("error" in a) return err(a.error!, a.status);
  const { id } = await params;
  const j = cancel(id, a.key.id);
  if (!j) return err("Job not found", 404);
  return json({ jobId: j.jobId, status: j.status });
}
