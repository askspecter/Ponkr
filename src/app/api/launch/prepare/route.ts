import { getAddress, isAddress } from "viem";
import { buildLaunch, type LaunchInput } from "@/lib/server/tx";
import { err, handle, json } from "@/lib/server/http";

export async function POST(req: Request) {
  return handle(async () => {
    const body = (await req.json()) as LaunchInput & { sender: string };
    if (!isAddress(body.sender)) return err("Connect a wallet first");
    try {
      return json(await buildLaunch(body, getAddress(body.sender)));
    } catch (e) {
      return err((e as Error).message);
    }
  });
}
