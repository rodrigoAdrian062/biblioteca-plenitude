import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const memberInput = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(2).max(120),
  degree: z.number().int().min(1).max(3),
  lodge: z.string().trim().max(160).optional().nullable(),
  is_admin: z.boolean().optional(),
});

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, listMembersImpl } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    return listMembersImpl();
  });

export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => memberInput.parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin, createMemberImpl } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    return createMemberImpl(data);
  });

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: z.string().trim().min(2).max(120).optional(),
        degree: z.number().int().min(1).max(3).optional(),
        lodge: z.string().trim().max(160).optional().nullable(),
        active: z.boolean().optional(),
        is_admin: z.boolean().optional(),
        password: z.string().min(8).max(72).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, updateMemberImpl } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    return updateMemberImpl(data);
  });

export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin, deleteMemberImpl } = await import("./admin.server");
    await assertAdmin(context.supabase, context.userId);
    return deleteMemberImpl(data.id);
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { hasAnyAdminImpl } = await import("./admin.server");
  return { exists: await hasAnyAdminImpl() };
});

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => memberInput.omit({ is_admin: true }).parse(data))
  .handler(async ({ data }) => {
    const { hasAnyAdminImpl, createMemberImpl } = await import("./admin.server");
    if (await hasAnyAdminImpl()) {
      throw new Error("Já existe um administrador cadastrado.");
    }
    return createMemberImpl({ ...data, degree: 3, is_admin: true });
  });
