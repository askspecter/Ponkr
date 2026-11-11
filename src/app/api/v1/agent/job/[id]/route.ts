import { authApiKey } from "@/lib/server/accounts";
import { getJob } from "@/lib/server/jobs";
import { err, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authApiKey(req);
  if ("error" in a) return err(a.error!, a.status);
  const { id } = await params;
  const j = await getJob(id);
  if (!j || j.owner !== a.key.id) return err("Job not found", 404);
  const pub = { ...j, owner: undefined };
  return json(pub);
}
