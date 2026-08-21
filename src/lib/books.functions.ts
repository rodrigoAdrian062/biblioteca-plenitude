import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const addBookServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      title: z.string(),
      author: z.string(),
      min_degree: z.number(),
      scope: z.string(),
      kind: z.string(),
      external_url: z.string(),
      published: z.boolean(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, admin } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    
    const db = await admin();
    const { data: book, error } = await db
      .from("books")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return book;
  });

export const seedBook = createServerFn({ method: "POST" })
  .handler(async () => {
    const { admin } = await import("./admin.server");
    const db = await admin();
    
    // Verificar se já existe
    const { data: existing } = await db
      .from("books")
      .select("id")
      .eq("title", "Instruções do Grau de Mestre")
      .maybeSingle();
      
    if (existing) return { success: true, alreadyExists: true };

    const { error } = await db
      .from("books")
      .insert({
        title: "Instruções do Grau de Mestre",
        author: "Menezes, Ir",
        min_degree: 3,
        scope: "maconico",
        kind: "livro",
        external_url: "/__l5e/assets-v1/fe6a38e4-30f2-4369-9724-4edc0089018d/000097465.pdf",
        published: true,
      });

    if (error) throw error;
    return { success: true };
  });

