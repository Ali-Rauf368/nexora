import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** Loads `path` and reloads whenever it changes. `reload()` refetches after a mutation. */
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setError(undefined);
    api<T>(path)
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload, loading: !data && !error };
}
