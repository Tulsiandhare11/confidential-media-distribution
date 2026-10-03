import { DependencyList, useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../api';

interface ResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useApiResource<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<ResourceState<T>>({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader().
    then((data) => {
      if (!cancelled) setState({ data, error: null, loading: false });
    }).
    catch((e: unknown) => {
      if (!cancelled) setState((s) => ({ data: s.data, error: errorMessage(e), loading: false }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, reload };
}