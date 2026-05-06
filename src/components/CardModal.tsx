import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: any) => void;
  editingCard: any;
}

export default function CardModal({ isOpen, onClose, onSave, editingCard }: CardModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    bank: '',
    type: 'credit' as 'credit' | 'debit' | 'cash',
    last_four: '',
    credit_limit: '',
    cut_date: '',
    payment_date: '',
    color: '#6366f1',
    icon: 'CreditCard',
    is_active: true,
  });

  const banks = [
    'Banco AV Villas',
    'Banco de Bogotá',
    'Banco de Occidente',
    'Banco Falabella',
    'Banco Popular',
    'Bancolombia',
    'BBVA',
    'Daviplata',
    'Davivienda',
    'Lulo',
    'Nequi',
    'Nu',
    'Otro',
  ];

  useEffect(() => {
    if (editingCard) {
      setFormData({
        name: editingCard.name || '',
        bank: editingCard.bank || '',
        type: editingCard.type || 'credit',
        last_four: editingCard.last_four || '',
        credit_limit: editingCard.credit_limit ? String(editingCard.credit_limit) : '',
        cut_date: editingCard.cut_date ? String(editingCard.cut_date) : '',
        payment_date: editingCard.payment_date ? String(editingCard.payment_date) : '',
        color: editingCard.color || '#6366f1',
        icon: editingCard.icon || 'CreditCard',
        is_active: editingCard.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        bank: '',
        type: 'credit',
        last_four: '',
        credit_limit: '',
        cut_date: '',
        payment_date: '',
        color: '#6366f1',
        icon: 'CreditCard',
        is_active: true,
      });
    }
  }, [editingCard, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.name.trim()) {
      toast.error('Por favor ingresa el nombre de la tarjeta');
      return;
    }
    if (formData.type !== 'cash' && !formData.bank) {
      toast.error('Por favor selecciona el banco');
      return;
    }
    if (formData.type !== 'cash' && (!formData.last_four || formData.last_four.length !== 4)) {
      toast.error('Por favor ingresa los últimos 4 dígitos de la tarjeta');
      return;
    }
    if (formData.type === 'credit' && !formData.credit_limit) {
      toast.error('Por favor ingresa el límite de crédito');
      return;
    }

    const cardData = {
      ...formData,
      credit_limit: formData.credit_limit ? Number(formData.credit_limit) : null,
      cut_date: formData.cut_date ? Number(formData.cut_date) : null,
      payment_date: formData.payment_date ? Number(formData.payment_date) : null,
      bank: formData.type === 'cash' ? 'Efectivo' : formData.bank,
      last_four: formData.type === 'cash' ? '0000' : formData.last_four,
    };

    onSave(cardData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-slate-900 rounded-2xl p-6 w-full max-w-lg border border-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">
                {editingCard ? 'Editar Tarjeta' : 'Nueva Tarjeta'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre de la Tarjeta
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Visa Principal"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Banco */}
              {formData.type !== 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Banco
                  </label>
                  <select
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar banco</option>
                    {banks.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tipo de Tarjeta
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['credit', 'debit', 'cash'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type as any })}
                      className={`px-4 py-3 rounded-xl font-medium transition-all ${
                        formData.type === type
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {type === 'credit' ? 'Crédito' : type === 'debit' ? 'Débito' : 'Efectivo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Últimos 4 dígitos */}
              {formData.type !== 'cash' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Últimos 4 Dígitos
                </label>
                <input
                  type="text"
                  value={formData.last_four}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setFormData({ ...formData, last_four: value });
                  }}
                  placeholder="1234"
                  maxLength={4}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              )}

              {/* Campos específicos para crédito */}
              {formData.type === 'credit' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Límite de Crédito
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={formData.credit_limit ? Number(formData.credit_limit).toLocaleString('es-CO') : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, credit_limit: value });
                        }}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Día de Corte
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.cut_date}
                        onChange={(e) => setFormData({ ...formData, cut_date: e.target.value })}
                        placeholder="Ej: 15"
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Día de Pago
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.payment_date}
                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                        placeholder="Ej: 20"
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Color
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="template-color-input w-full h-10 bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden appearance-none cursor-pointer"
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-slate-800 text-slate-400 rounded-xl font-medium hover:text-white hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
                >
                  {editingCard ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
