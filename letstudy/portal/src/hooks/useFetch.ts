"use client";

import { useState, useEffect, useCallback } from "react";

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

/**
 * useFetch — replaces the repeated useState+useEffect fetch pattern across 40+ pages.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useFetch<Student[]>("/api/admin/students");
 */
export function useFetch<T>(
  url: string | null,
  options?: RequestInit
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(url, { credentials: "include", ...options })
      .then((r) => (r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e?.error ?? "Failed"))))
      .then((d: T) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(typeof err === "string" ? err : "Request failed");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick]);

  return { data, loading, error, refetch };
}
