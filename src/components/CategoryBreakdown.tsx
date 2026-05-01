import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Transaction } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency } from '../utils/currency';

interface CategoryBreakdownProps {
  transactions: Transaction[];
}

const categoryColors: Record<string, string> = {
  'Alimentación': '#3b82f6',
  'Transporte': '#8b5cf6',
  'Vivienda': '#ec4899',
  'Entretenimiento': '#10b981',
  'Salud': '#f59e0b',
  'Educación': '#06b6d4',
  'Compras': '#f97316',
  'Otros': '#6366f1',
};

export function CategoryBreakdown({ transactions }: CategoryBreakdownProps) {
  const { categories } = useCategories();

  // Agrupar gastos por categoría
  const categoryData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const categoryName = categories.find(c => c.id === t.category_id)?.name || 'Sin categoría';
      acc[categoryName] = (acc[categoryName] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const data = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
    color: categoryColors[name] || categoryColors['Otros'],
  }));

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  // Si no hay datos, mostrar mensaje
  if (data.length === 0) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50 shadow-xl">
        <h3 className="text-white text-base md:text-lg font-semibold mb-4 md:mb-6">Gastos por Categoría</h3>
        <div className="flex items-center justify-center h-48 text-slate-400">
          No hay gastos registrados
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-slate-800/50 shadow-xl">
      <h3 className="text-white text-base md:text-lg font-semibold mb-4 md:mb-6">Gastos por Categoría</h3>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-full md:w-1/2">
          <ResponsiveContainer width="100%" height={250} minHeight={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full md:w-1/2 flex flex-col gap-2 md:gap-3">
          {data.map((category) => {
            const percentage = ((category.value / totalValue) * 100).toFixed(1);
            return (
              <div key={category.name} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                ></div>
                <span className="text-slate-400 text-xs md:text-sm truncate flex-1">{category.name}</span>
                <span className="text-slate-500 text-xs md:text-sm w-12 text-right flex-shrink-0">{percentage}%</span>
                <span className="text-white text-xs md:text-sm font-medium w-20 text-right flex-shrink-0">
                  {formatCurrency(category.value).replace('COP', '').trim()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
