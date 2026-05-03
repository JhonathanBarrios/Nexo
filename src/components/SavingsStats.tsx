import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Flame, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import type { SavingsAccount, SavingsProgress } from '../hooks/useSavingsAccounts';

interface SavingsStatsProps {
  account: SavingsAccount;
  progress: SavingsProgress;
  monthlyData: { month: number; saved: number; ideal: number }[];
  year: number;
}

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function SavingsStats({ account, progress, monthlyData, year }: SavingsStatsProps) {
  const percentCurrentPeriod = progress.expectedDeposits > 0
    ? (progress.actualSavedPerPeriod / progress.idealSavedPerPeriod) * 100
    : 0;

  const chartData = monthlyData.map((d) => ({
    month: monthNames[d.month - 1],
    Ahorrado: d.saved,
    Ideal: d.ideal,
    acumulado: d.saved > 0
      ? monthlyData.slice(0, monthlyData.indexOf(d) + 1).reduce((sum, md) => sum + md.saved, 0)
      : 0,
  }));

  const cumulativeData = monthlyData.reduce((acc, d, idx) => {
    const prevTotal = idx > 0 ? acc[idx - 1].acumulado : 0;
    acc.push({
      month: monthNames[idx],
      acumulado: prevTotal + d.saved,
    });
    return acc;
  }, [] as { month: string; acumulado: number }[]);

  return (
    <div className="space-y-6">
      {account.is_goal_based ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-slate-400 text-sm">Período Actual</span>
              </div>
              <p className="text-white text-xl font-bold">
                {progress.currentPeriod} / {progress.expectedDeposits}
              </p>
              <p className="text-slate-500 text-xs mt-1">depósitos esperados</p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-slate-400 text-sm">Racha</span>
              </div>
              <p className="text-white text-xl font-bold">{progress.streak}</p>
              <p className="text-slate-500 text-xs mt-1">períodos consecutivos</p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 text-sm">Este Período</span>
              </div>
              <p className={`text-xl font-bold ${percentCurrentPeriod >= 100 ? 'text-emerald-400' : percentCurrentPeriod >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                {percentCurrentPeriod.toFixed(0)}%
              </p>
              <p className="text-slate-500 text-xs mt-1">de la meta</p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-white font-semibold mb-4">Progreso por Período</h3>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">
                Período {progress.currentPeriod} - Meta: {formatCurrency(progress.idealSavedPerPeriod)}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min(percentCurrentPeriod, 100)}%`,
                  backgroundColor: percentCurrentPeriod >= 100 ? '#10b981' : percentCurrentPeriod >= 50 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Ideal: {formatCurrency(progress.idealSavedPerPeriod * (progress.currentPeriod - 1) + progress.idealSavedPerPeriod)}</span>
              <span>Real: {formatCurrency(progress.actualSavedPerPeriod * progress.currentPeriod)}</span>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-white font-semibold mb-4">Evolución Mensual - {year}</h3>
            {chartData.some((d) => d.Ahorrado > 0 || d.Ideal > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                    formatter={(value) => formatCurrency(Number(value) || 0)}
                  />
                  <Bar dataKey="Ideal" fill="#6366f1" opacity={0.3} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ahorrado" fill="#10b981" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Ahorrado >= entry.Ideal ? '#10b981' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-500">
                No hay datos de ahorro para mostrar
              </div>
            )}
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-400 text-xs">Cumplido</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span className="text-slate-400 text-xs">Por debajo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full opacity-30"></div>
                <span className="text-slate-400 text-xs">Meta ideal</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-white font-semibold mb-4">Comparativa Mes a Mes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2">Mes</th>
                    <th className="text-right py-2">Ahorrado</th>
                    <th className="text-right py-2">Meta</th>
                    <th className="text-right py-2">% Cumplimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((d, idx) => {
                    const percent = d.Ideal > 0 ? (d.Ahorrado / d.Ideal) * 100 : 0;
                    return (
                      <tr key={idx} className="border-b border-slate-700/50">
                        <td className="py-2 text-white">{d.month}</td>
                        <td className="py-2 text-right text-emerald-400">{formatCurrency(d.Ahorrado)}</td>
                        <td className="py-2 text-right text-slate-400">{formatCurrency(d.Ideal)}</td>
                        <td className={`py-2 text-right ${percent >= 100 ? 'text-emerald-400' : percent >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                          {d.Ideal > 0 ? `${percent.toFixed(0)}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-white font-semibold mb-4">Evolución del Ahorro - {year}</h3>
              {cumulativeData.some((d) => d.acumulado > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                      formatter={(value) => formatCurrency(Number(value) || 0)}
                    />
                    <Line
                      type="monotone"
                      dataKey="acumulado"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-500">
                  No hay depósitos aún
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="text-white font-semibold mb-4">Depósitos por Mes - {year}</h3>
              {monthlyData.some((d) => d.saved > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData.map((d) => ({
                    month: monthNames[d.month - 1],
                    Ahorrado: d.saved,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                      formatter={(value) => formatCurrency(Number(value) || 0)}
                    />
                    <Bar dataKey="Ahorrado" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-500">
                  No hay depósitos aún
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
