# Plano de Implementação - Leitura por Voz e Realce Dinâmico no PDF

Implementar um botão de leitura por voz (TTS) no leitor de PDF que realize a leitura sequencial do texto das páginas, com suporte a realce visual dinâmico (riscando/destacando) enquanto o áudio é reproduzido.

## 🛠️ Alterações Técnicas

### 1. Extensão do Hook de Acessibilidade
- Modificar `src/hooks/useAccessibility.tsx` para incluir estados de controle de leitura (reproduzindo, pausado, progresso).
- Adicionar uma função `speakSequence` que aceita uma lista de strings e gerencia a transição entre parágrafos ou seções de texto.

### 2. Aprimoramento do Leitor de PDF
- **Interface:** Adicionar botões de "Ouvir Obra" e "Pausar" na barra de ferramentas do `src/components/PdfReader.tsx`.
- **Extração de Texto:** Utilizar o `pdfjs` já integrado para extrair o conteúdo textual da página atual de forma estruturada.
- **Sincronização:**
    - Mapear o progresso do `SpeechSynthesis` com os elementos de texto renderizados no PDF.
    - Implementar um mecanismo de realce (overlay CSS ou marcação temporária) que acompanhe a leitura, simulando o efeito de "ir riscando" solicitado.
- **Continuidade:** Adicionar lógica para avançar automaticamente para a próxima página após a conclusão da leitura da página atual.

### 3. Interface e Experiência (UX)
- Botões discretos e elegantes na barra superior do leitor.
- Efeito visual de realce suave (ex: fundo amarelo translúcido ou linha de progresso) que não polua a leitura visual.

## 📝 User Summary
Vou adicionar um botão de "Ouvir" diretamente no leitor de PDF. Ao clicar, o sistema começará a ler o texto da página atual em voz alta e, de forma profissional, irá destacar visualmente a parte que está sendo lida no momento (como se estivesse riscando ou acompanhando com um marca-texto). O sistema avançará as páginas automaticamente conforme a leitura progride.
