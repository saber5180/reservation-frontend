/** Numéro réservé accès praticien (chiffres uniquement) — aligné sur CABINET_ACCESS_PHONE côté API. */
export function getCabinetAccessDigits(): string {
  const raw = import.meta.env.VITE_CABINET_ACCESS_PHONE as string | undefined;
  return (raw ?? '123456').replace(/\D/g, '');
}

export function isCabinetAccessPhone(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  const expected = getCabinetAccessDigits();
  return expected.length > 0 && digits === expected;
}
