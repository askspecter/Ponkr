import { getAddress, isAddress, type Hex } from "viem";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/server/accounts";
import { err, handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner") || "";
  if (!isAddress(owner)) return err("owner required");
  return json({ keys: listApiKeys(owner) });
}

export async function POST(req: Request) {
  return handle(async () => {
    const b = (await req.json()) as { owner: string; nonce: string; signature: Hex; name?: string; revoke?: string };
    if (!isAddress(b.owner)) return err("owner required");
    try {
      if (b.revoke) {
        await revokeApiKey(getAddress(b.owner), b.revoke, b.nonce, b.signature);
        return json({ ok: true });
      }
      return json(await createApiKey(getAddress(b.owner), b.nonce, b.signature, b.name ?? "default"));
    } catch (e) {
      return err((e as Error).message);
    }
  });
}
