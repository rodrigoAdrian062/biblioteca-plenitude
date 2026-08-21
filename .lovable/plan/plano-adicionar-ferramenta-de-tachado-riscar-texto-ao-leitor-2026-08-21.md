# Plano: Adicionar Ferramenta de Tachado (Riscar Texto) ao Leitor de PDF

Adicionar uma nova ferramenta ao leitor de PDF que permita "riscar" o texto (tachado), além de melhorar a persistência das anotações existentes.

## Alterações Sugeridas

### Frontend

1.  **Componente `PdfReader.tsx`**:
    *   Importar o ícone `Strikethrough` da biblioteca `lucide-react`.
    *   Adicionar o tipo `strikethrough` ao estado `DrawingTool`.
    *   Incluir um novo botão na barra de ferramentas flutuante para a ferramenta "Tachado".
    *   Implementar a lógica de desenho para o "Tachado":
        *   Diferente da caneta livre, o tachado desenhará linhas retas (preferencialmente horizontais) para facilitar o ato de riscar o texto.
        *   Ajustar a opacidade e a espessura da linha para que pareça uma marcação de cancelamento/risco sobre o texto.
    *   Melhorar a persistência:
        *   Garantir que os desenhos feitos não desapareçam ao mudar o zoom (scale) ou ao rolar a página no modo vertical.
        *   Redesenhar as anotações sempre que o canvas de uma página for carregado ou atualizado.

## Detalhes Técnicos

*   **Ferramenta de Tachado**: Usará `ctx.lineTo(x, startY)` para garantir que o risco seja horizontal se o usuário desejar, ou uma linha reta entre o ponto inicial e o final.
*   **Estado**: Utilizar o estado `annotations` para armazenar os caminhos (paths) e metadados de cada desenho por página.
*   **Renderização**: Vincular a função de redesenho ao ciclo de vida das páginas do PDF para manter a consistência visual.

## Próximos Passos

1.  Modificar `src/components/PdfReader.tsx` para incluir o novo botão e a lógica de desenho.
2.  Testar a ferramenta no preview para garantir que o "risco" sobre o texto funcione conforme esperado.
