import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isSharedTestAccount } from "@/lib/credentials";

export type Profile = {
  id: string;
  full_name: string;
  degree: number;
  lodge: string | null;
  active: boolean;
};

export function useSessionProfile() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBeta, setIsBeta] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async (current: Session | null) => {
      if (!current) {
        if (!alive) return;
        setProfile(null);
        setIsAdmin(false);
        setIsBeta(false);
        setLoading(false);
        return;
      }
      const [{ data: p }, { data: roles, error: rolesErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, degree, lodge, active")
          .eq("id", current.user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", current.user.id),
      ]);

      if (!alive) return;
      if (rolesErr) {
        console.error("Erro ao carregar permissões:", rolesErr);
      }
      
      setProfile(p ?? null);
      const rolesData = roles || [];
      console.log("Roles detectadas para o usuário:", current.user.id, rolesData);
      const isUserAdmin = rolesData.some((r: any) => r.role === "admin");
      setIsAdmin(isUserAdmin);
      setIsBeta(isSharedTestAccount(current.user.email ?? ""));
      setLoading(false);
    };

    // Nunca chamar a API do Supabase de dentro do callback (risco de deadlock):
    // adiamos a carga do perfil para fora do evento.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setTimeout(() => void load(next), 0);
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void load(data.session);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, profile, isAdmin, isBeta, loading };
}
