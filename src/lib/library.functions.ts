import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getGlobalSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // We use any casting here to bypass generated type limitations until they refresh
    const { data, error } = await (context.supabase as any).from("global_settings").select("*");
    if (error) throw error;
    return (data || []).reduce((acc: Record<string, any>, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
  });

export const updateGlobalSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ key: z.string(), value: z.any() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);

    const { error } = await (context.supabase as any)
      .from("global_settings")
      .upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { success: true };
  });

export const listBooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { signAssetsImpl } = await import("./admin.server");
    const { data, error } = await context.supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const books = data ?? [];
    const covers = await signAssetsImpl(
      books.map((b) => b.cover_path).filter((p): p is string => Boolean(p)),
    );
    return books.map((b) => ({
      ...b,
      cover_url: b.cover_path ? (covers[b.cover_path] ?? null) : null,
    }));
  });

export const getBookFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { signAssetsImpl } = await import("./admin.server");
    const { data: book, error } = await context.supabase
      .from("books")
      .select("id, file_path, external_url")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!book) throw new Error("Acervo indisponível para o seu grau.");

    await context.supabase
      .from("book_access_logs")
      .insert({ book_id: book.id, user_id: context.userId, action: "open" });

    if (book.file_path) {
      const signed = await signAssetsImpl([book.file_path]);
      const url = signed[book.file_path];
      if (url) return { url };
    }
    if (book.external_url) return { url: book.external_url };
    throw new Error("Este acervo não possui arquivo disponível.");
  });

export const getBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { signAssetsImpl } = await import("./admin.server");
    const { data: book, error } = await context.supabase
      .from("books")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!book) throw new Error("Acervo indisponível para o seu grau.");

    await context.supabase
      .from("book_access_logs")
      .insert({ book_id: book.id, user_id: context.userId, action: "open" });

    const paths = [book.file_path, book.cover_path].filter((p): p is string => Boolean(p));
    const signed = await signAssetsImpl(paths);

    return {
      ...book,
      cover_url: book.cover_path ? (signed[book.cover_path] ?? null) : null,
      file_url: book.file_path ? (signed[book.file_path] ?? null) : (book.external_url ?? null),
    };
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, admin } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const [books, members, logs] = await Promise.all([
      db.from("books").select("id", { count: "exact", head: true }),
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("book_access_logs").select("id", { count: "exact", head: true }),
    ]);
    return {
      books: books.count ?? 0,
      members: members.count ?? 0,
      reads: logs.count ?? 0,
    };
  });
