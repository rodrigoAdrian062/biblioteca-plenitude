# Plano: Datas de Último Acesso e Leitura no Painel Admin

Vou implementar a exibição da última data de acesso ao sistema e da última leitura de obra para cada irmão no painel administrativo, permitindo um melhor acompanhamento do engajamento.

## Ações Técnicas

### 1. Banco de Dados (Supabase)
- Atualizar a função RPC `get_visiting_stats` para incluir:
    - `last_system_login`: Data do último login no sistema (extraída de `auth.users`).
    - `last_book_read`: Data da última vez que o usuário abriu uma obra (extraída de `book_access_logs`).

### 2. Backend (TanStack Start)
- **admin.server.ts**: Atualizar `listMembersImpl` para incluir `last_sign_in_at` diretamente da tabela `auth.users`.
- **library.functions.ts**: Atualizar a tipagem de `adminStats` para refletir as novas colunas da RPC.

### 3. Interface (Admin Dashboard)
- **admin.tsx**: 
    - Expandir a tabela "Contador de Visitas por Irmão" com as novas colunas.
    - Implementar formatação amigável para as datas (ex: "Há 5 min", "20/08 23:40").
    - Adicionar ícones discretos para diferenciar os tipos de acesso.

## Validação
- Verificar se as datas aparecem corretamente para usuários com atividade recente.
- Garantir que usuários sem registros (novos irmãos) exibam "Nunca" ou campo vazio de forma elegante.
