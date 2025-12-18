import type { Metadata } from "next";
import { ensureSeedAdmin } from "@/application/bootstrap/seedAdmin";
import { siteConfig } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  keywords: siteConfig.keywords,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    images: [siteConfig.ogImage],
    siteName: siteConfig.name,
  },
};

// Fire-and-forget bootstrap tasks (idempotent per server instance)
void ensureSeedAdmin();

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
