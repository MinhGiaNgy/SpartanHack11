import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import ChatWidget from "./components/ChatWidget";
import "./globals.css";

const sora = Sora({ variable: "--font-display", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpartaSafe | Campus Crime Map",
  description:
    "A student-first safety map for East Lansing with AI-powered hotspot warnings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${manrope.variable} antialiased`}>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
