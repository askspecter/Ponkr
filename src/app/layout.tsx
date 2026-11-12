import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AppShell } from "@/components/AppShell";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700", "800"] });
const body = Inter_Tight({ variable: "--font-body", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kekr.app";
const TITLE = "Kekr | AI trading agent and token launchpad";
const DESCRIPTION = "Talk to trade, type to launch. Research, trade and launch tokens on Robinhood Chain with an AI agent, and use 300+ AI models with one key.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s | Kekr" },
  description: DESCRIPTION,
  applicationName: "Kekr",
  openGraph: { type: "website", siteName: "Kekr", title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", site: "@kekrdotapp", creator: "@kekrdotapp", title: TITLE, description: DESCRIPTION },
  appleWebApp: { capable: true, title: "Kekr", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0d",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable} antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
