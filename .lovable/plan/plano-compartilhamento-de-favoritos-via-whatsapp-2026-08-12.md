# Plano: Compartilhamento de Favoritos via WhatsApp

Adicionar a funcionalidade de compartilhar obras favoritas diretamente pelo WhatsApp, conforme solicitado pelo usuário.

## Alterações

### Frontend

- **Adicionar ícone do WhatsApp**: Importar o ícone de `lucide-react` (ou usar um SVG personalizado se preferir o logo oficial).
- **Modificar `BookGrid`**:
    - Adicionar um botão de compartilhamento ao lado do botão de favoritos.
    - O botão deve aparecer apenas quando o filtro de "Favoritas" estiver ativo ou em todas as obras? O usuário disse "em Favoritos ter opçao de conpartilhar", o que sugere que deve ser visível na lista de favoritos.
    - O botão abrirá o WhatsApp com uma mensagem formatada: "Confira esta obra na Biblioteca Plenitude: [Título] - [Link]".
- **Modificar `src/routes/_authenticated/biblioteca.tsx`**:
    - Passar uma prop `isFavoritesView` para o `BookGrid` para identificar se estamos na aba de favoritos.

## Detalhes Técnicos

- O link de compartilhamento será construído usando `https://wa.me/?text=[MENSAGEM_ENCODADA]`.
- A mensagem incluirá o título da obra e a URL permanente da obra no sistema (`window.location.origin + '/obra/' + book.id`).

## Revisão de Segurança

- Os links gerados serão puramente client-side e não expõem dados sensíveis além do que já é público/acessível pelo link direto.
- A funcionalidade respeita a privacidade do usuário, pois ele mesmo decide enviar a mensagem.
