import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import "react-day-picker/style.css";
import "./globals.css";
import { Link, Text, Theme } from "@radix-ui/themes";
import React, { Suspense } from "react";
import Providers from "./providers";
import Header from "./header";

export const metadata: Metadata = {
  title: {
    template: 'Emotes Rank - %s',
    default: 'Emotes Rank',
  }
};
export default async function RootLayout({ children, params }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className="scheme-dark">
      <body>
        <Theme appearance="dark">
          <div className="flex min-h-screen items-center justify-center">
            <main className="flex min-h-screen w-10/12 flex-col items-center justify-between lg:px-16 2xl:max-w-7xl">
              <noscript>
                <div className="flex min-h-screen items-center justify-center p-4">
                  <Text size="3" className="text-center">
                    This application only works with JavaScript enabled. Please enable JavaScript in your browser settings and reload the page.
                  </Text>
                </div>
              </noscript>
              <Suspense>
                <Header />
              </Suspense>

              <Providers>{children}</Providers>
            </main>
          </div>
          <footer className="text-center text-sm text-gray-500 w-full py-2 px-2">
            <Text size="2">
              Made by{" "}
              <Link className="underline" href="http://github.com/vicente-higino" target="_blank" rel="noopener noreferrer">
                v_cn_t
              </Link>
              .
            </Text>
          </footer>
        </Theme>
      </body>
    </html>
  );
}
