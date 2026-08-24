"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,      // 5 minutes — no refetch on nav
            gcTime: 10 * 60 * 1000,        // 10 minutes in cache
            refetchOnWindowFocus: false,   // Never refetch on tab switch
            refetchOnReconnect: false,
            retry: 1,                      // Fail fast (default is 3 retries)
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
