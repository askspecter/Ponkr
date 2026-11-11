export const metadata = { title: "Privacy Policy | Ponkr" };

export default function Privacy() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm leading-relaxed text-muted [&_h2]:display [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-fg">
      <h1 className="display text-4xl font-bold text-fg">Privacy Policy</h1>
      <h2>What we collect</h2>
      <p>When you sign in, our login provider shares a user id and the wallet linked to your account. When you chat, we process your messages to answer them and keep short conversation history so the agent has context. We count requests per day to apply usage limits.</p>
      <h2>Onchain data</h2>
      <p>Transactions you make are public on Robinhood Chain. We read public chain data to show tokens, prices and balances.</p>
      <h2>Third parties</h2>
      <p>We use a login and embedded wallet provider, an AI model provider to run the agent, and IPFS pinning for token images. Each processes data under its own policy.</p>
      <h2>Your choices</h2>
      <p>You can sign out at any time, clear your local chat history with New chat, and ask support to delete server side records tied to your account.</p>
    </article>
  );
}
