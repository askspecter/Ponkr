import Link from "next/link";
import { Callout, type TocItem } from "@/components/Doc";
import { DocLayout } from "@/components/DocLayout";

export const metadata = { title: "Privacy Policy | Ponkr", description: "How Ponkr collects, uses and protects your information." };

const EFFECTIVE = "November 11, 2026";

const toc: TocItem[] = [
  { id: "overview", title: "1. Overview" },
  { id: "collect", title: "2. Information we collect" },
  { id: "onchain", title: "3. Public blockchain data" },
  { id: "use", title: "4. How we use information" },
  { id: "ai", title: "5. AI processing" },
  { id: "sharing", title: "6. Sharing and processors" },
  { id: "retention", title: "7. Retention" },
  { id: "storage", title: "8. Cookies and local storage" },
  { id: "security", title: "9. Security" },
  { id: "rights", title: "10. Your choices and rights" },
  { id: "transfers", title: "11. International transfers" },
  { id: "children", title: "12. Children" },
  { id: "changes", title: "13. Changes to this policy" },
  { id: "contact", title: "14. Contact" },
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

export default function Privacy() {
  return (
    <DocLayout
      eyebrow="Legal"
      title="Privacy Policy"
      intro={<>This policy explains what information Ponkr collects when you use the website, the agent, the API, the CLI and our bots, why we collect it, and the choices you have. It should be read together with our <Link href="/terms" className="text-fg underline decoration-accent underline-offset-4">Terms of Service</Link>.</>}
      meta={`Effective ${EFFECTIVE}`}
      toc={toc}
    >
      <Callout title="In short">
        We collect only what we need to run Ponkr: a sign in identifier, your wallet address, the messages you send to the agent and basic usage counters. We never have access to your private keys, and we do not sell your personal information.
      </Callout>

      <section id="overview">
        <h2>1. Overview</h2>
        <p>Ponkr is a non custodial interface for Robinhood Chain. Most of what you do with Ponkr happens on a public blockchain, which we do not control. This policy covers information that Ponkr itself processes when you use the Service.</p>
      </section>

      <section id="collect">
        <h2>2. Information we collect</h2>
        <T
          head={["Category", "Examples", "Source"]}
          rows={[
            ["Account identifiers", "Sign in user id, and the email, phone number or social handle you chose to sign in with", "You, via our authentication provider"],
            ["Wallet information", "Wallet addresses linked to your account, balances read from the chain", "You and the blockchain"],
            ["Agent conversations", "Messages you send, the agent's replies, images you attach", "You"],
            ["Launch content", "Token names, tickers, logos, descriptions and links", "You"],
            ["API usage", "API key name, a one way hash of the key, request counts", "You and the Service"],
            ["Technical data", "IP address, browser type, request timestamps", "Your device"],
            ["Bot interactions", "Telegram or X user id, username and the messages you send to our bots", "Telegram and X"],
          ]}
        />
        <p>We do not ask for, and you should never send us, your private keys or recovery phrases.</p>
      </section>

      <section id="onchain">
        <h2>3. Public blockchain data</h2>
        <p>Transactions on Robinhood Chain, including trades, launches, balances and wallet addresses, are public and permanent by design. Ponkr reads this public data to show prices, portfolios, leaderboards and metrics. We cannot modify or delete information recorded on a blockchain. Token logos and metadata stored on IPFS are also public and cannot be removed by us.</p>
      </section>

      <section id="use">
        <h2>4. How we use information</h2>
        <ul>
          <li><strong>Provide the Service:</strong> sign you in, show your wallet, answer agent requests and prepare transactions.</li>
          <li><strong>Determine eligibility:</strong> check Club membership from your wallet balance and apply usage limits.</li>
          <li><strong>Keep context:</strong> store recent conversation history so the agent can follow up on earlier messages.</li>
          <li><strong>Protect the Service:</strong> prevent spam, abuse and fraud, and enforce our Terms.</li>
          <li><strong>Improve the Service:</strong> diagnose errors and understand aggregate usage.</li>
          <li><strong>Comply with law:</strong> respond to lawful requests and meet legal obligations.</li>
        </ul>
        <p>We do not use your information for targeted advertising and we do not sell it.</p>
      </section>

      <section id="ai">
        <h2>5. AI processing</h2>
        <p>Agent requests, including your messages and the relevant chain data, are sent to third party AI model providers to generate responses. These providers process the data to return an answer on our behalf. Avoid including sensitive personal information in your messages.</p>
      </section>

      <section id="sharing">
        <h2>6. Sharing and processors</h2>
        <p>We share information only as needed to operate the Service, with providers that process it on our behalf:</p>
        <T
          head={["Provider type", "Purpose"]}
          rows={[
            ["Authentication and embedded wallets", "Sign in and wallet creation"],
            ["AI model providers", "Generating agent responses"],
            ["Cloud hosting and database", "Running the website, API and storage"],
            ["Blockchain RPC providers", "Reading chain data and broadcasting transactions"],
            ["IPFS pinning", "Storing token images you upload"],
            ["Messaging platforms", "Delivering bot replies on Telegram and X"],
          ]}
        />
        <p>We may also disclose information if required by law, to protect the rights and safety of users or the Service, or as part of a merger, acquisition or sale of assets, in which case this policy will continue to apply.</p>
      </section>

      <section id="retention">
        <h2>7. Retention</h2>
        <T
          head={["Data", "Kept for"]}
          rows={[
            ["Agent API jobs", "7 days"],
            ["Agent API conversation threads", "30 days after last use"],
            ["Telegram and X conversation history", "14 days after last message"],
            ["Daily usage counters", "2 days"],
            ["API key records", "Until you revoke them, then as needed for security"],
            ["Web chat history", "Stored in your browser only, until you clear it"],
            ["Onchain and IPFS data", "Permanent, outside our control"],
          ]}
        />
      </section>

      <section id="storage">
        <h2>8. Cookies and local storage</h2>
        <p>We use browser storage to keep your web chat history on your device and to remember interface preferences. Our authentication provider uses cookies and local storage to keep you signed in securely. We do not use advertising cookies. Clearing your browser storage removes local chat history and signs you out.</p>
      </section>

      <section id="security">
        <h2>9. Security</h2>
        <p>We protect information with encryption in transit, access controls and minimal data collection. API keys are stored only as one way hashes. Embedded wallets are secured by our authentication provider so that Ponkr cannot access private keys. No system is perfectly secure, so please protect your sign in methods and devices.</p>
      </section>

      <section id="rights">
        <h2>10. Your choices and rights</h2>
        <ul>
          <li><strong>Access and deletion:</strong> ask us for a copy of, or deletion of, the information we hold about your account.</li>
          <li><strong>Correction:</strong> ask us to correct inaccurate information.</li>
          <li><strong>API keys:</strong> revoke keys at any time from the <Link href="/api-keys">API keys</Link> page.</li>
          <li><strong>Chat history:</strong> start a fresh chat or clear browser storage to remove local history.</li>
          <li><strong>Sign out:</strong> sign out at any time from the account menu.</li>
        </ul>
        <p>Depending on where you live, you may have additional rights under local law, such as objecting to processing or lodging a complaint with a data protection authority. We will respond to requests within the time required by law.</p>
      </section>

      <section id="transfers">
        <h2>11. International transfers</h2>
        <p>Our providers may process information in countries other than yours. Where required, we rely on appropriate safeguards for these transfers.</p>
      </section>

      <section id="children">
        <h2>12. Children</h2>
        <p>The Service is not intended for anyone under 18, and we do not knowingly collect information from children. If you believe a child has used the Service, contact us and we will delete the related information.</p>
      </section>

      <section id="changes">
        <h2>13. Changes to this policy</h2>
        <p>We may update this policy from time to time. We will change the effective date above and, for material changes, provide notice in the Service.</p>
      </section>

      <section id="contact">
        <h2>14. Contact</h2>
        <p>For privacy questions or requests, reach us through the support channel linked in the sidebar under Resources.</p>
      </section>
    </DocLayout>
  );
}
