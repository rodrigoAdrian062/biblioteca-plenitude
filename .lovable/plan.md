# Plano para Restaurar as Cores do Tema

Restaurar as cores do tema escuro para os tons de verde-azulado profundo e dourado originais, conforme solicitado.

## Alterações Propostas

### Estilo Global
- Reverter as variáveis de cor no bloco `.dark` do arquivo `src/styles.css` para os valores de `oklch` anteriores à modernização recente.
- Manter o tom verde-azulado profundo (`oklch(0.205 0.035 191)`) como base e o dourado original para os destaques.

## Detalhes Técnicos
- Arquivo afetado: `src/styles.css`.
- Reversão manual das variáveis CSS: `--background`, `--foreground`, `--card`, `--popover`, `--primary-foreground`, `--secondary`, `--muted`, `--accent`, `--border`, `--input`, `--ring` e suas variantes de sidebar no escopo `.dark`.
