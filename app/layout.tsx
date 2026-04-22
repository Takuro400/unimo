import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UniMo",
  description: "時間を振り返る体験",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ background: "#0D0D0F" }}>
        {children}
      </body>
    </html>
  );
}
