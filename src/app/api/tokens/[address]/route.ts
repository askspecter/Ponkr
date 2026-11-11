import { tokenDetail } from "@/lib/server/tokens";
import { err, handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  return handle(async () => {
    const { address } = await params;
    const d = await tokenDetail(decodeURIComponent(address));
    if (!d) return err("Token not found", 404);
    return json(d);
  });
}
