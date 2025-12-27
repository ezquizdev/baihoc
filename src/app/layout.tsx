import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { siteConfig } from "@/config/site";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ClientRuntimeInit } from "./ClientRuntimeInit";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  keywords: [...siteConfig.keywords],
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    images: [siteConfig.ogImage],
    siteName: siteConfig.name,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <body className="antialiased">
        <ClientRuntimeInit />
        {children}
      </body>
    </html>
  );
}
