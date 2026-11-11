import "server-only";
import { createWalletClient, decodeEventLog, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { factoryAbi } from "../abis";
import { RPC_URL, robinhoodChain } from "../config";
import { markViaApp } from "./indexer";
import { rpc } from "./rpc";
import { buildLaunch, type LaunchInput } from "./tx";
import { load, save } from "./store";

/**
 * Gas-sponsored launches: the platform wallet pays the launch fee + gas and sets the
 * user's address as the creator fee recipient, so 100% of creator fees go to the user.
 */
export function deployerEnabled() {
  return Boolean(process.env.DEPLOYER_PRIVATE_KEY);
}

function account() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY as Hex | undefined;
  if (!pk) throw new Error("Sponsored launches are not configured on this server.");
  return privateKeyToAccount(pk);
}

const MAX_PER_DAY = Number(process.env.SPONSORED_LAUNCHES_PER_DAY || 3);

/** Limits sponsored launches per identity (wallet / X user / telegram user / api key). */
export function checkLaunchQuota(identity: string) {
  const day = new Date().toISOString().slice(0, 10);
  const q = load<Record<string, number>>(`launch-quota-${day}`, {});
  const used = q[identity] ?? 0;
  if (used >= MAX_PER_DAY) throw new Error(`Daily sponsored launch limit reached (${MAX_PER_DAY}/day). Try again tomorrow or launch from your own wallet.`);
  return () => {
    q[identity] = used + 1;
    save(`launch-quota-${day}`, q);
  };
}

export async function sponsoredLaunch(input: LaunchInput, identity: string) {
  if (input.initialBuyEth && Number(input.initialBuyEth) > 0) {
    throw new Error("Sponsored launches cannot include an initial buy. Launch from your own wallet to snipe-proof buy at launch.");
  }
  const commit = checkLaunchQuota(identity);
  const acct = account();
  const built = await buildLaunch(input, acct.address);
  const wallet = createWalletClient({ account: acct, chain: robinhoodChain, transport: http(process.env.RPC_URL || RPC_URL) });
  const hash = await wallet.sendTransaction({ to: built.tx.to, data: built.tx.data, value: BigInt(built.tx.value) });
  const receipt = await rpc().waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status !== "success") throw new Error(`Launch transaction reverted: ${hash}`);
  let token: Address | undefined = built.predicted?.token;
  let curve: Address | undefined = built.predicted?.curve;
  for (const log of receipt.logs) {
    try {
      const d = decodeEventLog({ abi: factoryAbi, data: log.data, topics: log.topics });
      if (d.eventName === "TokenLaunched") {
        token = d.args.token;
        curve = d.args.curve;
      }
    } catch {
      /* not ours */
    }
  }
  commit();
  if (token) markViaApp(token);
  return { txHash: hash, token, curve, feeRecipient: built.params.creatorFeeRecipient, symbol: built.params.symbol, name: built.params.name };
}
