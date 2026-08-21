-- Criação da tabela de notas pessoais
CREATE TABLE public.book_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, book_id)
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_notes TO authenticated;
GRANT ALL ON public.book_notes TO service_role;

-- RLS
ALTER TABLE public.book_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notes"
ON public.book_notes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
