-- Add global_settings table for system-wide configurations
CREATE TABLE public.global_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_settings TO authenticated;
GRANT ALL ON public.global_settings TO service_role;

-- Insert default global watermark setting (default to false)
INSERT INTO public.global_settings (key, value)
VALUES ('watermark_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Update books table to default watermark_enabled to false for new rows
ALTER TABLE public.books ALTER COLUMN watermark_enabled SET DEFAULT false;

-- Add RLS policy for global_settings
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage global settings"
ON public.global_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can read global settings"
ON public.global_settings
FOR SELECT
TO authenticated
USING (true);
