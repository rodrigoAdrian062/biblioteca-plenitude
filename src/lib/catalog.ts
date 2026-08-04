export const SCOPES = [
  { value: "maconico", label: "Maçônico" },
  { value: "nao_maconico", label: "Não-maçônico" },
] as const;

export type BookScope = (typeof SCOPES)[number]["value"];

export function scopeLabel(scope: string | null | undefined): string {
  return SCOPES.find((s) => s.value === scope)?.label ?? "Maçônico";
}

export const KINDS = [
  { value: "livro", label: "Livro" },
  { value: "artigo", label: "Artigo" },
  { value: "peca_arquitetura", label: "Peça de Arquitetura" },
  { value: "trabalho_maconico", label: "Trabalho Maçônico" },
  { value: "outros", label: "Outros" },
] as const;

export type BookKind = (typeof KINDS)[number]["value"];

export function kindLabel(kind: string | null | undefined): string {
  return KINDS.find((k) => k.value === kind)?.label ?? "Livro";
}


const PARTICLES = new Set(["de", "da", "do", "das", "dos", "e", "di", "del", "van", "von", "la", "le"]);

/**
 * Converte "Nicolau Maquiavel" em "MAQUIAVEL, Nicolau".
 * Já aceita a forma invertida ("Maquiavel, Nicolau") sem duplicar a vírgula.
 */
export function formatAuthor(author: string | null | undefined): string {
  const raw = (author ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "";

  if (raw.includes(",")) {
    const [surname, ...rest] = raw.split(",");
    const given = rest.join(",").trim();
    return given ? `${(surname ?? "").trim().toUpperCase()}, ${given}` : (surname ?? "").trim().toUpperCase();
  }

  const parts = raw.split(" ");
  if (parts.length === 1) return raw.toUpperCase();

  // Captura partículas antes do sobrenome final: "Nicolau de Souza" -> "DE SOUZA, Nicolau"
  let cut = parts.length - 1;
  while (cut > 1 && PARTICLES.has((parts[cut - 1] ?? "").toLowerCase())) cut -= 1;

  const surname = parts.slice(cut).join(" ").toUpperCase();
  const given = parts.slice(0, cut).join(" ");
  return `${surname}, ${given}`;
}

/** Nome padronizado do acervo: "MAQUIAVEL, Nicolau - O Príncipe". */
export function catalogName(author: string | null | undefined, title: string): string {
  const a = formatAuthor(author);
  const t = title.trim();
  return a ? `${a} - ${t}` : t;
}

/** Nome padronizado para o arquivo salvo (sem acentos/símbolos problemáticos). */
export function catalogFileName(
  author: string | null | undefined,
  title: string,
  originalName: string,
): string {
  const ext = originalName.includes(".") ? originalName.split(".").pop()!.toLowerCase() : "pdf";
  const base = catalogName(author, title)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9,\- ]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${base || "obra"}.${ext}`;
}
