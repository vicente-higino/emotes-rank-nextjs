"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React, { useState } from "react";
import RankPage from "./rank";

export default function HomePage({ }: PageProps<"/">) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 60 * 1000,
            networkMode: "offlineFirst",
          },
        },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <RankPage />
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}