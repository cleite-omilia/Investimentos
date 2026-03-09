const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Formata centavos para BRL (ex: 150000 → R$ 1.500,00) */
export function formatCurrency(centavos: number): string {
  return brlFormatter.format(centavos / 100);
}

/** Formata um número decimal como porcentagem (ex: 0.1523 → 15,23%) */
export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

/** Formata uma porcentagem já em formato percentual (ex: 15.23 → 15,23%) */
export function formatPercentValue(value: number): string {
  return percentFormatter.format(value / 100);
}

/** Formata uma data ISO para dd/mm/yyyy */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

/** Formata uma data ISO para dd/mm/yyyy hh:mm */
export function formatDateTime(isoDate: string): string {
  return dateTimeFormatter.format(new Date(isoDate));
}

/** Formata número com separadores brasileiros */
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
