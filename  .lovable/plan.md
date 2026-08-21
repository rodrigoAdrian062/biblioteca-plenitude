# Plano de Implementação: Acessibilidade Visual

Para apoiar usuários com problemas de visão, implementaremos um conjunto de ferramentas que permitem personalizar a experiência de leitura e navegação.

## Alterações Propostas

### 1. Interface de Usuário (Frontend)
- **Menu de Acessibilidade:** Criar um novo componente flutuante (ou integrado ao cabeçalho) com as seguintes opções:
  - **Ajuste de Texto:** Botões para aumentar/diminuir o tamanho da fonte globalmente.
  - **Modo de Alto Contraste:** Alternador para um tema de cores simplificado (ex: texto amarelo em fundo preto).
  - **Leitor de Texto (TTS):** Botão para iniciar a leitura por voz do conteúdo da página ou da obra aberta.
- **Melhoria Semântica:** Revisar o HTML para garantir que leitores de tela externos (como NVDA ou VoiceOver) funcionem perfeitamente.

### 2. Leitor de PDF (PdfReader.tsx)
- Integrar controles de zoom mais robustos.
- Adicionar opção de inversão de cores específica para o documento (Dark Mode no PDF).

### 3. Persistência
- Salvar as preferências de acessibilidade do usuário no `localStorage` ou no perfil do banco de dados para que sejam aplicadas automaticamente em cada acesso.

## Detalhes Técnicos
- Utilização da **Web Speech API** para a funcionalidade de leitura por voz.
- Adição de variáveis CSS específicas para o modo de alto contraste no `styles.css`.
- Implementação de um `AccessibilityContext` para gerenciar o estado global de fontes e contraste.

A implementação começará pela criação do `AccessibilityProvider` e do menu de opções no cabeçalho.
