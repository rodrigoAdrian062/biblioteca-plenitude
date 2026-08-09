ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS download_enabled boolean NOT NULL DEFAULT false;