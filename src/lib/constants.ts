export const OPERATION_TYPES = [
  { value: "compra", label: "Compra" },
  { value: "venda", label: "Venda" },
  { value: "dividendo", label: "Dividendo" },
  { value: "jcp", label: "JCP" },
  { value: "rendimento", label: "Rendimento" },
  { value: "desdobramento", label: "Desdobramento" },
  { value: "grupamento", label: "Grupamento" },
  { value: "bonificacao", label: "Bonificação" },
  { value: "amortizacao", label: "Amortização" },
  { value: "aporte", label: "Aporte" },
  { value: "resgate", label: "Resgate" },
  { value: "transferencia", label: "Transferência" },
  { value: "conversao_cambial", label: "Conversão Cambial" },
] as const;

export type OperationType = (typeof OPERATION_TYPES)[number]["value"];

export const ASSET_CATEGORIES = [
  { value: "renda_variavel", label: "Renda Variável" },
  { value: "renda_fixa", label: "Renda Fixa" },
  { value: "fundos", label: "Fundos" },
  { value: "cripto", label: "Criptomoeda" },
  { value: "moeda", label: "Moeda" },
  { value: "saldo", label: "Saldo" },
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number]["value"];

export const PORTFOLIO_TYPES = ["personal", "family"] as const;
export type PortfolioType = (typeof PORTFOLIO_TYPES)[number];

export const PROJECT_RECURRENCES = [
  { value: "once", label: "Único" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
] as const;

export const INDEXERS = [
  { value: "CDI", label: "CDI" },
  { value: "IPCA", label: "IPCA+" },
  { value: "PRE", label: "Prefixado" },
  { value: "SELIC", label: "Selic" },
] as const;

export const NOTIFICATION_TYPES = [
  "maturity",
  "project_alert",
  "stop_gain",
  "stop_loss",
  "general",
] as const;
