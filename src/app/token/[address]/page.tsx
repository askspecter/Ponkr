import type { Metadata } from "next";
import { tokenSummary } from "@/lib/server/tokens";
import { TokenPage } from "./TokenPage";

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }): Promise<Metadata> {
  const { address } = await params;
  // Never block the page for long on a cold index.
  const t = await Promise.race([tokenSummary(address).catch(() => undefined), new Promise<undefined>((r) => setTimeout(() => r(undefined), 2500))]);
  if (!t) return { title: "Token" };
  const title = `${t.name} ($${t.symbol})`;
  const description = t.description || `Trade $${t.symbol} on Kekr, the AI trading agent and token launchpad on Robinhood Chain.`;
  return { title, description, openGraph: { title, description }, twitter: { title, description } };
}

export default async function Page({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <TokenPage address={address} />;
}
