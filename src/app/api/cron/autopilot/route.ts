import { runAutopilot } from "@/lib/server/autopilot";
import { err, handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Called every minute by a scheduler. Requires CRON_SECRET as a Bearer token or ?key=. */
export async function GET(req: Request) {
  return handle(async () => {
    const secret = process.env.CRON_SECRET;
    const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || new URL(req.url).searchParams.get("key");
    if (!secret || given !== secret) return err("Unauthorized", 401);
    return json(await runAutopilot(45_000));
  });
}
