export const DEGREES = [
  { value: 1, label: "Aprendiz", symbol: "I" },
  { value: 2, label: "Companheiro", symbol: "II" },
  { value: 3, label: "Mestre", symbol: "III" },
] as const;

export function degreeLabel(degree: number): string {
  return DEGREES.find((d) => d.value === degree)?.label ?? "Desconhecido";
}

export function degreeSymbol(degree: number): string {
  return DEGREES.find((d) => d.value === degree)?.symbol ?? "?";
}
