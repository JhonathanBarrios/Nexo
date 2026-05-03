import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PiggyBank,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  CheckCircle,
  MoreVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSavingsAccounts, type SavingsAccount } from '../hooks/useSavingsAccounts';
import { useAuthStore } from '../store/authStore';
import { useTransactions } from '../hooks/useTransactions';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import SavingsAccountModal from '../components/SavingsAccountModal';
import SavingsDepositModal from '../components/SavingsDepositModal';
import SavingsStats from '../components/SavingsStats';
import { formatCurrency } from '../utils/currency';

const frequencyLabels = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};

export default function SavingsPage() {
  const { 
    accounts, 
    deposits,
    createDeposit,
    createAccount,
    updateAccount,
    deleteAccount,
    markAsCompleted,
    getProgress,
    getTotalSavings,
    getMonthlyStats,
    calculateGoalPerPeriod
  } = useSavingsAccounts();
  const { createTransaction } = useTransactions();
  const { user } = useAuthStore();

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SavingsAccount | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<SavingsAccount | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    onConfirm: () => void;
    title: string;
    message: string;
  }>({
    isOpen: false,
    onConfirm: () => {},
    title: '',
    message: '',
  });
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const totalSavings = getTotalSavings();

  const handleCreateAccount = async (accountData: any) => {
    if (!user?.id) return;

    try {
      await createAccount({
        user_id: user.id,
        name: accountData.name,
        is_goal_based: accountData.is_goal_based,
        goal_amount: accountData.goal_amount,
        goal_duration_months: accountData.goal_duration_months,
        frequency: accountData.frequency,
        deposit_day: accountData.deposit_day,
        start_date: accountData.start_date,
        color: accountData.color,
        icon: accountData.icon || 'piggy-bank',
        is_active: true,
      });
      toast.success('Bolsillo de ahorro creado correctamente');
      setShowAccountModal(false);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleUpdateAccount = async (accountData: any) => {
    if (!editingAccount) return;

    try {
      await updateAccount(editingAccount.id, {
        name: accountData.name,
        goal_amount: accountData.goal_amount,
        goal_duration_months: accountData.goal_duration_months,
        frequency: accountData.frequency,
        deposit_day: accountData.deposit_day,
        start_date: accountData.start_date,
        color: accountData.color,
      });
      toast.success('Bolsillo actualizado correctamente');
      setShowAccountModal(false);
      setEditingAccount(null);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleDeleteAccount = (account: SavingsAccount) => {
    setConfirmDialog({
      isOpen: true,
      onConfirm: async () => {
        await deleteAccount(account.id);
        toast.success('Bolsillo eliminado correctamente');
        if (selectedAccount?.id === account.id) {
          setSelectedAccount(null);
        }
      },
      title: 'Eliminar Bolsillo',
      message: `¿Estás seguro de eliminar "${account.name}"? Esta acción no se puede deshacer.`,
    });
  };

  const handleMarkCompleted = async (account: SavingsAccount) => {
    try {
      await markAsCompleted(account.id);
      toast.success('¡Felicidades! Bolsillo marcado como completado');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleCreateDeposit = async (depositData: { amount: number; deposit_date: string; notes: string; source_card_id: string }) => {
    if (!selectedAccount || !user?.id) return;

    try {
      const progress = getProgress(selectedAccount.id);
      const periodNumber = progress?.currentPeriod || 1;

      // Crear el depósito en la cuenta de ahorro
      await createDeposit({
        user_id: user.id,
        savings_account_id: selectedAccount.id,
        amount: depositData.amount,
        deposit_date: depositData.deposit_date,
        period_number: periodNumber,
        notes: depositData.notes || null,
      });

      // Crear una transacción tipo 'expense' para descontar de la tarjeta origen
      await createTransaction({
        user_id: user.id,
        category_id: null,
        card_id: depositData.source_card_id,
        source_card_id: null,
        description: `Depósito a ${selectedAccount.name}`,
        amount: depositData.amount,
        type: 'expense',
        date: depositData.deposit_date,
        notes: depositData.notes || null,
      });

      toast.success('Depósito registrado correctamente');
      setShowDepositModal(false);
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleEditAccount = (account: SavingsAccount) => {
    setEditingAccount(account);
    setShowAccountModal(true);
  };

  const handleDepositClick = (account: SavingsAccount) => {
    setSelectedAccount(account);
    setShowDepositModal(true);
  };

  const handleStatsClick = (account: SavingsAccount) => {
    setExpandedAccount(expandedAccount === account.id ? null : account.id);
  };

  return (
    <div className="p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 lg:mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-white text-2xl lg:text-3xl font-bold mb-2">Ahorro</h1>
            <p className="text-slate-400 text-sm lg:text-base">
              Gestiona tus bolsillos de ahorro
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingAccount(null);
              setShowAccountModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuevo Bolsillo</span>
            <span className="sm:hidden">Nuevo</span>
          </motion.button>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 border border-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <PiggyBank className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Ahorrado</p>
                <p className="text-white text-2xl font-bold">{formatCurrency(totalSavings)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm">{accounts.filter(a => a.is_active).length} bolsillos activos</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="space-y-4">
        <AnimatePresence>
          {accounts.map((account) => {
            const progress = getProgress(account.id);
            const percentComplete = progress?.percentComplete || 0;
            const isExpanded = expandedAccount === account.id;
            const monthlyData = getMonthlyStats(account.id, new Date().getFullYear());

            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`bg-slate-900/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-800/50 ${
                  account.is_completed ? 'border-emerald-500/30' : ''
                }`}
              >
                <div className="p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: account.color }}
                      >
                        <PiggyBank className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold text-lg">{account.name}</p>
                          {account.is_completed && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Completado
                            </span>
                          )}
                          {!account.is_goal_based && (
                            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full">
                              Abierto
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm">
                          {account.is_goal_based
                            ? `${frequencyLabels[account.frequency!]} • Día ${account.deposit_day}`
                            : 'Sin meta fija'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!account.is_completed && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDepositClick(account)}
                            className="p-2 bg-emerald-500/20 rounded-lg hover:bg-emerald-500/30 transition-colors"
                            title="Registrar depósito"
                          >
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleStatsClick(account)}
                            className="p-2 bg-blue-500/20 rounded-lg hover:bg-blue-500/30 transition-colors"
                            title="Ver estadísticas"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-blue-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-blue-400" />
                            )}
                          </motion.button>
                        </>
                      )}
                      <div className="relative">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setActionMenuOpen(actionMenuOpen === account.id ? null : account.id)}
                          className="p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </motion.button>
                        <AnimatePresence>
                          {actionMenuOpen === account.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-xl border border-slate-700 shadow-xl z-10 overflow-hidden"
                            >
                              <button
                                onClick={() => {
                                  handleEditAccount(account);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-blue-400" />
                                <span className="text-slate-300 text-sm">Editar</span>
                              </button>
                              {!account.is_completed && (
                                <button
                                  onClick={() => {
                                    handleMarkCompleted(account);
                                    setActionMenuOpen(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                                  <span className="text-slate-300 text-sm">Marcar completado</span>
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  handleDeleteAccount(account);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                                <span className="text-slate-300 text-sm">Eliminar</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm">
                          {account.is_goal_based ? 'Ahorrado / Meta' : 'Total Guardado'}
                        </span>
                        {account.is_goal_based && (
                          <span
                            className={`text-xs font-medium ${
                              percentComplete >= 100 ? 'text-emerald-400' : 'text-slate-300'
                            }`}
                          >
                            {percentComplete.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-white text-2xl font-bold">
                        {formatCurrency(account.current_balance)}
                      </p>
                      {account.is_goal_based && (
                        <p className="text-slate-500 text-sm mt-1">
                          de {formatCurrency(account.goal_amount!)}
                        </p>
                      )}
                    </div>

                    {account.is_goal_based ? (
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex flex-col justify-center">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-400">Faltante</span>
                          <span className="text-amber-400 font-medium">
                            {formatCurrency(Math.max(0, account.goal_amount! - account.current_balance))}
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(percentComplete, 100)}%`,
                              backgroundColor: account.color,
                            }}
                          />
                        </div>
                        <p className="text-slate-500 text-xs mt-2">
                          {progress?.streak || 0} depósitos consecutivos
                        </p>
                      </div>
                    ) : (
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex flex-col justify-center">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-400">Depósitos</span>
                          <span className="text-white font-medium">
                            {deposits.get(account.id)?.length || 0}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs">
                          Promedio: {deposits.get(account.id)?.length
                            ? formatCurrency(account.current_balance / deposits.get(account.id)!.length)
                            : '$0'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && progress && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 lg:px-6 pb-4 lg:pb-6 pt-2 border-t border-slate-700/50"
                  >
                    <SavingsStats
                      account={account}
                      progress={progress}
                      monthlyData={monthlyData}
                      year={new Date().getFullYear()}
                    />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {accounts.length === 0 && (
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 border border-slate-800/50 text-center">
            <PiggyBank className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No hay bolsillos de ahorro</p>
            <p className="text-slate-500 text-sm mt-2">
              Crea tu primer bolsillo para comenzar a ahorrar
            </p>
          </div>
        )}
      </div>

      <SavingsAccountModal
        isOpen={showAccountModal}
        onClose={() => {
          setShowAccountModal(false);
          setEditingAccount(null);
        }}
        onSave={editingAccount ? handleUpdateAccount : handleCreateAccount}
        editingAccount={editingAccount}
      />

      {selectedAccount && (
        <SavingsDepositModal
          isOpen={showDepositModal}
          onClose={() => {
            setShowDepositModal(false);
            setSelectedAccount(null);
          }}
          onSave={handleCreateDeposit}
          account={selectedAccount}
          suggestedAmount={selectedAccount.is_goal_based ? calculateGoalPerPeriod(
            selectedAccount.goal_amount!,
            selectedAccount.goal_duration_months!,
            selectedAccount.frequency!
          ) : 0}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="danger"
      />
    </div>
  );
}
