import { useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { TrendingUp, Calendar, Target, AlertCircle, CheckCircle } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';

export default function AnalyticsPage() {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Filtrar transacciones por fecha
  const getFilteredTransactions = () => {
    if (!filterStartDate && !filterEndDate) {
      return transactions;
    }
    
    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const matchesStartDate = !filterStartDate || transactionDate >= new Date(filterStartDate);
      const matchesEndDate = !filterEndDate || transactionDate <= new Date(filterEndDate);
      return matchesStartDate && matchesEndDate;
    });
  };

  const filteredTransactions = getFilteredTransactions();

  // Calcular datos reales
  const calculateMonthlyData = () => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentYear = new Date().getFullYear();
    
    const monthlyData = months.map((month, index) => {
      const monthTransactions = filteredTransactions.filter(t => {
        const date = new Date(t.date);
        return date.getFullYear() === currentYear && date.getMonth() === index;
      });

      const ingresos = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const gastos = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        month,
        ingresos,
        gastos,
        ahorro: ingresos - gastos,
      };
    });

    // Filtrar meses con datos
    return monthlyData.filter(m => m.ingresos > 0 || m.gastos > 0);
  };

  const calculateCategoryTrends = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return categories.map(category => {
      const currentMonthTransactions = filteredTransactions.filter(t => {
        const date = new Date(t.date);
        return t.category_id === category.id && 
               t.type === 'expense' &&
               date.getMonth() === currentMonth &&
               date.getFullYear() === currentYear;
      });

      const actual = currentMonthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const presupuesto = category.budget_monthly || 0;
      
      // Calcular promedio de los últimos 3 meses
      const last3MonthsTransactions = filteredTransactions.filter(t => {
        const date = new Date(t.date);
        const monthsDiff = (currentYear - date.getFullYear()) * 12 + (currentMonth - date.getMonth());
        return t.category_id === category.id && 
               t.type === 'expense' &&
               monthsDiff >= 0 && monthsDiff < 3;
      });
      
      const promedio = last3MonthsTransactions.length > 0 
        ? last3MonthsTransactions.reduce((sum, t) => sum + Number(t.amount), 0) / 3 
        : 0;

      return {
        category: category.name,
        actual: Math.round(actual),
        presupuesto,
        promedio: Math.round(promedio),
      };
    }).filter(c => c.actual > 0 || c.presupuesto > 0);
  };

  const calculateSpendingPattern = () => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const currentWeek = new Date();
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Monday

    return days.map((day, index) => {
      const dayTransactions = filteredTransactions.filter(t => {
        const date = new Date(t.date);
        return t.type === 'expense' && date.getDay() === (index + 1) % 7;
      });

      const amount = dayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      return { day, amount };
    });
  };

  const calculateRadarData = () => {
    const maxAmount = Math.max(...categories.map(c => {
      const categoryTransactions = filteredTransactions.filter(t => t.category_id === c.id && t.type === 'expense');
      return categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    }), 1);

    return categories.slice(0, 6).map(category => {
      const categoryTransactions = filteredTransactions.filter(t => t.category_id === category.id && t.type === 'expense');
      const amount = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const normalized = Math.round((amount / maxAmount) * 150);
      
      return {
        subject: category.name,
        A: normalized,
        fullMark: 150,
      };
    });
  };

  const calculateQuickStats = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthTransactions = filteredTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const ingresos = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const gastos = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const ahorro = ingresos - gastos;
    const tasaAhorro = ingresos > 0 ? ((ahorro / ingresos) * 100).toFixed(1) : '0';
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const gastoPromedioDia = gastos / daysInMonth;

    // Categorías en presupuesto
    const categoriesWithBudget = categories.filter(c => c.budget_monthly && c.budget_monthly > 0);
    const categoriesInBudget = categoriesWithBudget.filter(c => {
      const categoryTransactions = currentMonthTransactions.filter(t => t.category_id === c.id && t.type === 'expense');
      const spent = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      return spent <= (c.budget_monthly || 0);
    });

    // Mayor gasto del mes
    const expensesByCategory = categories.map(c => {
      const categoryTransactions = currentMonthTransactions.filter(t => t.category_id === c.id && t.type === 'expense');
      const spent = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      return { category: c.name, amount: spent };
    }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

    const mayorGasto = expensesByCategory.length > 0 ? expensesByCategory[0] : { category: 'N/A', amount: 0 };

    return {
      tasaAhorro,
      gastoPromedioDia: Math.round(gastoPromedioDia),
      categoriesInBudget: `${categoriesInBudget.length}/${categoriesWithBudget.length}`,
      categoriesCompliance: categoriesWithBudget.length > 0 
        ? ((categoriesInBudget.length / categoriesWithBudget.length) * 100).toFixed(1)
        : '0',
      mayorGasto,
    };
  };

  const calculateBudgetAlerts = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthTransactions = filteredTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    return categories
      .filter(c => c.budget_monthly && c.budget_monthly > 0)
      .map(category => {
        const categoryTransactions = currentMonthTransactions.filter(t => t.category_id === category.id && t.type === 'expense');
        const spent = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const percentage = (spent / category.budget_monthly) * 100;
        const difference = spent - category.budget_monthly;

        return {
          category: category.name,
          spent: Math.round(spent),
          budget: category.budget_monthly,
          percentage: percentage.toFixed(0),
          difference: Math.round(difference),
        };
      })
      .filter(c => c.spent > 0)
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
  };

  const monthlyComparison = calculateMonthlyData();
  const categoryTrends = calculateCategoryTrends();
  const spendingPattern = calculateSpendingPattern();
  const radarData = calculateRadarData();
  const quickStats = calculateQuickStats();
  const budgetAlerts = calculateBudgetAlerts();
  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-white text-3xl font-bold mb-2">Análisis Financiero</h1>
        <p className="text-slate-400">
          Análisis detallado de tus patrones de gasto y ahorro
        </p>
      </motion.div>

      {/* Date Filters */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Desde</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fecha Hasta</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Tasa de Ahorro</p>
              <h3 className="text-white text-3xl font-bold">{quickStats.tasaAhorro}%</h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">vs mes anterior</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Gasto Promedio/Día</p>
              <h3 className="text-white text-3xl font-bold">${quickStats.gastoPromedioDia}</h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">vs mes anterior</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Categorías en Presupuesto</p>
              <h3 className="text-white text-3xl font-bold">{quickStats.categoriesInBudget}</h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">{quickStats.categoriesCompliance}% cumplimiento</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Mayor Gasto del Mes</p>
              <h3 className="text-white text-3xl font-bold">${quickStats.mayorGasto.amount.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">{quickStats.mayorGasto.category}</span>
          </div>
        </motion.div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50"
        >
          <h3 className="text-white text-lg font-semibold mb-6">Comparativa Mensual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              <Legend />
              <Bar dataKey="ingresos" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="gastos" fill="#ef4444" radius={[8, 8, 0, 0]} />
              <Bar dataKey="ahorro" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Spending Pattern */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50"
        >
          <h3 className="text-white text-lg font-semibold mb-6">
            Patrón de Gasto Semanal
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={spendingPattern}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Budget vs Actual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="lg:col-span-2 bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50"
        >
          <h3 className="text-white text-lg font-semibold mb-6">
            Presupuesto vs Gasto Real por Categoría
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={categoryTrends} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="category" type="category" stroke="#94a3b8" width={120} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              <Legend />
              <Bar dataKey="presupuesto" fill="#6366f1" radius={[0, 8, 8, 0]} />
              <Bar dataKey="actual" fill="#f59e0b" radius={[0, 8, 8, 0]} />
              <Bar dataKey="promedio" fill="#10b981" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Spending Distribution Radar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50"
        >
          <h3 className="text-white text-lg font-semibold mb-6">
            Distribución de Gastos
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" stroke="#94a3b8" />
              <PolarRadiusAxis stroke="#94a3b8" />
              <Radar
                name="Gastos"
                dataKey="A"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Budget Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50"
      >
        <h3 className="text-white text-lg font-semibold mb-6">Alertas de Presupuesto</h3>
        <div className="space-y-4">
          {budgetAlerts.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No hay alertas de presupuesto para mostrar
            </div>
          ) : (
            budgetAlerts.map((alert) => {
              const isOverBudget = parseFloat(alert.percentage) > 100;
              const isNearLimit = parseFloat(alert.percentage) >= 80 && parseFloat(alert.percentage) <= 100;

              return (
                <div
                  key={alert.category}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    isOverBudget
                      ? 'bg-red-500/10 border border-red-500/30'
                      : isNearLimit
                      ? 'bg-yellow-500/10 border border-yellow-500/30'
                      : 'bg-green-500/10 border border-green-500/30'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isOverBudget
                        ? 'bg-red-500/20'
                        : isNearLimit
                        ? 'bg-yellow-500/20'
                        : 'bg-green-500/20'
                    }`}
                  >
                    {isOverBudget || isNearLimit ? (
                      <AlertCircle
                        className={`w-6 h-6 ${
                          isOverBudget ? 'text-red-400' : 'text-yellow-400'
                        }`}
                      />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{alert.category}</p>
                    <p className="text-slate-400 text-sm">
                      Has gastado ${alert.spent} de ${alert.budget} presupuestados ({alert.percentage}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-bold ${
                        isOverBudget
                          ? 'text-red-400'
                          : isNearLimit
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }`}
                    >
                      {alert.difference > 0 ? `+$${alert.difference}` : `-$${Math.abs(alert.difference)}`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

      {/* Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="mt-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-white font-semibold text-lg mb-2">💡 Insights de IA</h4>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>
                  Tus gastos de fin de semana son 40% más altos que entre semana. Considera
                  establecer un presupuesto específico para fines de semana.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>
                  Has mejorado tu tasa de ahorro en un 5.2% este mes. Si mantienes este ritmo,
                  alcanzarás tu meta anual.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>
                  El gasto en transporte ha excedido el presupuesto. Considera opciones como
                  transporte público o carpool.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
