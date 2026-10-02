import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOODLE — little guys, big ideas",
  description: "Draw a little guy. Build a community. Reward the people who show up. A character-first Solana launchpad.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
