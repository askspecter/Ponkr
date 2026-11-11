import { PageHeader, PageShell } from "@/components/Page";
import { LaunchForm } from "./LaunchForm";

export const metadata = { title: "Launch a token | Ponkr" };

export default function Page() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Launch"
        title="Launch a token"
        description={<>One billion fixed supply, a fair bonding curve, and automatic graduation to a locked Uniswap v4 pool. Prefer to talk it through? Ask the <a href="/chat" className="text-fg underline decoration-accent underline-offset-4">agent</a>.</>}
      />
      <LaunchForm />
    </PageShell>
  );
}
