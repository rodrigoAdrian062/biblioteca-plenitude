import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listBooks } from "@/lib/library.functions";
import { catalogName } from "@/lib/catalog";

type Book = Awaited<ReturnType<typeof listBooks>>[number];

const seenKey = (uid: string) => `plenitude:notif:seen:${uid}`;
const dismissedKey = (uid: string) => `plenitude:notif:dismissed:${uid}`;
const pushedKey = (uid: string) => `plenitude:notif:pushed:${uid}`;

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value.slice(-200)));
  } catch {
    /* ignore */
  }
}

export function NotificationsBell({
  userId,
  className,
  variant = "icon",
}: {
  userId: string;
  className?: string;
  variant?: "icon" | "menu";
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [firstSeenAt, setFirstSeenAt] = useState<number | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  const { data: books, isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => listBooks(),
    refetchInterval: 60_000,
  });

  // Estado do navegador só após hidratar (evita divergência SSR).
  useEffect(() => {
    setDismissed(readList(dismissedKey(userId)));
    const stored = window.localStorage.getItem(seenKey(userId));
    if (stored) {
      setFirstSeenAt(Number(stored));
    } else {
      const now = Date.now();
      window.localStorage.setItem(seenKey(userId), String(now));
      setFirstSeenAt(now);
    }
    setPermission(
      typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
    );
  }, [userId]);

  const news = useMemo<Book[]>(() => {
    if (!books || firstSeenAt == null) return [];
    return books
      .filter((b) => new Date(b.created_at).getTime() > firstSeenAt)
      .filter((b) => !dismissed.includes(b.id))
      .slice(0, 20);
  }, [books, firstSeenAt, dismissed]);

  // Push notification do navegador para novas obras (uma vez por obra).
  useEffect(() => {
    if (permission !== "granted" || news.length === 0) return;
    const pushed = readList(pushedKey(userId));
    const pending = news.filter((b) => !pushed.includes(b.id));
    if (pending.length === 0) return;
    for (const b of pending.slice(0, 3)) {
      try {
        new Notification("Obaa irmao tem obras novas", {
          body: catalogName(b.author, b.title),
          tag: b.id,
        });
      } catch {
        /* ignore */
      }
    }
    writeList(pushedKey(userId), [...pushed, ...pending.map((b) => b.id)]);
  }, [news, permission, userId]);

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    writeList(dismissedKey(userId), next);
  }

  function clearAll() {
    const next = [...dismissed, ...news.map((b) => b.id)];
    setDismissed(next);
    writeList(dismissedKey(userId), next);
    const now = Date.now();
    window.localStorage.setItem(seenKey(userId), String(now));
    setFirstSeenAt(now);
  }

  async function enablePush() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  const count = news.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "menu" ? (
          <button
            type="button"
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground ${className ?? ""}`}
            aria-label={`Notificações${count ? ` (${count} novas)` : ""}`}
          >
            <span className="relative">
              <Bell className="h-5 w-5" />
              {count > 0 ? (
                <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {count > 9 ? "9+" : count}
                </span>
              ) : null}
            </span>
            Avisos
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={`relative h-9 w-9 ${className ?? ""}`}
            aria-label={`Notificações${count ? ` (${count} novas)` : ""}`}
            title="Notificações"
          >
            <Bell className="h-4 w-4" />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {count > 9 ? "9+" : count}
              </span>
            ) : null}
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <span className="font-display text-sm tracking-wide">Obaa irmao tem obras novas</span>
          {count > 0 ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAll}>
              <X className="mr-1 h-3.5 w-3.5" />
              Limpar
            </Button>
          ) : null}
        </div>

        <ScrollArea className="max-h-72">
          {isLoading ? (
            <div className="space-y-2 px-3 py-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2 py-2">
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-7 w-7 rounded-md" />
                </div>
              ))}
            </div>
          ) : count === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhuma novidade por enquanto.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {news.map((b) => (
                <li key={b.id} className="flex items-start gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      dismiss(b.id);
                      setOpen(false);
                      void navigate({ to: "/obra/$id", params: { id: b.id } });
                    }}
                  >
                    <span className="line-clamp-2 text-sm text-foreground">
                      {catalogName(b.author, b.title)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    aria-label="Remover aviso"
                    onClick={() => dismiss(b.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="border-t border-border/60 px-3 py-2">
          {permission === "granted" ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <BellRing className="h-3.5 w-3.5 text-primary" />
              Notificações ativadas neste aparelho.
            </p>
          ) : permission === "unsupported" || permission === "denied" ? (
            <p className="text-xs text-muted-foreground">
              Notificações bloqueadas neste navegador.
            </p>
          ) : (
            <Button size="sm" variant="secondary" className="w-full" onClick={() => void enablePush()}>
              <BellRing className="mr-1 h-4 w-4" />
              Ativar notificações
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
