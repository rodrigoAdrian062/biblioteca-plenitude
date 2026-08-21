CREATE TABLE IF NOT EXISTS public.book_annotations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    page_number integer NOT NULL,
    canvas_data text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, book_id, page_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_annotations TO authenticated;
GRANT ALL ON public.book_annotations TO service_role;

ALTER TABLE public.book_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own annotations"
    ON public.book_annotations
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);