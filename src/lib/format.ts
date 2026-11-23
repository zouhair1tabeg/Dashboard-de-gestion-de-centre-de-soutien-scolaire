const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Numeric = number | string | { toString(): string };

function toNumber(value: Numeric): number {
  return Number(value.toString());
}

/** Formate un montant en dirhams : « 1 250,00 DH ». */
export function formatCurrency(value: Numeric): string {
  return `${currencyFormatter.format(toNumber(value))} DH`;
}

/** Formate une date en JJ/MM/AAAA (les dates métier sont stockées sans heure). */
export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Convertit une date en valeur pour un <input type="date">. */
export function toDateInputValue(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return date.toISOString().slice(0, 10);
}

/** Date du jour au format AAAA-MM-JJ (fuseau du Maroc). */
export function todayInputValue(): string {
  const now = new Date();
  const moroccoDate = new Date(now.getTime() + 60 * 60 * 1000);

  return moroccoDate.toISOString().slice(0, 10);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)} %`;
}

const dhFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formate un montant en dirhams : « 5 090 DH » (espace insécable fine). */
export function formatDH(amount: number): string {
  return `${dhFormatter.format(amount)} DH`;
}
