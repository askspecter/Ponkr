export const metadata = { title: "Terms of Service | Ponkr" };

export default function Terms() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm leading-relaxed text-muted [&_h2]:display [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-fg">
      <h1 className="display text-4xl font-bold text-fg">Terms of Service</h1>
      <p>By using Ponkr you agree to these terms. If you do not agree, do not use the service.</p>
      <h2>The service</h2>
      <p>Ponkr is software that helps you research, trade and launch tokens on Robinhood Chain. Ponkr does not hold your funds. Every transaction is signed by your own wallet, and you are responsible for what you sign.</p>
      <h2>Risk</h2>
      <p>Tokens launched on the launchpad are experimental and extremely volatile. You can lose everything you put in. Nothing on Ponkr, including anything the agent says, is financial, legal or tax advice.</p>
      <h2>Your conduct</h2>
      <p>Do not use Ponkr to launch tokens that impersonate real people or brands, infringe rights, or break the law where you live. We may limit access for abuse or spam.</p>
      <h2>AI output</h2>
      <p>The agent can be wrong. Always check the transaction details your wallet shows before confirming.</p>
      <h2>No warranty</h2>
      <p>Ponkr is provided as is, without warranties of any kind. To the extent allowed by law, we are not liable for losses arising from your use of the service or of third party smart contracts.</p>
    </article>
  );
}
