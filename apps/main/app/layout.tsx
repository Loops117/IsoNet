import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { PublicSiteChrome } from "./components/public-site-chrome";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Isopod Network",
  description:
    "The Isopod Network sets a public standard for isopod and invert vendors—honest trade, clean genetics, sanitary supplies, responsive service, and zero tolerance for scams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PublicSiteChrome>{children}</PublicSiteChrome>
      </body>
    </html>
  );
}
