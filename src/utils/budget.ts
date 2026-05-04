export type BudgetPeriod = 'biweekly' | 'monthly';

export const periodLabels: Record<BudgetPeriod, string> = {
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};

// Convertir presupuesto de un período a mensual
export function convertToMonthly(amount: number, period: BudgetPeriod): number {
  const multipliers: Record<BudgetPeriod, number> = {
    biweekly: 2, // 2 quincenas = 1 mes
    monthly: 1,
  };
  return amount * (multipliers[period] || 1);
}

// Convertir presupuesto mensual a otro período
export function convertFromMonthly(monthlyAmount: number, targetPeriod: BudgetPeriod): number {
  const dividers: Record<BudgetPeriod, number> = {
    biweekly: 2, // 1 mes ÷ 2 = 1 quincena
    monthly: 1,
  };
  return monthlyAmount / (dividers[targetPeriod] || 1);
}

// Calcular el gasto en un período específico
export function calculateSpentInPeriod(
  transactions: any[],
  period: BudgetPeriod,
  customStartDate?: Date
): number {
  const now = new Date();
  let startDate: Date;

  if (customStartDate) {
    startDate = customStartDate;
  } else {
    switch (period) {
      case 'biweekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 14);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  return transactions
    .filter(t => new Date(t.date) >= startDate)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}
