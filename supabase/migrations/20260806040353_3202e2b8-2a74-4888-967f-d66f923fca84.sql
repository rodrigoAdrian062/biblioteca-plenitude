-- ABSOLUTE SECURITY DEFINER LOCKDOWN
-- The linter is still reporting issues, which means there are likely more functions 
-- or the REVOKE didn't cover all roles (including 'anon').

-- 1. Identify all security definer functions in public schema
-- 2. Revoke ALL permissions from PUBLIC and anon for all of them
-- 3. Grant EXECUTE only to authenticated and service_role

DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema, p.proname as name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.prosecdef = true
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', 
                       func_record.schema, func_record.name, func_record.args);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role', 
                       func_record.schema, func_record.name, func_record.args);
    END LOOP;
END $$;
