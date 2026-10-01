import { useCallback, useState } from 'react';

const KEY = 'll.hideBalances';

function initial(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** A device-local, persisted "hide the numbers" preference — for a glance over someone's shoulder, not a security boundary (the real figures are one click away in the same browser). */
export function useHideBalances() {
  const [hidden, setHidden] = useState<boolean>(() => initial());

  const toggle = useCallback(() => {
    setHidden((h) => {
      const next = !h;
      try {
        localStorage.setItem(KEY, next ? '1' : '0');
      } catch {
        // Private browsing or a full quota — the toggle still works for this session.
      }
      return next;
    });
  }, []);

  return { hidden, toggle };
}
