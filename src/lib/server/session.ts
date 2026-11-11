import "server-only";
import { getAddress, isAddress, verifyMessage, type Address, type Hex } from "viem";
import { sessionMessage } from "../messages";

const verified = new Map<string, Address>();

/** Header `x-session: <address>.<issuedAtMs>.<signature>` — valid for 7 days. */
export async function sessionWallet(req: Request): Promise<Address | undefined> {
  const raw = req.headers.get("x-session");
  if (!raw) return undefined;
  const hit = verified.get(raw);
  if (hit) return hit;
  const [address, issued, sig] = raw.split(".");
  if (!address || !isAddress(address) || !issued || !sig) return undefined;
  if (Date.now() - Number(issued) > 7 * 86400_000) return undefined;
  try {
    const ok = await verifyMessage({ address, message: sessionMessage(address, issued), signature: sig as Hex });
    if (!ok) return undefined;
    const a = getAddress(address);
    verified.set(raw, a);
    return a;
  } catch {
    return undefined;
  }
}
