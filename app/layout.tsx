import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CapitalForge",
  description: "AI-powered strategic decision simulation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="antialiased">
        {children}
      </body>
    </html>
  );
}
