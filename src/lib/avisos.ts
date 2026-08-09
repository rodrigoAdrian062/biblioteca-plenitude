import { toast } from "sonner";

type Aviso = { titulo: string; dica: string };

const REGRAS: { teste: RegExp; titulo: string; dica: string }[] = [
  {
    teste: /invalid login credentials|invalid credentials/i,
    titulo: "Login ou senha incorretos.",
    dica: "Dica: confira maiúsculas/minúsculas e use apenas o login (sem e-mail). Se esqueceu, peça ao administrador para gerar uma nova senha.",
  },
  {
    teste: /password should be at least|password.*6 characters|weak password/i,
    titulo: "Senha muito curta ou fraca.",
    dica: "Dica: use ao menos 8 caracteres, misturando letras maiúsculas, minúsculas e números.",
  },
  {
    teste: /pwned|compromised|hibp/i,
    titulo: "Essa senha é muito comum e já vazou na internet.",
    dica: "Dica: escolha algo único, como uma frase curta com números (ex.: Plenitude.4759).",
  },
  {
    teste: /same as the old|should be different/i,
    titulo: "A nova senha é igual à anterior.",
    dica: "Dica: escolha uma senha diferente da que você já usava.",
  },
  {
    teste: /already registered|already exists|duplicate key|unique constraint/i,
    titulo: "Esse login já está em uso.",
    dica: "Dica: acrescente um número ou sobrenome ao login (ex.: joao.silva27).",
  },
  {
    teste: /email address.*invalid|invalid format|invalid email/i,
    titulo: "Login em formato inválido.",
    dica: "Dica: use apenas letras, números e pontos, sem espaços ou acentos (ex.: joao.silva).",
  },
  {
    teste: /rate limit|too many requests|429|over_email_send_rate/i,
    titulo: "Muitas tentativas em pouco tempo.",
    dica: "Dica: aguarde alguns minutos antes de tentar novamente.",
  },
  {
    teste: /jwt|token|session|not authenticated|unauthorized|401/i,
    titulo: "Sua sessão expirou.",
    dica: "Dica: entre novamente com seu login e senha para continuar.",
  },
  {
    teste: /forbidden|permission|not allowed|row-level security|403/i,
    titulo: "Você não tem permissão para esta ação.",
    dica: "Dica: apenas o administrador pode alterar este item. Fale com a Loja se precisar de acesso.",
  },
  {
    teste: /not found|404|indispon/i,
    titulo: "Item não encontrado.",
    dica: "Dica: a obra pode ter sido removida ou não estar liberada para o seu grau.",
  },
  {
    teste: /payload too large|file size|exceeded the maximum/i,
    titulo: "Arquivo grande demais.",
    dica: "Dica: reduza o PDF (compacte ou divida em partes) antes de enviar.",
  },
  {
    teste: /network|failed to fetch|timeout|offline/i,
    titulo: "Falha de conexão.",
    dica: "Dica: verifique sua internet e tente novamente em instantes.",
  },
];

/** Converte qualquer erro em um aviso claro, em português e com dica prática. */
export function traduzirErro(err: unknown, padrao = "Não foi possível concluir a ação."): Aviso {
  const bruto =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : typeof err === "object" && err && "message" in err
          ? String((err as { message: unknown }).message)
          : "";

  const regra = REGRAS.find((r) => r.teste.test(bruto));
  if (regra) return { titulo: regra.titulo, dica: regra.dica };

  // Mensagens que já vêm em português do nosso servidor são mantidas.
  const jaEmPortugues = /[ãõçáéíóúêô]|irmão|senha|obra|acervo|login/i.test(bruto);
  const finalPadrao = padrao === "Não foi possível salvar a obra." ? "Não foi possível salvar essa obra." : padrao;
  
  return {
    titulo: jaEmPortugues && bruto ? bruto : finalPadrao,
    dica: "Dica: confira os dados preenchidos e tente novamente. Se persistir, avise o administrador da Biblioteca.",
  };
}

/** Exibe o erro traduzido como notificação (título + dica). */
export function avisarErro(err: unknown, padrao?: string) {
  const { titulo, dica } = traduzirErro(err, padrao);
  toast.error(titulo, { description: dica, duration: 7000 });
}

/** Notificação de sucesso com orientação opcional. */
export function avisarSucesso(titulo: string, dica?: string) {
  toast.success(titulo, dica ? { description: dica } : undefined);
}
