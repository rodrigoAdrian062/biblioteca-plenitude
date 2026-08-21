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
    // Garantir que a query não falhe por RLS se o perfil ainda não estiver carregado ou algo similar
    // Embora a policy v13 seja robusta, forçamos o bypass se for service role (já garantido por context.supabase)
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
    if (!book) throw new Error("Obra indisponível para o seu grau.");

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
    if (error) throw new Error("Erro ao buscar obra: " + error.message);
    if (!book) throw new Error("Esta obra não existe ou não está disponível para o seu grau.");

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

export const resetAccessLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);

    const { admin } = await import("./admin.server");
    const db = await admin();
    const { error } = await db
      .from("book_access_logs")
      .delete()
      .neq("action", "impossible_action_value"); // Força o delete de todos os registros ignorando RLS via admin client

    if (error) throw error;
    return { success: true };
  });


export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, admin } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const [books, members, logs, visitingStats] = await Promise.all([
      db.from("books").select("id", { count: "exact", head: true }),
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("book_access_logs").select("id", { count: "exact", head: true }),
      db.rpc("get_visiting_stats"),
    ]);
    return {
      books: books.count ?? 0,
      members: members.count ?? 0,
      reads: logs.count ?? 0,
      visitingStats: (visitingStats.data || []) as Array<{ 
        full_name: string; 
        reads_count: number;
        last_login_at: string | null;
        last_read_at: string | null;
      }>,
    };
  });

export const getBookAnnotations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ book_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: annotations, error } = await context.supabase
      .from("book_annotations")
      .select("page_number, canvas_data")
      .eq("book_id", data.book_id)
      .eq("user_id", context.userId);

    if (error) throw new Error("Erro ao buscar anotações: " + error.message);
    return annotations || [];
  });

export const saveBookAnnotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({ 
      book_id: z.string().uuid(),
      page_number: z.number().int(),
      canvas_data: z.string()
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("book_annotations")
      .upsert({
        user_id: context.userId,
        book_id: data.book_id,
        page_number: data.page_number,
        canvas_data: data.canvas_data,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, book_id, page_number'
      });

    if (error) throw new Error("Erro ao salvar anotação: " + error.message);
    return { success: true };
  });
