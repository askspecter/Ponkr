import { BRAND, CLUB } from "@/lib/config";

export const metadata = { title: "Docs — Ponkr" };

const sections = [
  ["overview", "Overview"],
  ["launching", "Launching tokens"],
  ["fees", "Fees & rewards"],
  ["trading", "Trading"],
  ["socials", "X & Telegram"],
  ["api", "API"],
  ["cli", "CLI"],
  ["limits", "Limits & Club"],
  ["faq", "FAQ"],
];

function Code({ children }: { children: string }) {
  return <pre className="mono mt-3 overflow-x-auto rounded-xl border border-line bg-panel-2 p-4 text-xs leading-relaxed">{children}</pre>;
}

export default function Docs() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-[200px_1fr]">
      <aside className="hidden md:block">
        <nav className="sticky top-24 space-y-1 text-sm">
          {sections.map(([id, l]) => <a key={id} href={`#${id}`} className="block rounded px-2 py-1 text-muted hover:bg-panel-2 hover:text-fg">{l}</a>)}
        </nav>
      </aside>
      <article className="max-w-3xl space-y-14 text-sm leading-relaxed text-muted [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-fg [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-fg">
        <section id="overview">
          <h1 className="mb-4 text-4xl font-bold text-fg">{BRAND.name} docs</h1>
          <p>{BRAND.name} is an AI agent that researches, trades and launches tokens on <b className="text-fg">Robinhood Chain</b> (chain id 4663, ETH for gas). Talk to it on the web, Telegram or X, or integrate through the API and CLI. The agent never custodies your funds: every trade and wallet launch is a transaction you confirm.</p>
        </section>

        <section id="launching">
          <h2>Launching tokens</h2>
          <p>Every token has a fixed supply of 1,000,000,000 and trades on a bonding curve priced in ETH. There is no presale and no team allocation. When the curve raises its target (currently 4.2 ETH), the token graduates: liquidity migrates into a Uniswap v4 pool and the LP position is locked forever.</p>
          <h3>Ways to launch</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li><b className="text-fg">Chat:</b> &ldquo;launch a token called Moon Cat, ticker MCAT&rdquo; and attach an image (or ask for a generated logo).</li>
            <li><b className="text-fg">Launch form:</b> <a href="/launch" className="text-accent underline">/launch</a> — full control over socials, fee recipient, creator tax and an initial buy.</li>
            <li><b className="text-fg">X:</b> tag @{BRAND.twitter} with name, ticker and image.</li>
            <li><b className="text-fg">Telegram:</b> DM @{BRAND.telegramBot}.</li>
            <li><b className="text-fg">API / CLI:</b> see below.</li>
          </ul>
          <h3>Launch modes</h3>
          <p><b className="text-fg">My wallet</b> — you pay the 0.0005 ETH launch fee plus gas and can include an initial buy in the same transaction (exempt from the anti-snipe tax). <b className="text-fg">Gas-free</b> — the platform pays and sets your address as fee recipient; no initial buy; limited per day.</p>
          <h3>Anti-snipe</h3>
          <p>Buys in the first seconds after launch pay a steeply decaying tax (starting near 99%), so bots can&apos;t snipe supply at launch.</p>
        </section>

        <section id="fees">
          <h2>Fees & rewards</h2>
          <table className="mt-2 w-full text-left text-xs">
            <tbody className="[&_td]:border-t [&_td]:border-line [&_td]:py-2">
              <tr><td className="text-fg">Trading fee</td><td>1% of every buy and sell (on the curve and after graduation)</td></tr>
              <tr><td className="text-fg">Creator share</td><td>70% of the trading fee</td></tr>
              <tr><td className="text-fg">Creator tax</td><td>Optional 0–10% extra per trade, 100% to the creator, fixed at launch</td></tr>
              <tr><td className="text-fg">Buybacks</td><td>Optional: part of fees buys back the token; bought tokens vest over 5 years</td></tr>
              <tr><td className="text-fg">Launch fee</td><td>0.0005 ETH (waived for gas-free launches)</td></tr>
            </tbody>
          </table>
          <p className="mt-3">Fees accrue on each token&apos;s curve. Sweep them into escrow and claim from <a className="text-accent underline" href="/fees">/fees</a>, by asking the agent, or via the API. To share fees, set the fee recipient to a teammate, treasury or splitter contract at launch.</p>
        </section>

        <section id="trading">
          <h2>Trading</h2>
          <p>Ask in plain language — &ldquo;buy 0.01 ETH of $MCAT&rdquo;, &ldquo;buy $20 of the top token&rdquo;, &ldquo;sell 50% of my $DOG&rdquo;. The agent quotes the curve, applies slippage (default 3%) and shows a confirm card. Graduated tokens trade on Uniswap v4.</p>
        </section>

        <section id="socials">
          <h2>X & Telegram</h2>
          <p>On social channels the agent can research tokens and run gas-free launches. Include a fee recipient address — e.g. &ldquo;@{BRAND.twitter} launch $MCAT Moon Cat, fees to 0x…&rdquo; with an image attached. For trading, use the web app.</p>
        </section>

        <section id="api">
          <h2>API</h2>
          <p>Base URL: your deployment origin. Authenticate with <code>X-API-Key</code> (create keys at <a className="text-accent underline" href="/api-keys">/api-keys</a>).</p>
          <h3>Agent API</h3>
          <p>Submit a prompt and poll the job (about every 2 seconds) until <code>completed</code>, <code>failed</code> or <code>cancelled</code>. Reuse <code>threadId</code> to continue a conversation.</p>
          <Code>{`curl -X POST $HOST/api/v1/agent/prompt \\
  -H "X-API-Key: $PONKR_API_KEY" -H "content-type: application/json" \\
  -d '{"prompt":"what are the top 5 tokens by market cap?"}'
# 202 {"jobId":"…","threadId":"…","status":"pending"}

curl $HOST/api/v1/agent/job/<jobId> -H "X-API-Key: $PONKR_API_KEY"
# {"status":"completed","response":"…","actions":[…]}

curl -X POST $HOST/api/v1/agent/job/<jobId>/cancel -H "X-API-Key: $PONKR_API_KEY"`}</Code>
          <h3>Launch API (gas-free)</h3>
          <Code>{`curl -X POST $HOST/api/v1/token-launches/deploy \\
  -H "X-API-Key: $PONKR_API_KEY" -H "content-type: application/json" \\
  -d '{"name":"Moon Cat","symbol":"MCAT","image":"https://…/cat.png",
       "description":"…","feeRecipient":"0x…","creatorTaxBps":100,
       "socials":{"twitter":"https://x.com/…"}}'
# {"success":true,"tokenAddress":"0x…","curveAddress":"0x…","txHash":"0x…"}`}</Code>
          <h3>Public endpoints</h3>
          <Code>{`GET /api/v1/token-launches?sort=new|mcap|progress|graduated|app&limit=50
GET /api/v1/tokens/<address or $TICKER>        # detail + recent trades
GET /api/v1/quote?token=<addr>&side=buy&amount=0.01
GET /api/v1/token-launches/<wallet>/fees       # claimable fees + unsigned claim tx
GET /api/portfolio/<wallet>`}</Code>
        </section>

        <section id="cli">
          <h2>CLI</h2>
          <Code>{`npm i -g ./cli            # from the repo, or: npx ponkr
export PONKR_API_KEY=pk_…  PONKR_HOST=https://your-host
ponkr launches --sort mcap
ponkr token MCAT
ponkr launch --name "Moon Cat" --symbol MCAT --image ./cat.png --fee-recipient 0x…
ponkr fees 0x…
ponkr prompt "what's trending?"`}</Code>
        </section>

        <section id="limits">
          <h2>Limits & Club</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Free: {CLUB.freeMessagesPerDay} agent messages per day, {CLUB.apiDailyFree} API requests per day.</li>
            <li>Club ({CLUB.priceEth} ETH / {CLUB.periodDays} days): unlimited messages, {CLUB.apiDailyClub} API requests per day.</li>
            <li>Gas-free launches are capped per wallet / account per day.</li>
          </ul>
        </section>

        <section id="faq">
          <h2>FAQ</h2>
          <h3>Does {BRAND.name} hold my keys?</h3><p>No. You connect your own wallet and sign every transaction.</p>
          <h3>Can supply be minted later?</h3><p>No. Supply is fixed at 1B at launch.</p>
          <h3>Can liquidity be pulled after graduation?</h3><p>No. The graduated LP position is locked permanently.</p>
          <h3>Is this financial advice?</h3><p>No. Launchpad tokens are extremely volatile and can go to zero.</p>
        </section>
      </article>
    </div>
  );
}
