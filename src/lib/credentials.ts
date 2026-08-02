export const LOGIN_DOMAIN = "plenitude.local";

/** Conta compartilhada de testes (BETA): não pode alterar login/senha. */
export const SHARED_TEST_LOGIN = "visitante";

export function isSharedTestAccount(loginOrEmail: string) {
  const value = (loginOrEmail ?? "").trim().toLowerCase();
  return value === SHARED_TEST_LOGIN || value === `${SHARED_TEST_LOGIN}@${LOGIN_DOMAIN}`;
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeLogin(value: string) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^[.\-_]+|[.\-_]+$/g, "")
    .slice(0, 40);
}

/** Login sugerido: primeiro e último nome do irmão + número. */
export function suggestLogin(fullName: string) {
  const parts = stripAccents(fullName).trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "irmao";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const base = normalizeLogin(last ? `${first}.${last}` : first) || "irmao";
  const n = Math.floor(10 + Math.random() * 90);
  return `${base}${n}`;
}

/** Senha sugerida: nome do irmão capitalizado + número. */
export function suggestPassword(fullName: string) {
  const parts = stripAccents(fullName).trim().split(/\s+/).filter(Boolean);
  const raw = (parts[0] ?? "Irmao").replace(/[^A-Za-z0-9]/g, "");
  const base = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  const n = Math.floor(1000 + Math.random() * 9000);
  const padded = base.length >= 4 ? base : `${base}Loja`;
  return `${padded}${n}`;
}

export function loginToEmail(login: string) {
  const value = login.trim();
  if (value.includes("@")) return value.toLowerCase();
  return `${normalizeLogin(value)}@${LOGIN_DOMAIN}`;
}

export function emailToLogin(email: string) {
  const value = (email ?? "").trim();
  if (value.toLowerCase().endsWith(`@${LOGIN_DOMAIN}`)) return value.split("@")[0] ?? value;
  return value;
}
