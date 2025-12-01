"use client";

import { TabNav } from "@radix-ui/themes";
import { getChannels } from "./util";
import NextLink from "next/link";
import { useParams, useSearchParams } from "next/navigation";

export default function Header() {
  const params = useParams();
  const searchParams = useSearchParams();
  return (
    <TabNav.Root>
      {getChannels().map(ch => {
        return (
          <TabNav.Link key={ch} asChild active={params.username === ch}>
            <NextLink href={`/${ch}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`}>{ch}</NextLink>
          </TabNav.Link>
        );
      })}
    </TabNav.Root>
  );
}
