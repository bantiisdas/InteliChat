"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import * as React from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
    },
  });
}

export function QueryProviders({ children }: { children: React.ReactNode }) {
  const queryClient = makeQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
