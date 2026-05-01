import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Transaction } from '../hooks/useTransactions';

interface ExpenseChartProps {
  transactions: Transaction[];
}

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function ExpenseChart({ transactions }: ExpenseChartProps) {
  // Agrupar transacciones por mes
  const monthlyData = transactions.reduce((acc, t) => {
    const date = new Date(t.date);
    const month = date.getMonth();
    const year = date.getFullYear();
    const key = `${year}-${month}`;
    
    if (!acc[key]) {
      acc[key] = { month: monthNames[month], ingresos: 0, gastos: 0 };
    }
    
    if (t.type === 'income') {
      acc[key].ingresos += Number(t.amount);
    } else {
      acc[key].gastos += Number(t.amount);
    }
    
    return acc;
  }, {} as Record<string, { month: string; ingresos: number; gastos: number }>);

  const data = Object.values(monthlyData);

  // Si no hay datos, mostrar datos de ejemplo
  const chartData = data.length > 0 ? data : [
    { month: 'Ene', ingresos: 0, gastos: 0 },
    { month: 'Feb', ingresos: 0, gastos: 0 },
    { month: 'Mar', ingresos: 0, gastos: 0 },
  ];

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50 shadow-xl">
      <h3 className="text-white text-base md:text-lg font-semibold mb-4 md:mb-6">Flujo de Caja</h3>
      <ResponsiveContainer width="100%" height={250} minHeight={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
          <Area
            type="monotone"
            dataKey="ingresos"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#colorIngresos)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="gastos"
            stroke="#ef4444"
            fillOpacity={1}
            fill="url(#colorGastos)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 md:gap-6 mt-3 md:mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-slate-400 text-xs md:text-sm">Ingresos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-slate-400 text-xs md:text-sm">Gastos</span>
        </div>
      </div>
    </div>
  );
}
