import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "cf-deploy-tutorial — Next.js Demo",
  description: "Next.js 15 static export on Cloudflare Pages",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
