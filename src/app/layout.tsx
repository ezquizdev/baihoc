import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ClientRuntimeInit } from "./ClientRuntimeInit";
import ChatBubble from "@/components/chat/ChatBubble";

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
    <html lang="en">
      <body className="antialiased">
        <ClientRuntimeInit />
        {children}
        <ChatBubble />
      </body>
    </html>
  );
}
