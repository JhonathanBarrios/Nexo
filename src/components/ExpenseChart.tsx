import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Legend } from 'recharts';
import type { Transaction } from '../hooks/useTransactions';

interface ExpenseChartProps {
  transactions: Transaction[];
}

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function ExpenseChart({ transactions }: ExpenseChartProps) {
  // Agrupar transacciones por mes y calcular balance
  const monthlyData = transactions.reduce((acc, t) => {
    const date = new Date(t.date);
    const month = date.getMonth();
    const year = date.getFullYear();
    const key = `${year}-${month}`;

    if (!acc[key]) {
      acc[key] = { month: monthNames[month], year, ingresos: 0, gastos: 0, balance: 0 };
    }

    if (t.type === 'income') {
      acc[key].ingresos += Number(t.amount);
    } else if (t.type === 'expense') {
      acc[key].gastos += Math.abs(Number(t.amount));
    }

    return acc;
  }, {} as Record<string, { month: string; year: number; ingresos: number; gastos: number; balance: number }>);

  // Calcular balance neto por mes (no acumulado) y ordenar cronológicamente
  const data = Object.values(monthlyData)
    .map(item => ({
      ...item,
      balance: item.ingresos - item.gastos,
    }))
    .sort((a, b) => {
      // Ordenar por año primero, luego por mes
      if (a.year !== b.year) {
        return a.year - b.year;
      }
      const monthA = monthNames.indexOf(a.month);
      const monthB = monthNames.indexOf(b.month);
      return monthA - monthB;
    });

  // Si no hay datos, mostrar datos de ejemplo
  const chartData = data.length > 0 ? data : [
    { month: 'Ene', ingresos: 0, gastos: 0, balance: 0 },
    { month: 'Feb', ingresos: 0, gastos: 0, balance: 0 },
    { month: 'Mar', ingresos: 0, gastos: 0, balance: 0 },
  ];

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50 shadow-xl">
      <h3 className="text-white text-base md:text-lg font-semibold mb-4 md:mb-6">Flujo de Caja</h3>
      <ResponsiveContainer width="100%" height={280} minHeight={220}>
        <BarChart data={chartData}>
          <defs>
            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tick={{ fontSize: 10 }} />
          <YAxis stroke="#94a3b8" fontSize={12} tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              color: '#fff',
              fontSize: 12,
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
          />
          <Bar
            dataKey="ingresos"
            stackId="flow"
            fill="url(#colorIngresos)"
            name="Ingresos"
          />
          <Bar
            dataKey="gastos"
            stackId="flow"
            fill="url(#colorGastos)"
            name="Gastos"
          />
          <Bar
            dataKey="balance"
            stackId="flow"
            fill="url(#colorBalance)"
            name="Balance Neto"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
