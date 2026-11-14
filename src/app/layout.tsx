import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono, Noto_Sans_Bengali, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const jbmono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono", display: "swap" });
const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-bengali", display: "swap" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", display: "swap" });

export const metadata: Metadata = {
  title: "Tarazu — the gold ledger both sides sign",
  description: "Gold moves on trust. Tarazu makes it move on proof, and gives the karigar the same book as the jeweller.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/assets/logo-tarazu.svg" },
  openGraph: { title: "Tarazu", description: "The gold ledger both sides sign.", images: ["/assets/og-image.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F6F1E7" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jakarta.variable} ${jbmono.variable} ${bengali.variable} ${deva.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
