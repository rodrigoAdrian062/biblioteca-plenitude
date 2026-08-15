# Plano: Implementação de Busca Textual no Leitor de PDF

O objetivo é permitir que os usuários pesquisem por termos específicos dentro de cada obra, facilitando a localização de menções e temas de interesse.

## Alterações Propostas

### Frontend

- **PdfReader.tsx**
    - Habilitar `renderTextLayer={true}` no componente `Page` do `react-pdf`. Isso é necessário para que o texto seja pesquisável e selecionável.
    - Adicionar um estado para o termo de busca (`searchTerm`).
    - Implementar um campo de input na barra de ferramentas do leitor (ao lado dos controles de zoom/modo).
    - Adicionar lógica para encontrar e destacar o texto pesquisado. Como o `react-pdf` renderiza página a página, a busca precisa ser integrada com a navegação para levar o usuário até a página onde o termo foi encontrado.
    - Adicionar botões de navegação de busca ("Próximo" / "Anterior") se houver múltiplas ocorrências.
    - Implementar proteção CSS `user-select: none` nas páginas para desencorajar a cópia direta, mantendo a funcionalidade de busca interna ativa (se for um requisito de segurança manter a restrição de cópia).

## Detalhes Técnicos

- **Biblioteca**: Utilizaremos as capacidades de `TextLayer` do `react-pdf`.
- **Estilização**: O input de busca seguirá o padrão visual do sistema (borda dourada, ícone de lupa da Lucide).
- **Performance**: Em modo vertical, o carregamento de muitas camadas de texto simultâneas pode impactar o navegador; avaliaremos se é necessário limitar a renderização da camada de texto apenas às páginas visíveis via `IntersectionObserver`.

## Considerações de Segurança

- Atualmente o sistema desativa a camada de texto para dificultar o download/cópia. Ao habilitá-la para a busca, o texto volta a estar tecnicamente acessível no código-fonte da página (DOM). Manteremos as marcas d'água e desativaremos o menu de contexto (botão direito) para mitigar riscos, conforme já implementado.
