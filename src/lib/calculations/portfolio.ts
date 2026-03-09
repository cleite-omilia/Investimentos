/**
 * Funções de cálculo de posição de ativos.
 * Todos os valores monetários são em centavos (inteiros).
 */

interface Operation {
  type: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  fees: number;
  splitFactor?: number | null;
}

/**
 * Calcula a quantidade atual a partir de todas as operações.
 * Compra/bonificação/desdobramento aumentam. Venda/grupamento diminuem.
 */
export function calculateQuantity(operations: Operation[]): number {
  let quantity = 0;

  for (const op of operations) {
    switch (op.type) {
      case "compra":
      case "aporte":
      case "bonificacao":
        quantity += op.quantity;
        break;
      case "venda":
      case "resgate":
        quantity -= op.quantity;
        break;
      case "desdobramento":
        if (op.splitFactor && op.splitFactor > 0) {
          quantity = quantity * op.splitFactor;
        }
        break;
      case "grupamento":
        if (op.splitFactor && op.splitFactor > 0) {
          quantity = quantity / op.splitFactor;
        }
        break;
      // transferencia, dividendo, jcp, rendimento, amortizacao não alteram quantidade
      default:
        break;
    }
  }

  return quantity;
}

/**
 * Calcula o total investido (soma das compras - soma das vendas) em centavos.
 */
export function calculateTotalInvested(operations: Operation[]): number {
  let totalInvested = 0;

  for (const op of operations) {
    switch (op.type) {
      case "compra":
      case "aporte":
        totalInvested += op.totalAmount + op.fees;
        break;
      case "venda":
      case "resgate":
        totalInvested -= op.totalAmount - op.fees;
        break;
      default:
        break;
    }
  }

  return totalInvested;
}

/**
 * Calcula o preço médio de compra em centavos.
 * Usa método da média ponderada.
 */
export function calculateAveragePrice(operations: Operation[]): number {
  let totalQuantity = 0;
  let totalCost = 0;

  for (const op of operations) {
    switch (op.type) {
      case "compra":
      case "aporte":
      case "bonificacao": {
        const cost = op.totalAmount + op.fees;
        totalCost += cost;
        totalQuantity += op.quantity;
        break;
      }
      case "venda":
      case "resgate": {
        if (totalQuantity > 0) {
          const avgBefore = totalCost / totalQuantity;
          totalQuantity -= op.quantity;
          totalCost = avgBefore * totalQuantity;
        }
        break;
      }
      case "desdobramento": {
        if (op.splitFactor && op.splitFactor > 0) {
          totalQuantity = totalQuantity * op.splitFactor;
          // custo total permanece, preço médio diminui
        }
        break;
      }
      case "grupamento": {
        if (op.splitFactor && op.splitFactor > 0) {
          totalQuantity = totalQuantity / op.splitFactor;
          // custo total permanece, preço médio aumenta
        }
        break;
      }
      default:
        break;
    }
  }

  if (totalQuantity <= 0) return 0;
  return Math.round(totalCost / totalQuantity);
}
