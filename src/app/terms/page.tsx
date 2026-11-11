import Link from "next/link";
import { Callout, type TocItem } from "@/components/Doc";
import { DocLayout } from "@/components/DocLayout";

export const metadata = { title: "Terms of Service | Ponkr", description: "The terms that govern your use of Ponkr." };

const EFFECTIVE = "November 11, 2026";

const toc: TocItem[] = [
  { id: "acceptance", title: "1. Acceptance" },
  { id: "eligibility", title: "2. Eligibility" },
  { id: "service", title: "3. The service" },
  { id: "accounts", title: "4. Accounts and wallets" },
  { id: "non-custodial", title: "5. Non custodial service" },
  { id: "agent", title: "6. The AI agent" },
  { id: "launches", title: "7. Token launches" },
  { id: "club", title: "8. Club membership" },
  { id: "fees", title: "9. Fees" },
  { id: "api", title: "10. API and developer tools" },
  { id: "conduct", title: "11. Acceptable use" },
  { id: "content", title: "12. Content and intellectual property" },
  { id: "third-party", title: "13. Third party services" },
  { id: "risk", title: "14. Risk disclosure" },
  { id: "disclaimers", title: "15. Disclaimers" },
  { id: "liability", title: "16. Limitation of liability" },
  { id: "indemnity", title: "17. Indemnification" },
  { id: "termination", title: "18. Suspension and termination" },
  { id: "changes", title: "19. Changes to these terms" },
  { id: "law", title: "20. Governing law and disputes" },
  { id: "general", title: "21. General" },
  { id: "contact", title: "22. Contact" },
];

export default function Terms() {
  return (
    <DocLayout
      eyebrow="Legal"
      title="Terms of Service"
      intro={<>These terms form a binding agreement between you and Ponkr for your use of the website, the agent, the launchpad interface, the API, the CLI and our bots on Telegram and X. Please read them carefully, together with our <Link href="/privacy" className="text-fg underline decoration-accent underline-offset-4">Privacy Policy</Link>.</>}
      meta={`Effective ${EFFECTIVE}`}
      toc={toc}
    >
      <Callout kind="warn" title="Summary of the essentials">
        Ponkr is non custodial software. You control your wallet and you sign every transaction. Digital assets, and tokens launched on bonding curves in particular, are highly volatile and can lose all of their value. Nothing on Ponkr is financial, legal or tax advice.
      </Callout>

      <section id="acceptance">
        <h2>1. Acceptance</h2>
        <p>By accessing or using Ponkr (the &ldquo;Service&rdquo;) you confirm that you have read, understood and agree to be bound by these Terms of Service (the &ldquo;Terms&rdquo;). If you use the Service on behalf of an organization, you agree to these Terms on its behalf and confirm you have authority to do so. If you do not agree, do not use the Service.</p>
      </section>

      <section id="eligibility">
        <h2>2. Eligibility</h2>
        <p>To use the Service you must:</p>
        <ul>
          <li>be at least 18 years old, or the age of majority where you live if that is higher;</li>
          <li>have the legal capacity to enter into these Terms;</li>
          <li>not be located in, or a resident or national of, any country or region subject to comprehensive sanctions, and not be listed on any sanctions list;</li>
          <li>not be prohibited from using the Service under the laws that apply to you.</li>
        </ul>
        <p>You are responsible for making sure your use of the Service is lawful where you are. We may restrict access from certain locations at our discretion.</p>
      </section>

      <section id="service">
        <h2>3. The service</h2>
        <p>Ponkr provides an interface and an AI agent that help you research, trade and launch tokens on Robinhood Chain. The Service includes:</p>
        <ul>
          <li>a chat interface where an AI agent reads public chain data and prepares transactions for you to review and sign;</li>
          <li>an interface to independent launchpad smart contracts that issue tokens with a fixed supply on a bonding curve and later move liquidity to a Uniswap v4 pool;</li>
          <li>dashboards for discovery, portfolio tracking, metrics and creator fees;</li>
          <li>an API, a command line tool and bots on Telegram and X.</li>
        </ul>
        <p>We may add, change or remove features at any time. Some features may be offered as previews and may be less reliable than the rest of the Service.</p>
      </section>

      <section id="accounts">
        <h2>4. Accounts and wallets</h2>
        <p>You can sign in with email, SMS, X, Farcaster, Telegram or an existing wallet through our authentication provider. Accounts without a wallet receive an embedded wallet. You are responsible for:</p>
        <ul>
          <li>keeping your sign in methods, devices and any recovery information secure;</li>
          <li>all activity that occurs through your account, API keys and wallet;</li>
          <li>keeping your contact details accurate.</li>
        </ul>
        <p>Tell us promptly if you believe your account or API keys have been compromised. You can revoke API keys at any time from the API keys page.</p>
      </section>

      <section id="non-custodial">
        <h2>5. Non custodial service</h2>
        <p>Ponkr does not take custody of your digital assets and cannot initiate transactions from your wallet without your authorization. Except for gasless launches, which are sent from a Ponkr operated wallet with your chosen fee recipient, every transaction is prepared by the Service and signed by you.</p>
        <p>Blockchain transactions are irreversible. Once a transaction is confirmed we cannot cancel, reverse or refund it. You are solely responsible for reviewing the details your wallet displays before you sign, including amounts, recipients and network fees.</p>
      </section>

      <section id="agent">
        <h2>6. The AI agent</h2>
        <p>The agent uses third party AI models together with live chain data. While we design it to rely on real data and to ask for confirmation before any transaction, AI output can be inaccurate, incomplete or out of date. You agree that:</p>
        <ul>
          <li>agent responses are informational and are not advice of any kind;</li>
          <li>you will verify any transaction the agent prepares before signing it;</li>
          <li>you will not use the agent to generate unlawful, harmful or misleading content;</li>
          <li>usage limits apply and may change, with higher limits for Club members.</li>
        </ul>
      </section>

      <section id="launches">
        <h2>7. Token launches</h2>
        <p>Launching a token through Ponkr deploys it through independent launchpad smart contracts. By launching a token you confirm that:</p>
        <ul>
          <li>you have the right to use the name, ticker, logo, description and links you provide;</li>
          <li>the token does not impersonate any person, brand or project, and is not designed to mislead buyers;</li>
          <li>the token is not offered as an investment, a security, a share of profits or a promise of returns, and you will not market it as such;</li>
          <li>you are solely responsible for the token, its community and any statements you make about it.</li>
        </ul>
        <p>Token parameters such as supply, fee recipient and creator tax are fixed by the smart contracts at launch and cannot be changed by Ponkr. We may hide tokens from our interface, including tokens that appear to breach these Terms, without affecting their existence onchain.</p>
      </section>

      <section id="club">
        <h2>8. Club membership</h2>
        <p>Club membership is determined by the balance of the official Ponkr token held in the wallet you sign in with. Club unlocks launching, higher usage limits and early access to features. Holding the token does not grant any ownership, equity, governance, dividend or profit right in Ponkr. We may change the membership threshold or benefits with notice in the Service.</p>
      </section>

      <section id="fees">
        <h2>9. Fees</h2>
        <p>Trades and launches are subject to fees enforced by the launchpad smart contracts, including trading fees, an optional creator tax set by each token creator, a short anti snipe tax after launch and a launch fee. You also pay network gas fees. Current rates are described in the <Link href="/docs#fees">documentation</Link>. Fees are paid onchain at the time of the transaction and are not refundable.</p>
      </section>

      <section id="api">
        <h2>10. API and developer tools</h2>
        <p>Use of the API, CLI and related tools is subject to these Terms and to published rate limits. You must keep API keys confidential, must not attempt to exceed or circumvent limits, and must not use the API to build a service that misrepresents its connection to Ponkr. We may revoke keys that are abused.</p>
      </section>

      <section id="conduct">
        <h2>11. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>violate any law, including securities, commodities, anti money laundering and sanctions laws;</li>
          <li>manipulate markets, including wash trading, spoofing, coordinated pump schemes or misleading promotion;</li>
          <li>launch tokens that impersonate others, infringe rights, or contain hateful, sexual, violent or otherwise objectionable material;</li>
          <li>interfere with, probe, scrape at abusive volume, or attempt to gain unauthorized access to the Service or its infrastructure;</li>
          <li>use bots or automation outside the API to create accounts, spam launches or evade limits;</li>
          <li>use the Service to harm, defraud or harass any person.</li>
        </ul>
      </section>

      <section id="content">
        <h2>12. Content and intellectual property</h2>
        <p>The Service, including its software, design, text, graphics and the Ponkr name and mascot, is owned by Ponkr or its licensors and protected by intellectual property laws. We grant you a limited, revocable, non exclusive, non transferable license to use the Service for its intended purpose.</p>
        <p>You keep ownership of content you submit, such as token names, logos and descriptions. You grant us a worldwide, royalty free license to host, display and distribute that content as needed to operate and promote the Service. Content written to the blockchain or IPFS is public and permanent and cannot be deleted by us.</p>
      </section>

      <section id="third-party">
        <h2>13. Third party services</h2>
        <p>The Service relies on third parties, including Robinhood Chain, the launchpad smart contracts, Uniswap, wallet and authentication providers, AI model providers, RPC providers and IPFS. We do not control and are not responsible for these services, their availability or their terms. Your use of them may be subject to their own terms and policies.</p>
      </section>

      <section id="risk">
        <h2>14. Risk disclosure</h2>
        <p>Using the Service involves significant risk. By using it you acknowledge that:</p>
        <ul>
          <li><strong>Volatility.</strong> Token prices can move extremely fast and can fall to zero.</li>
          <li><strong>Speculation.</strong> Most tokens launched on bonding curves have no intrinsic value and no ongoing development.</li>
          <li><strong>Smart contracts.</strong> Contracts may contain bugs or be exploited, which may result in loss of funds.</li>
          <li><strong>Network.</strong> Blockchains can experience congestion, outages, reorganizations or changes that affect transactions.</li>
          <li><strong>Regulation.</strong> Laws applying to digital assets are evolving and may affect your ability to use the Service.</li>
          <li><strong>Taxes.</strong> You are responsible for determining and paying any taxes on your activity.</li>
        </ul>
        <p>Only use funds you can afford to lose entirely.</p>
      </section>

      <section id="disclaimers">
        <h2>15. Disclaimers</h2>
        <p>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind, whether express, implied or statutory, including warranties of merchantability, fitness for a particular purpose, title and non infringement. We do not warrant that the Service will be uninterrupted, secure or error free, that data shown is accurate or current, or that any token will have value or liquidity.</p>
      </section>

      <section id="liability">
        <h2>16. Limitation of liability</h2>
        <p>To the maximum extent permitted by law, Ponkr and its contributors, affiliates and service providers will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of profits, revenue, data, goodwill or digital assets, arising from or related to your use of the Service. Our total liability for any claim will not exceed the greater of one hundred US dollars or the amount you paid us directly for the Service in the twelve months before the claim.</p>
      </section>

      <section id="indemnity">
        <h2>17. Indemnification</h2>
        <p>You agree to indemnify and hold harmless Ponkr and its contributors from any claims, losses, liabilities and expenses, including reasonable legal fees, arising from your use of the Service, the tokens you launch, your content, or your breach of these Terms or of any law.</p>
      </section>

      <section id="termination">
        <h2>18. Suspension and termination</h2>
        <p>We may suspend or end your access to all or part of the Service at any time, with or without notice, including if we believe you have breached these Terms or if required by law. You may stop using the Service at any time. Sections that by their nature should survive termination, including risk disclosure, disclaimers, limitation of liability and indemnification, will survive.</p>
      </section>

      <section id="changes">
        <h2>19. Changes to these terms</h2>
        <p>We may update these Terms from time to time. When we do, we will change the effective date above and, for material changes, provide notice in the Service. Continuing to use the Service after changes take effect means you accept the updated Terms.</p>
      </section>

      <section id="law">
        <h2>20. Governing law and disputes</h2>
        <p>These Terms are governed by the laws of the jurisdiction in which Ponkr is established, without regard to conflict of law rules. Before starting any formal proceeding, you agree to contact us and try to resolve the dispute informally for at least thirty days. To the extent permitted by law, disputes will be resolved on an individual basis and not as part of a class or representative action.</p>
      </section>

      <section id="general">
        <h2>21. General</h2>
        <p>These Terms are the entire agreement between you and Ponkr regarding the Service. If any provision is found unenforceable, the rest remains in effect. Our failure to enforce a provision is not a waiver. You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition or sale of assets.</p>
      </section>

      <section id="contact">
        <h2>22. Contact</h2>
        <p>Questions about these Terms can be sent through the support channel linked in the sidebar under Resources.</p>
      </section>
    </DocLayout>
  );
}
