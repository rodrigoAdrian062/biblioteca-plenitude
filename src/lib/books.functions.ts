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
