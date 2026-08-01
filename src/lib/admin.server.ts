import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export async function assertAdmin(supabase: Client, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Não foi possível validar as permissões.");
  if (!data) throw new Error("Acesso restrito ao administrador.");
}

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type MemberRow = {
  id: string;
  email: string;
  full_name: string;
  degree: number;
  lodge: string | null;
  active: boolean;
  is_admin: boolean;
  created_at: string;
};

export async function listMembersImpl(): Promise<MemberRow[]> {
  const db = await admin();
  const [{ data: profiles }, { data: roles }, users] = await Promise.all([
    db.from("profiles").select("*").order("full_name"),
    db.from("user_roles").select("user_id, role"),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emails = new Map(users.data.users.map((u) => [u.id, u.email ?? ""]));
  const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: emails.get(p.id) ?? "",
    full_name: p.full_name,
    degree: p.degree,
    lodge: p.lodge,
    active: p.active,
    is_admin: adminIds.has(p.id),
    created_at: p.created_at,
  }));
}

export async function createMemberImpl(input: {
  email: string;
  password: string;
  full_name: string;
  degree: number;
  lodge?: string | null;
  is_admin?: boolean;
}) {
  const db = await admin();
  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message ?? "Falha ao criar o acesso.");

  const userId = data.user.id;
  const { error: pErr } = await db.from("profiles").insert({
    id: userId,
    full_name: input.full_name,
    degree: input.degree,
    lodge: input.lodge ?? null,
  });
  if (pErr) throw new Error(pErr.message);

  const { error: rErr } = await db
    .from("user_roles")
    .insert({ user_id: userId, role: input.is_admin ? "admin" : "member" });
  if (rErr) throw new Error(rErr.message);

  return { id: userId };
}

export async function updateMemberImpl(input: {
  id: string;
  full_name?: string;
  degree?: number;
  lodge?: string | null;
  active?: boolean;
  is_admin?: boolean;
  password?: string;
}) {
  const db = await admin();
  const patch: Record<string, unknown> = {};
  if (input.full_name !== undefined) patch["full_name"] = input.full_name;
  if (input.degree !== undefined) patch["degree"] = input.degree;
  if (input.lodge !== undefined) patch["lodge"] = input.lodge;
  if (input.active !== undefined) patch["active"] = input.active;

  if (Object.keys(patch).length > 0) {
    const { error } = await db.from("profiles").update(patch).eq("id", input.id);
    if (error) throw new Error(error.message);
  }

  if (input.password) {
    const { error } = await db.auth.admin.updateUserById(input.id, { password: input.password });
    if (error) throw new Error(error.message);
  }

  if (input.is_admin !== undefined) {
    await db.from("user_roles").delete().eq("user_id", input.id);
    const { error } = await db
      .from("user_roles")
      .insert({ user_id: input.id, role: input.is_admin ? "admin" : "member" });
    if (error) throw new Error(error.message);
  }

  return { ok: true };
}

export async function deleteMemberImpl(id: string) {
  const db = await admin();
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function signAssetsImpl(paths: string[]) {
  if (paths.length === 0) return {} as Record<string, string>;
  const db = await admin();
  const { data } = await db.storage.from("acervo").createSignedUrls(paths, 60 * 60);
  const out: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}

export async function hasAnyAdminImpl() {
  const db = await admin();
  const { count } = await db
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return (count ?? 0) > 0;
}
