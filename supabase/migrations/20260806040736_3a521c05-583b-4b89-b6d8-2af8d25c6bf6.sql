-- 1. Ensure RLS policies don't use non-existent functions
-- Books Visibility
DROP POLICY IF EXISTS "books_visibility_policy_v12" ON public.books;
CREATE POLICY "books_visibility_policy_v12" ON public.books
FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  OR 
  (
    published = true 
    AND 
    (
      min_degree = 0 
      OR 
      (SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1) >= min_degree
    )
  )
);

-- Global Settings
DROP POLICY IF EXISTS "Admins can manage global settings" ON public.global_settings;
CREATE POLICY "Admins can manage global settings"
ON public.global_settings
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

-- 2. Cleanup: If the previous migration failed midway, we ensure the functions are gone or in the right place.
-- We use a more robust way to handle the functions.
DO $$
BEGIN
    -- Drop functions from public if they exist
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'has_role' AND pg_namespace.nspname = 'public') THEN
        DROP FUNCTION public.has_role(uuid, public.app_role);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'is_admin' AND pg_namespace.nspname = 'public') THEN
        DROP FUNCTION public.is_admin(uuid);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'current_degree' AND pg_namespace.nspname = 'public') THEN
        DROP FUNCTION public.current_degree();
    END IF;
END $$;
