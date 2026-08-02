import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** IDs das obras favoritas do irmão logado */
export const listFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("favorites")
      .select("book_id")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.book_id);
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ bookId: z.string().uuid(), favorite: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    if (data.favorite) {
      const { error } = await context.supabase
        .from("favorites")
        .upsert(
          { user_id: context.userId, book_id: data.bookId },
          { onConflict: "user_id,book_id" },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("favorites")
        .delete()
        .eq("user_id", context.userId)
        .eq("book_id", data.bookId);
      if (error) throw new Error(error.message);
    }
    return { favorite: data.favorite };
  });

/** Salva a página onde o irmão parou */
export const saveProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        bookId: z.string().uuid(),
        page: z.number().int().min(1),
        totalPages: z.number().int().min(1).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reading_progress").upsert(
      {
        user_id: context.userId,
        book_id: data.bookId,
        last_page: data.page,
        total_pages: data.totalPages ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,book_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Remove o histórico de leitura: uma obra específica ou todas */
export const clearProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ bookId: z.string().uuid().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("reading_progress")
      .delete()
      .eq("user_id", context.userId);
    if (data.bookId) query = query.eq("book_id", data.bookId);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Histórico de leitura recente com capa, página final e data */
export const listHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reading_progress")
      .select("book_id, last_page, total_pages, updated_at, books(id, title, author, scope, min_degree, cover_path)")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);

    const rows = (data ?? []).filter((r) => r.books);
    const { signAssetsImpl } = await import("./admin.server");
    const covers = await signAssetsImpl(
      rows
        .map((r) => (r.books as { cover_path: string | null }).cover_path)
        .filter((p): p is string => Boolean(p)),
    );

    return rows.map((r) => {
      const book = r.books as {
        id: string;
        title: string;
        author: string | null;
        scope: string;
        min_degree: number;
        cover_path: string | null;
      };
      return {
        book_id: r.book_id,
        last_page: r.last_page,
        total_pages: r.total_pages,
        updated_at: r.updated_at,
        title: book.title,
        author: book.author,
        scope: book.scope,
        min_degree: book.min_degree,
        cover_url: book.cover_path ? (covers[book.cover_path] ?? null) : null,
      };
    });
  });
