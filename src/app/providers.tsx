"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// TanStack Query handles non-streaming SERVER-STATE (history, config, mock patients).
// Chat streaming lives OUTSIDE of Query (local state in useChat) — they are separate concerns.
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
