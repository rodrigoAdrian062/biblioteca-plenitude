# Plano de Ajuste das Ferramentas do Leitor de PDF

Ajustar a ferramenta de marca-texto para ser mais transparente (clara) e garantir que as anotações feitas no leitor de PDF sejam salvas.

## Alterações

### Frontend

1.  **Componente `PdfReader` (`src/components/PdfReader.tsx`)**:
    *   **Transparência do Marca-texto**: Alterar o valor de opacidade da ferramenta de marca-texto (`highlighter`) de `66` (40%) para algo mais claro, como `33` (20%) ou `22` (13%), para garantir que o texto abaixo permaneça legível.
    *   **Persistência de Anotações**:
        *   Implementar a lógica para salvar as anotações (canvas data) no `localStorage` ou através de uma função de callback (como `onSaveAnnotations`).
        *   Carregar as anotações salvas ao abrir a obra.
        *   Usar o `storageKey` já existente para identificar a obra e associar as anotações a ela.

### Backend (Banco de Dados)

1.  **Nova Tabela `book_annotations`**:
    *   Criar uma tabela para armazenar as anotações persistentes no banco de dados, permitindo que o usuário as veja em diferentes dispositivos.
    *   Colunas: `id`, `user_id`, `book_id`, `page_number`, `canvas_data` (JSON ou base64), `created_at`, `updated_at`.
    *   Habilitar RLS e permissões de acesso.

## Detalhes Técnicos

*   As anotações serão salvas como um array de caminhos ou o estado do canvas (`toDataURL`) associado a cada página da obra.
*   A opacidade do marca-texto será ajustada na função `startDrawing` onde o `ctx.strokeStyle` é definido para a ferramenta `highlighter`.
*   Será adicionado um efeito de "auto-save" após o `stopDrawing` para persistir as mudanças.

## Verificação

*   Abrir um PDF no leitor.
*   Usar o marca-texto e verificar se as letras continuam visíveis (mais claras).
*   Riscar ou desenhar no PDF, fechar a obra e abrir novamente para confirmar se as anotações persistem.
*   Verificar no console se não há erros de performance ao renderizar muitos canvas.
