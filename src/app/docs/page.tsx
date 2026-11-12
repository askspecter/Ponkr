import Link from "next/link";
import { Callout, Code, type TocItem } from "@/components/Doc";
import { DocLayout } from "@/components/DocLayout";
import { BRAND, CLUB } from "@/lib/config";

export const metadata = { title: "Documentation | Kekr", description: "Everything you need to trade, launch and build with Kekr." };

const hold = `${CLUB.minHold.toLocaleString("en-US")} $${CLUB.symbol}`;

const toc: TocItem[] = [
  { id: "introduction", title: "Introduction", group: "Getting started" },
  { id: "quickstart", title: "Quickstart" },
  { id: "accounts", title: "Accounts and wallets" },
  { id: "club", title: "Club membership" },
  { id: "agent", title: "The agent", group: "Using Kekr" },
  { id: "trading", title: "Trading" },
  { id: "launching", title: "Launching a token" },
  { id: "fees", title: "Fees and rewards" },
  { id: "graduation", title: "Graduation" },
  { id: "socials", title: "Kekr on X" },
  { id: "api", title: "API overview", group: "Developers" },
  { id: "agent-api", title: "Agent API" },
  { id: "launch-api", title: "Launch API" },
  { id: "data-api", title: "Market data API" },
  { id: "llm-gateway", title: "LLM Gateway" },
  { id: "errors", title: "Errors and limits" },
  { id: "cli", title: "CLI" },
  { id: "security", title: "Security", group: "Reference" },
  { id: "faq", title: "FAQ" },
  { id: "glossary", title: "Glossary" },
];

function T({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Endpoint({ method, path, auth }: { method: string; path: string; auth?: boolean }) {
  return (
    <div className="mono my-4 flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-[13px]">
      <span className={`tag ${method === "GET" ? "bg-up/15 text-up" : "bg-accent/20 text-accent"}`}>{method}</span>
      <span className="text-fg">{path}</span>
      {auth && <span className="tag ml-auto border border-line text-muted">API key</span>}
    </div>
  );
}

export default function Docs() {
  return (
    <DocLayout
      eyebrow="Documentation"
      title="Build, trade and launch with Kekr"
      intro={<>Kekr is an onchain agent for Robinhood Chain. This guide covers the product end to end: how accounts work, how the launchpad prices and graduates tokens, how creators earn, and how to integrate through the API and CLI.</>}
      toc={toc}
    >
      <section id="introduction">
        <h2>Introduction</h2>
        <p>
          Kekr turns plain language into onchain actions. Ask it what is trending, how a token is doing, or to buy, sell or launch, and it
          answers with live data and a ready to sign transaction. Every token launched through Kekr trades on a fair bonding curve and
          graduates into a permanently locked Uniswap v4 pool.
        </p>
        <T
          head={["Surface", "What you can do"]}
          rows={[
            [<Link key="c" href="/chat">Chat</Link>, "Research tokens, quote and place trades, launch tokens and check fees in conversation."],
            [<Link key="d" href="/launches">Discover</Link>, "Browse every token on the launchpad by freshness, size or bonding progress."],
            [<Link key="l" href="/launch">Launch</Link>, "Full control launch form for Club members, with socials, fee routing and an initial buy."],
            [<Link key="t" href="/trade">Trade</Link>, "One tap buys across the most active curves."],
            [<Link key="f" href="/fees">Creator fees</Link>, "Track and claim what your tokens have earned."],
            [<Link key="a" href="/api-keys">API and CLI</Link>, "Automate prompts, launches and market data from your own code."],
          ]}
        />
        <Callout title="Non custodial by design">
          Kekr never holds your funds or your keys. Trades and wallet launches are prepared by Kekr and signed by you. Nothing moves until you confirm it in your wallet.
        </Callout>
      </section>

      <section id="quickstart">
        <h2>Quickstart</h2>
        <ol>
          <li><strong>Sign in.</strong> Use email, SMS, X, Farcaster, Telegram or an existing wallet. A secure embedded wallet is created for you if you do not have one.</li>
          <li><strong>Fund your wallet.</strong> Send a little ETH on Robinhood Chain to the address shown in the account menu. Gas on Robinhood Chain costs a fraction of a cent.</li>
          <li><strong>Ask the agent.</strong> Try &ldquo;what is closest to graduating?&rdquo; or &ldquo;buy 0.005 ETH of $MCAT&rdquo;.</li>
          <li><strong>Confirm.</strong> Review the transaction card and approve it in your wallet.</li>
          <li><strong>Launch.</strong> Hold {hold} to join Club, then launch from chat or the <Link href="/launch">launch form</Link>.</li>
        </ol>
      </section>

      <section id="accounts">
        <h2>Accounts and wallets</h2>
        <p>
          Sign in is handled by a dedicated authentication provider. You can use email, SMS, X, Farcaster or Telegram, or connect a wallet you
          already own. Social and email accounts receive an embedded wallet on Robinhood Chain the first time they sign in.
        </p>
        <h3>Your wallet address</h3>
        <p>Open the account menu at the bottom of the sidebar to copy your address. Use it to deposit ETH or tokens, and as the fee recipient for your launches.</p>
        <h3>Network</h3>
        <T
          head={["Setting", "Value"]}
          rows={[
            ["Network", "Robinhood Chain"],
            ["Chain ID", <code key="c">4663</code>],
            ["Gas token", "ETH"],
            ["Block time", "About 100 ms"],
          ]}
        />
      </section>

      <section id="club">
        <h2>Club membership</h2>
        <p>
          Club is the membership tier for builders on Kekr. There is nothing to buy or renew: membership is read live from your wallet. Hold at
          least <strong>{hold}</strong> in the wallet you sign in with and you are in.
        </p>
        <T
          head={["Benefit", "Everyone", "Club"]}
          rows={[
            ["Launch tokens", "No", "Yes, on every channel"],
            ["Agent messages", `${CLUB.freeMessagesPerDay} per day`, "Unlimited"],
            ["API requests", `${CLUB.apiDailyFree} per day`, `${CLUB.apiDailyClub.toLocaleString("en-US")} per day`],
            ["Research, trading, wallet and fee tools", "Yes", "Yes"],
          ]}
        />
        <p>Balances are rechecked about every 30 seconds. If your balance drops below the threshold, launching locks again until you top back up. See <Link href="/club">Club</Link> for your live status.</p>
      </section>

      <section id="agent">
        <h2>The agent</h2>
        <p>The agent reads live chain data and prepares transactions through a set of tools. It does not guess prices or addresses: if a tool cannot answer, it tells you.</p>
        <T
          head={["Capability", "Example prompt"]}
          rows={[
            ["Discover tokens", "“What launched in the last hour?” · “Show the biggest tokens.”"],
            ["Token research", "“How is $MCAT doing?” · “Who created this token?”"],
            ["Quotes", "“How many $MCAT do I get for 0.01 ETH?”"],
            ["Trading", "“Buy $20 of $MCAT.” · “Sell 50% of my $DOG.”"],
            ["Launching", "“Launch Moon Cat, ticker MCAT, generate a logo, 2% creator tax.”"],
            ["Portfolio", "“What is in my wallet?”"],
            ["Creator fees", "“How much can I claim?” · “Claim my fees.”"],
          ]}
        />
        <h3>Attachments</h3>
        <p>Attach an image with the paperclip button and the agent will use it as the logo for your next launch. PNG, JPEG, GIF and WebP up to 5 MB are supported.</p>
        <h3>Confirmations</h3>
        <p>Whenever the agent prepares a transaction, a card appears with a summary and a Confirm button. Read the summary, then approve in your wallet. Multi step actions, such as an approval followed by a sell, are signed in order.</p>
      </section>

      <section id="trading">
        <h2>Trading</h2>
        <p>
          Before graduation, every token trades against its own bonding curve. The curve is a constant product market with virtual ETH
          liquidity, so the price rises smoothly as tokens are bought and falls as they are sold. There is always liquidity on the curve.
        </p>
        <h3>How a quote is calculated</h3>
        <ul>
          <li><strong>Buys:</strong> fees are taken from the ETH you send, then the remainder is priced on the curve.</li>
          <li><strong>Sells:</strong> tokens are priced on the curve first, then fees are taken from the ETH you receive.</li>
          <li><strong>Slippage:</strong> defaults to 3%. If the price moves further than that before your transaction lands, it reverts and you keep your funds.</li>
        </ul>
        <h3>Anti snipe protection</h3>
        <p>Buys in the first seconds after a launch pay a steep, rapidly decaying tax that starts near 99%. This removes the advantage of bots buying in the same block as the launch. Creators can buy in the launch transaction itself, which is exempt.</p>
        <h3>After graduation</h3>
        <p>Graduated tokens trade in their Uniswap v4 pool. Their prices and market caps on Kekr are read directly from that pool.</p>
      </section>

      <section id="launching">
        <h2>Launching a token</h2>
        <Callout title="Club only">Launching is available to Club members. Hold {hold} in your wallet to unlock it.</Callout>
        <h3>Token economics</h3>
        <T
          head={["Parameter", "Value"]}
          rows={[
            ["Total supply", "1,000,000,000, fixed and not mintable"],
            ["Sold on the curve", "About 71% of supply"],
            ["Graduation target", "4.2 ETH raised on the curve"],
            ["Launch fee", "0.0005 ETH, waived for gasless launches"],
            ["Presale or team allocation", "None"],
          ]}
        />
        <h3>Launch options</h3>
        <T
          head={["Field", "Notes"]}
          rows={[
            ["Name and ticker", "Up to 32 characters for the name, 1 to 10 letters or digits for the ticker."],
            ["Logo", "Stored permanently in public file storage. PNG, JPEG, GIF or WebP up to 5 MB."],
            ["Description and socials", "Shown on the token page: X, Telegram, website, Discord and Farcaster."],
            ["Fee recipient", "The wallet that receives the creator share. Defaults to you. Point it at a teammate, a treasury or a splitter contract to share fees."],
            ["Creator tax", "An extra 0 to 10% on every trade, paid entirely to the fee recipient. Fixed at launch."],
            ["Buybacks", "Optionally route part of the fees into automatic buybacks of your token. Bought tokens vest over five years."],
            ["Initial buy", "Buy in the launch transaction itself, exempt from the anti snipe tax. Wallet launches only."],
          ]}
        />
        <h3>Launch modes</h3>
        <ul>
          <li><strong>Your wallet:</strong> you pay the launch fee and gas, and can include an initial buy.</li>
          <li><strong>Gasless:</strong> Kekr pays the launch and you sign a free message. The fee recipient is still you. Limited per day.</li>
        </ul>
      </section>

      <section id="fees">
        <h2>Fees and rewards</h2>
        <T
          head={["Fee", "Rate", "Goes to"]}
          rows={[
            ["Trading fee", "1% of every buy and sell", "70% to the creator, 30% to the protocol"],
            ["Creator tax", "0 to 10%, chosen at launch", "100% to the creator"],
            ["Anti snipe tax", "Starts near 99%, gone within seconds", "Protocol"],
            ["Launch fee", "0.0005 ETH", "Protocol"],
          ]}
        />
        <p>Fees apply both on the curve and after graduation, so creators keep earning for the life of the token.</p>
        <h3>Claiming</h3>
        <ol>
          <li>Open <Link href="/fees">Creator fees</Link> with the fee recipient wallet.</li>
          <li>Use <strong>Sweep and claim</strong> on a token to move its accrued fees into escrow and claim them in one flow.</li>
          <li>Use <strong>Claim ETH</strong> to withdraw everything already in escrow.</li>
        </ol>
        <p>You can also ask the agent to &ldquo;claim my fees&rdquo;.</p>
      </section>

      <section id="graduation">
        <h2>Graduation</h2>
        <p>
          When a curve raises its target, the token graduates. Trading on the curve stops, and the raised ETH plus a reserved slice of supply
          seed a full range Uniswap v4 position. That position is held by a locker contract permanently, so the liquidity can never be pulled.
        </p>
        <ul>
          <li>Graduation is automatic and can be completed by anyone.</li>
          <li>The pool charges the same 1% fee through a hook, so creator earnings continue.</li>
          <li>Token pages switch to pool pricing as soon as the pool exists.</li>
        </ul>
      </section>

      <section id="socials">
        <h2>Kekr on X</h2>
        <p>Mention <strong>@{BRAND.twitter}</strong> on X to research tokens or launch one straight from a post.</p>
        <ul>
          <li>Research and market questions work the same as in the web app.</li>
          <li>Launches are gasless. Include a fee recipient address, and attach an image for the logo.</li>
          <li>Because X accounts have no linked wallet, the fee recipient must be a Club wallet.</li>
          <li>Trading requires a wallet signature, so it is available in the web app only.</li>
        </ul>
        <Code lang="example">{`@${BRAND.twitter} launch Moon Cat $MCAT, fees to 0x1234...abcd`}</Code>
      </section>

      <section id="api">
        <h2>API overview</h2>
        <p>The API exposes the agent, gasless launches and read only market data over HTTPS with JSON bodies.</p>
        <T
          head={["Item", "Value"]}
          rows={[
            ["Base URL", <code key="b">{"<your Kekr domain>/api/v1"}</code>],
            ["Authentication", <><code>X-API-Key</code> header, or <code>Authorization: Bearer</code></>],
            ["Keys", <><Link key="k" href="/api-keys">API keys</Link>, created by signing a free message with your wallet</>],
            ["Format", "JSON request and response bodies, amounts as strings in wei unless noted"],
          ]}
        />
        <Code>{`export KEKR_API_KEY=pk_your_key
curl {{HOST}}/api/v1/token-launches?limit=5`}</Code>
        <Callout kind="warn" title="Keep keys secret">API keys act on behalf of your wallet. Never embed them in client side code or share them publicly. Revoke a key at any time from the API keys page.</Callout>
      </section>

      <section id="agent-api">
        <h2>Agent API</h2>
        <p>Prompts run asynchronously. Submit a prompt to receive a job id, then poll the job every couple of seconds until it reaches a final state.</p>
        <Endpoint method="POST" path="/api/v1/agent/prompt" auth />
        <T
          head={["Field", "Type", "Description"]}
          rows={[
            [<code key="p">prompt</code>, "string", "Required. Up to 4,000 characters."],
            [<code key="t">threadId</code>, "string", "Optional. Continue an earlier conversation."],
            [<code key="i">imageUrl</code>, "string", "Optional. Image to use as a logo for launches."],
          ]}
        />
        <Code>{`curl -X POST {{HOST}}/api/v1/agent/prompt \\
  -H "X-API-Key: $KEKR_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{"prompt":"what are the top 5 tokens by market cap?"}'

# 202 Accepted
{"success":true,"jobId":"5e0c...","threadId":"9a1f...","status":"pending"}`}</Code>
        <Endpoint method="GET" path="/api/v1/agent/job/{jobId}" auth />
        <Code lang="json">{`{
  "jobId": "5e0c...",
  "threadId": "9a1f...",
  "status": "completed",
  "prompt": "what are the top 5 tokens by market cap?",
  "response": "Here are the five largest tokens right now...",
  "actions": [],
  "createdAt": 1794390600000,
  "completedAt": 1794390604210
}`}</Code>
        <T
          head={["Status", "Meaning"]}
          rows={[
            [<code key="1">pending</code>, "Queued."],
            [<code key="2">processing</code>, "The agent is working."],
            [<code key="3">completed</code>, "Finished. Read response and actions."],
            [<code key="4">failed</code>, "Finished with an error. Read error."],
            [<code key="5">cancelled</code>, "Cancelled by you."],
          ]}
        />
        <Endpoint method="POST" path="/api/v1/agent/job/{jobId}/cancel" auth />
      </section>

      <section id="launch-api">
        <h2>Launch API</h2>
        <p>Launch a token gaslessly. The key owner must be a Club member. The fee recipient defaults to the key owner&apos;s wallet.</p>
        <Endpoint method="POST" path="/api/v1/token-launches/deploy" auth />
        <T
          head={["Field", "Type", "Description"]}
          rows={[
            [<code key="n">name</code>, "string", "Required. Up to 32 characters."],
            [<code key="s">symbol</code>, "string", "Required. 1 to 10 letters or digits."],
            [<code key="i">image</code>, "string", "Required. An https image URL or an ipfs:// URI."],
            [<code key="d">description</code>, "string", "Optional. Up to 500 characters."],
            [<code key="f">feeRecipient</code>, "address", "Optional. Defaults to the key owner."],
            [<code key="c">creatorTaxBps</code>, "number", "Optional. 0 to 1000 (0 to 10%). Defaults to 100."],
            [<code key="o">socials</code>, "object", "Optional. twitter, telegram, website, discord, farcaster."],
          ]}
        />
        <Code>{`curl -X POST {{HOST}}/api/v1/token-launches/deploy \\
  -H "X-API-Key: $KEKR_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "name": "Moon Cat",
    "symbol": "MCAT",
    "image": "https://example.com/cat.png",
    "creatorTaxBps": 100
  }'

{"success":true,"tokenAddress":"0x...","curveAddress":"0x...","txHash":"0x...","feeRecipient":"0x..."}`}</Code>
      </section>

      <section id="data-api">
        <h2>Market data API</h2>
        <p>These endpoints are public and do not require a key.</p>
        <Endpoint method="GET" path="/api/v1/token-launches" />
        <T
          head={["Query", "Description"]}
          rows={[
            [<code key="s">sort</code>, "latest (default), mcap, progress, graduated or app"],
            [<code key="l">limit</code>, "1 to 100, default 50"],
            [<code key="o">offset</code>, "Pagination offset"],
            [<code key="q">q</code>, "Filter by name, ticker or address"],
          ]}
        />
        <Endpoint method="GET" path="/api/v1/tokens/{address or ticker}" />
        <p>Returns the token with live price, market cap, bonding progress, fees, socials and its most recent trades.</p>
        <Endpoint method="GET" path="/api/v1/quote?token=&side=buy&amount=0.01" />
        <p>Quotes a buy (amount in ETH) or a sell (amount in tokens) without executing it.</p>
        <Endpoint method="GET" path="/api/v1/token-launches/{wallet}/fees" />
        <p>Returns claimable creator fees for a wallet together with an unsigned claim transaction.</p>
      </section>

      <section id="llm-gateway">
        <h2>LLM Gateway</h2>
        <p>
          The LLM Gateway is a model marketplace: one API key for hundreds of models from more than fifty providers, including Anthropic,
          OpenAI, Google, xAI, Meta, Mistral, Moonshot, Qwen and DeepSeek. It speaks both the OpenAI and the Anthropic API formats, so existing
          SDKs work by changing the base URL and key. Browse the full catalog with live prices on the <Link href="/llm">LLM Gateway</Link> page.
        </p>
        <T
          head={["Endpoint", "Format"]}
          rows={[
            [<code key="1">POST /api/llm/v1/chat/completions</code>, "OpenAI chat completions, streaming supported"],
            [<code key="2">POST /api/llm/v1/messages</code>, "Anthropic messages, streaming supported"],
            [<code key="3">GET /api/llm/v1/models</code>, "Public model list with prices in USD per 1M tokens"],
          ]}
        />
        <h3>Billing</h3>
        <p>Usage is billed per token from a prepaid USD balance. Add credits with ETH on Robinhood Chain from the <Link href="/llm?tab=credits">Credits</Link> tab. Cached input tokens are billed at the cache rate where a model publishes one.</p>
        <Code>{`curl {{HOST}}/api/llm/v1/chat/completions \\
  -H "Authorization: Bearer $KEKR_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{"model":"claude-sonnet-5.5","messages":[{"role":"user","content":"Hello!"}]}'`}</Code>
        <p>See the <Link href="/llm?tab=quickstart">Quickstart</Link> for SDK examples. The gateway allows 60 requests per minute per key.</p>
      </section>

      <section id="errors">
        <h2>Errors and limits</h2>
        <p>Errors return a JSON body of the form <code>{`{"error": "message"}`}</code> with a standard HTTP status.</p>
        <T
          head={["Status", "Meaning"]}
          rows={[
            ["400", "The request is invalid. Check the fields."],
            ["401", "Missing or invalid API key, or the wallet session could not be verified."],
            ["403", "Not allowed, for example launching without Club membership."],
            ["404", "Token or job not found."],
            ["429", "Daily limit reached. Limits reset at 00:00 UTC."],
            ["500 and 503", "A temporary problem. Retry with backoff."],
          ]}
        />
        <T
          head={["Limit", "Everyone", "Club"]}
          rows={[
            ["API requests per day", CLUB.apiDailyFree.toLocaleString("en-US"), CLUB.apiDailyClub.toLocaleString("en-US")],
            ["Agent messages per day", String(CLUB.freeMessagesPerDay), "Unlimited"],
            ["Gasless launches per day", "Not available", "3 per account"],
            ["Active API keys per wallet", "10", "10"],
          ]}
        />
      </section>

      <section id="cli">
        <h2>CLI</h2>
        <p>The command line tool wraps the API for scripts and terminals. It ships with the Kekr source code.</p>
        <Code>{`# from the repository root
npm install -g ./cli

export KEKR_HOST={{HOST}}
export KEKR_API_KEY=pk_your_key`}</Code>
        <T
          head={["Command", "Description"]}
          rows={[
            [<code key="1">kekr launches --sort mcap</code>, "List tokens by latest, mcap, progress or graduated."],
            [<code key="2">kekr token MCAT</code>, "Show a token by ticker or address."],
            [<code key="3">kekr launch --name &quot;Moon Cat&quot; --symbol MCAT --image ./cat.png</code>, "Launch gaslessly. Uploads local images automatically."],
            [<code key="4">kekr fees 0x...</code>, "Show claimable fees for a wallet."],
            [<code key="5">kekr prompt &quot;what is trending?&quot;</code>, "Ask the agent and wait for the answer."],
          ]}
        />
      </section>

      <section id="security">
        <h2>Security</h2>
        <ul>
          <li><strong>Non custodial.</strong> Kekr cannot move your funds. Every transaction is signed in your wallet.</li>
          <li><strong>Simulated first.</strong> Launch transactions are simulated against the chain before you are asked to sign.</li>
          <li><strong>Locked liquidity.</strong> Graduated liquidity is held by a locker contract permanently.</li>
          <li><strong>Fixed supply.</strong> Token supply cannot be increased after launch.</li>
          <li><strong>Verify what you sign.</strong> Always check the amounts and the destination shown by your wallet.</li>
        </ul>
        <Callout kind="warn" title="Smart contract risk">The launchpad contracts are third party smart contracts. Like all smart contracts they may contain undiscovered bugs. Only commit funds you can afford to lose.</Callout>
      </section>

      <section id="faq">
        <h2>FAQ</h2>
        <h3>Does Kekr hold my keys?</h3>
        <p>No. Embedded wallets are secured by the authentication provider and only you can authorize transactions.</p>
        <h3>Why can&apos;t I launch?</h3>
        <p>Launching requires Club membership. Hold {hold} in the wallet you sign in with, then refresh the <Link href="/club">Club</Link> page.</p>
        <h3>Can supply be minted later?</h3>
        <p>No. Supply is fixed at one billion at launch.</p>
        <h3>Can liquidity be removed after graduation?</h3>
        <p>No. The graduated position is locked permanently.</p>
        <h3>Why did my trade fail?</h3>
        <p>Usually the price moved beyond your slippage while the transaction was pending. Try again or raise slippage slightly.</p>
        <h3>Where do my creator fees go?</h3>
        <p>To the fee recipient chosen at launch. Claim them from the <Link href="/fees">Creator fees</Link> page.</p>
      </section>

      <section id="glossary">
        <h2>Glossary</h2>
        <T
          head={["Term", "Definition"]}
          rows={[
            ["Bonding curve", "A pricing contract that sells tokens at a price set by a formula, so there is always liquidity."],
            ["Bonded", "The share of the graduation target already raised on the curve."],
            ["Graduation", "The moment a curve fills and liquidity moves to a locked Uniswap v4 pool."],
            ["Fee recipient", "The wallet that receives the creator share of fees for a token."],
            ["Creator tax", "An optional extra fee on every trade that goes entirely to the fee recipient."],
            ["Slippage", "The maximum price movement you accept between quote and execution."],
            ["Club", `Wallets holding at least ${hold}. Required to launch.`],
          ]}
        />
      </section>
    </DocLayout>
  );
}
