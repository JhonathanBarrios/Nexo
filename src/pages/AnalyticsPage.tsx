import { useState, useEffect, useMemo } from 'react';
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
} from 'recharts';
import { TrendingUp, Calendar, Target, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { convertToMonthly, type BudgetPeriod } from '../utils/budget';
import { useTransactions, type TransactionsFilters } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useCategoryBudgets } from '../hooks/useCategoryBudgets';
import { useRecurringPayments } from '../hooks/useRecurringPayments';

type DateFilter = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom';

export default function AnalyticsPage() {
  // Filtros por defecto para analytics (cargar más datos para análisis)
  const defaultFilters: TransactionsFilters = {
    page: 1,
    pageSize: 1000, // Límite alto para análisis
    sortBy: 'date',
    sortOrder: 'desc',
  };
  const { transactions } = useTransactions(defaultFilters);
  const { categories } = useCategories();
  const { getBudgetForDate } = useCategoryBudgets();
  const { getAllVariableExpensesForCycle } = useRecurringPayments();
  
  const memoizedCategories = useMemo(() => categories, [categories]);
  
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [categoryTrendsData, setCategoryTrendsData] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [budgetAlerts, setBudgetAlerts] = useState<any[]>([]);

  // Calcular el rango de la quincena actual (fijo: 1-15, 16-fin de mes)
  const getCurrentBudgetCycle = () => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let startDate: Date;
    let endDate: Date;

    if (currentDay <= 15) {
      // Primera quincena: 1-15
      startDate = new Date(currentYear, currentMonth, 1);
      endDate = new Date(currentYear, currentMonth, 15);
    } else {
      // Segunda quincena: 16-fin de mes
      startDate = new Date(currentYear, currentMonth, 16);
      endDate = new Date(currentYear, currentMonth + 1, 0); // Último día del mes
    }

    return { startDate, endDate };
  };

  // Filter transactions by date
  const filterTransactionsByDate = (txs: typeof transactions) => {
    const now = new Date();
    
    return txs.filter(t => {
      const transactionDate = new Date(t.date + 'T00:00:00');
      
      switch (dateFilter) {
        case 'this_month':
          return transactionDate.getMonth() === now.getMonth() && 
                 transactionDate.getFullYear() === now.getFullYear();
        case 'last_month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          return transactionDate >= lastMonth && transactionDate <= lastMonthEnd;
        case 'last_3_months':
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          return transactionDate >= threeMonthsAgo && transactionDate <= now;
        case 'this_year':
          return transactionDate.getFullYear() === now.getFullYear();
        case 'custom':
          if (!customStartDate || !customEndDate) return false;
          const start = new Date(customStartDate + 'T00:00:00');
          const end = new Date(customEndDate + 'T23:59:59');
          return transactionDate >= start && transactionDate <= end;
        default:
          return true;
      }
    });
  };

  const filteredTransactions = useMemo(() => filterTransactionsByDate(transactions), [transactions, dateFilter, customStartDate, customEndDate]);

  // Calcular categoryTrendsData de forma async cuando cambie el filtro
  useEffect(() => {
    const calculateCategoryTrendsAsync = async () => {
      if (isCalculating) return; // Evitar múltiples ejecuciones
      setIsCalculating(true);
      
      let startDate: Date;
      let endDate: Date;
      const now = new Date();
      
      switch (dateFilter) {
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'last_3_months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        case 'custom':
          startDate = new Date(customStartDate + 'T00:00:00');
          endDate = new Date(customEndDate + 'T23:59:59');
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      const data = await Promise.all(memoizedCategories.map(async (category) => {
        const periodTransactions = filteredTransactions.filter(t => {
          const date = new Date(t.date + 'T00:00:00');
          return t.category_id === category.id && 
                 t.type === 'expense' &&
                 date >= startDate && date <= endDate;
        });

        const actual = periodTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        
        // Para gráficos, usar presupuesto histórico si es "last_month"
        let presupuesto: number;
        
        if (dateFilter === 'last_month') {
          // Buscar presupuesto histórico para el mes anterior (ya viene en formato mensual)
          const historicalBudget = await getBudgetForDate(category.id, startDate);
          if (!historicalBudget) {
            return null; // No incluir si no hay presupuesto histórico
          }
          presupuesto = historicalBudget; // Ya es mensual
        } else if (dateFilter === 'this_month') {
          // Para mes actual, usar presupuesto mensual equivalente
          presupuesto = category.budget_monthly || 0;
        } else if (dateFilter === 'last_3_months') {
          presupuesto = (category.budget_monthly || 0) * 3;
        } else if (dateFilter === 'this_year') {
          presupuesto = (category.budget_monthly || 0) * 12;
        } else {
          const weeksInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
          presupuesto = (category.budget_monthly || 0) * (weeksInPeriod / 4);
        }
        
        const weeksInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
        const promedio = periodTransactions.length > 0 ? actual / weeksInPeriod : 0;

        return {
          category: category.name,
          actual: Math.round(actual),
          presupuesto: presupuesto,
          promedio: Math.round(promedio),
        };
      }));

      setCategoryTrendsData(data.filter(c => c && (c.actual > 0 || c.presupuesto > 0)));
      setIsCalculating(false);
    };

    calculateCategoryTrendsAsync();
  }, [dateFilter, memoizedCategories, filteredTransactions, customStartDate, customEndDate]);


  // Calcular datos reales
  const calculateMonthlyData = () => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    let startYear: number;
    let startMonth: number;
    let endYear: number;
    let endMonth: number;
    const now = new Date();
    
    switch (dateFilter) {
      case 'this_month':
        startYear = now.getFullYear();
        startMonth = now.getMonth();
        endYear = now.getFullYear();
        endMonth = now.getMonth();
        break;
      case 'last_month':
        startYear = now.getFullYear();
        startMonth = now.getMonth() - 1;
        endYear = now.getFullYear();
        endMonth = now.getMonth() - 1;
        break;
      case 'last_3_months':
        startYear = now.getFullYear();
        startMonth = now.getMonth() - 3;
        endYear = now.getFullYear();
        endMonth = now.getMonth();
        break;
      case 'this_year':
        startYear = now.getFullYear();
        startMonth = 0;
        endYear = now.getFullYear();
        endMonth = 11;
        break;
      case 'custom':
        const startDate = new Date(customStartDate + 'T00:00:00');
        const endDate = new Date(customEndDate + 'T23:59:59');
        startYear = startDate.getFullYear();
        startMonth = startDate.getMonth();
        endYear = endDate.getFullYear();
        endMonth = endDate.getMonth();
        break;
      default:
        startYear = now.getFullYear();
        startMonth = now.getMonth();
        endYear = now.getFullYear();
        endMonth = now.getMonth();
    }

    const monthlyData: any[] = [];
    
    // Iterar por cada mes en el rango
    let currentYear = startYear;
    let currentMonth = startMonth;
    
    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const monthTransactions = filteredTransactions.filter(t => {
        const date = new Date(t.date + 'T00:00:00');
        return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
      });

      const ingresos = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const gastos = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const monthLabel = currentYear === now.getFullYear() 
        ? months[currentMonth] 
        : `${months[currentMonth]} ${currentYear.toString().slice(-2)}`;

      monthlyData.push({
        month: monthLabel,
        ingresos,
        gastos,
        ahorro: ingresos - gastos,
      });

      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }

    // Filtrar meses con datos
    return monthlyData.filter(m => m.ingresos > 0 || m.gastos > 0);
  };

  const calculateSpendingPattern = () => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    // Calcular el número de semanas en el período
    let startDate: Date;
    let endDate: Date;
    const now = new Date();
    
    switch (dateFilter) {
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last_3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'custom':
        startDate = new Date(customStartDate + 'T00:00:00');
        endDate = new Date(customEndDate + 'T23:59:59');
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const weeksInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));

    return days.map((day, index) => {
      const dayTransactions = filteredTransactions.filter(t => {
        const date = new Date(t.date + 'T00:00:00');
        return t.type === 'expense' && date >= startDate && date <= endDate && date.getDay() === (index + 1) % 7;
      });

      const totalAmount = dayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const averageAmount = totalAmount / weeksInPeriod;
      
      return { day, amount: Math.round(averageAmount) };
    });
  };

  const calculateQuickStats = () => {
    let startDate: Date;
    let endDate: Date;
    const now = new Date();
    
    switch (dateFilter) {
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last_3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'custom':
        startDate = new Date(customStartDate + 'T00:00:00');
        endDate = new Date(customEndDate + 'T23:59:59');
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const periodTransactions = filteredTransactions.filter(t => {
      const date = new Date(t.date + 'T00:00:00');
      return date >= startDate && date <= endDate;
    });

    const ingresos = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const gastos = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const ahorro = ingresos - gastos;
    const tasaAhorro = ingresos > 0 ? ((ahorro / ingresos) * 100).toFixed(1) : '0';
    
    const daysInPeriod = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    const gastoPromedioDia = gastos / daysInPeriod;

    // Categorías en presupuesto (usar ciclo actual, no el filtro seleccionado)
    const { startDate: budgetStartDate, endDate: budgetEndDate } = getCurrentBudgetCycle();
    const categoriesWithBudget = memoizedCategories.filter(c => c.budget_amount && c.budget_amount > 0);
    const categoriesInBudget = categoriesWithBudget.filter(c => {
      const categoryTransactions = transactions.filter(t => {
        const date = new Date(t.date + 'T00:00:00');
        return t.category_id === c.id && t.type === 'expense' && date >= budgetStartDate && date <= budgetEndDate;
      });
      const spent = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Usar presupuesto quincenal exacto
      let budget: number;
      if (c.budget_period === 'biweekly') {
        budget = c.budget_amount || 0;
      } else {
        const monthlyBudget = convertToMonthly(c.budget_amount || 0, c.budget_period as BudgetPeriod);
        budget = monthlyBudget / 2; // Convertir mensual a quincenal (÷ 2)
      }
      
      return spent <= budget;
    });

    // Mayor gasto del período
    const expensesByCategory = memoizedCategories.map(c => {
      const categoryTransactions = periodTransactions.filter(t => t.category_id === c.id && t.type === 'expense');
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

  const calculateBudgetAlerts = async () => {
    // Usar el ciclo de presupuesto actual (independiente del filtro seleccionado)
    const { startDate, endDate } = getCurrentBudgetCycle();
    
    const periodTransactions = filteredTransactions.filter(t => {
      const date = new Date(t.date + 'T00:00:00');
      return date >= startDate && date <= endDate;
    });

    // Obtener tracking de pagos recurrentes variables para el ciclo actual
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const variableExpenses = await getAllVariableExpensesForCycle(startDateStr, endDateStr);

    return memoizedCategories
      .filter(c => c.budget_amount && c.budget_amount > 0)
      .map(category => {
        const categoryTransactions = periodTransactions.filter(t => t.category_id === category.id && t.type === 'expense');
        const spent = categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        
        // Sumar tracking de pagos recurrentes variables
        const variableTracking = variableExpenses[category.id] || 0;
        const totalSpent = spent + variableTracking;
        
        // Para presupuesto quincenal, usar el presupuesto original (no convertir)
        // Para otros períodos, convertir a quincenal para comparación
        let budget: number;
        if (category.budget_period === 'biweekly') {
          budget = category.budget_amount || 0; // Presupuesto quincenal exacto
        } else {
          // Convertir otros períodos a quincenal para comparación
          const monthlyBudget = convertToMonthly(category.budget_amount || 0, category.budget_period as BudgetPeriod);
          budget = monthlyBudget / 2; // Convertir mensual a quincenal (÷ 2)
        }
        
        const percentage = budget > 0 ? (totalSpent / budget) * 100 : 0;
        const difference = totalSpent - budget;

        return {
          category: category.name,
          spent: Math.round(totalSpent),
          budget: Math.round(budget),
          percentage: percentage.toFixed(0),
          difference: Math.round(difference),
        };
      })
      .filter(c => c.spent > 0)
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
  };

  const monthlyComparison = calculateMonthlyData();
  const categoryTrends = categoryTrendsData;
  const spendingPattern = calculateSpendingPattern();
  const quickStats = calculateQuickStats();

  // Calcular budgetAlerts de forma async
  useEffect(() => {
    const fetchBudgetAlerts = async () => {
      const alerts = await calculateBudgetAlerts();
      setBudgetAlerts(alerts);
    };
    fetchBudgetAlerts();
  }, [transactions, memoizedCategories, dateFilter]);
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
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-800/50">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Período:</span>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
              <button
                onClick={() => setDateFilter('this_month')}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  dateFilter === 'this_month'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                Este Mes
              </button>
              <button
                onClick={() => setDateFilter('last_month')}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  dateFilter === 'last_month'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                Mes Pasado
              </button>
              <button
                onClick={() => setDateFilter('last_3_months')}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  dateFilter === 'last_3_months'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                Últimos 3 Meses
              </button>
              <button
                onClick={() => setDateFilter('this_year')}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  dateFilter === 'this_year'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                Este Año
              </button>
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  dateFilter === 'custom'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                Personalizado
              </button>
            </div>
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 mt-2 md:mt-0">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-slate-400">a</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50 shadow-xl"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Tasa de Ahorro</p>
              <h3 className="text-white text-3xl font-bold">{quickStats.tasaAhorro}%</h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
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
          whileHover={{ y: -4 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50 shadow-xl"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Gasto Promedio/Día</p>
              <h3 className="text-white text-3xl font-bold">{formatCurrency(quickStats.gastoPromedioDia)}</h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
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
          whileHover={{ y: -4 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50 shadow-xl"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Categorías en Presupuesto</p>
              <h3 className="text-white text-3xl font-bold">{quickStats.categoriesInBudget}</h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
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
          whileHover={{ y: -4 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50 shadow-xl"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Mayor Gasto del Mes</p>
              <h3 className="text-white text-3xl font-bold">${quickStats.mayorGasto.amount.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
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
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-800/50"
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
                      Has gastado {formatCurrency(alert.spent)} de {formatCurrency(alert.budget)} presupuestados ({alert.percentage}%)
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
                      {alert.difference > 0 ? `+${formatCurrency(alert.difference)}` : `-${formatCurrency(Math.abs(alert.difference))}`}
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
