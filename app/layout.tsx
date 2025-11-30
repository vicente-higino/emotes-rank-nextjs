import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@radix-ui/themes/styles.css";
import "react-day-picker/style.css";
import "./globals.css";
import { Link, Text, Theme } from "@radix-ui/themes";
import React from "react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = { title: "Emotes Ranking" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {

  return (
    <html lang="en" data-theme="dark" className="scheme-dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Theme appearance="dark">
          <div className="flex min-h-screen items-center justify-center">
            <main className="flex min-h-screen w-10/12 flex-col items-center justify-between lg:px-16 2xl:max-w-7xl">
              {children}
            </main>
          </div>
          <footer className="text-center text-sm text-gray-500 w-full py-2 px-2">
            <Text size="2">
              Made by <Link className="underline" href="http://github.com/vicente-higino" target="_blank" rel="noopener noreferrer">v_cn_t</Link>.
            </Text>
          </footer>
        </Theme>
      </body>
    </html >
  );
}
