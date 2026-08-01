import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Theme = "dark" | "light";

const BASE_KEY = "plenitude:theme";

/** Rotas públicas sempre usam o tema padrão da marca (escuro). */
export const PUBLIC_THEME_ROUTES = ["/", "/auth", "/setup"];

export function isPublicThemeRoute(pathname: string) {
  return PUBLIC_THEME_ROUTES.includes(pathname);
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function readStored(key: string): Theme {
  try {
    const raw = localStorage.getItem(key);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [storageKey, setStorageKey] = useState<string>(BASE_KEY);

  useEffect(() => {
    let cancelled = false;

    const load = (userId: string | null) => {
      const key = userId ? `${BASE_KEY}:${userId}` : BASE_KEY;
      if (cancelled) return;
      const stored = readStored(key);
      setStorageKey(key);
      setTheme(stored);
      if (!isPublicThemeRoute(window.location.pathname)) apply(stored);
    };

    supabase.auth.getUser().then(({ data }) => load(data.user?.id ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => load(session?.user?.id ?? null), 0);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      apply(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [storageKey]);

  return { theme, toggle };
}
