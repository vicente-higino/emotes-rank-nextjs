import Rank from "./rank";
import { enabledChannels } from "../util";
import { Suspense } from "react";
import { Metadata, ResolvingMetadata } from "next";

export async function generateStaticParams() {
  return enabledChannels.map(username => ({ username }));
}

export async function generateMetadata(
  { params, searchParams }: PageProps<"/[username]">,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // read route params
  const { username } = await params

  return {
    title: username,
  }
}

export const dynamicParams = false;

export default async function Page(props: PageProps<"/[username]">) {
  return (
    <Suspense>
      <Rank />
    </Suspense>
  );
}
