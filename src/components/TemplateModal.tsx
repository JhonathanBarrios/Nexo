import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRightLeft, CreditCard, DollarSign, Tag, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCards } from '../hooks/useCards'
import { useCategories } from '../hooks/useCategories'

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (templateData: any) => void
  editingTemplate?: any
}

export default function TemplateModal({ isOpen, onClose, onSave, editingTemplate }: TemplateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense' | 'payment' | 'withdrawal',
    description: '',
    amount: '',
    category_id: '',
    card_id: '',
    source_card_id: '',
    is_fixed: true,
    color: '#6366f1',
  })

  const { categories } = useCategories()
  const { cards } = useCards()

  useEffect(() => {
    if (!isOpen) return

    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name || '',
        type: editingTemplate.type || 'expense',
        description: editingTemplate.description || '',
        amount: editingTemplate.amount ? String(editingTemplate.amount) : '',
        category_id: editingTemplate.category_id || '',
        card_id: editingTemplate.card_id || '',
        source_card_id: editingTemplate.source_card_id || '',
        is_fixed: editingTemplate.is_fixed ?? true,
        color: editingTemplate.color || '#6366f1',
      })
    } else {
      setFormData({
        name: '',
        type: 'expense',
        description: '',
        amount: '',
        category_id: '',
        card_id: '',
        source_card_id: '',
        is_fixed: true,
        color: '#6366f1',
      })
    }
  }, [isOpen, editingTemplate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Por favor ingresa el nombre de la plantilla')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Por favor ingresa la descripción de la plantilla')
      return
    }

    onSave({
      name: formData.name,
      type: formData.type,
      description: formData.description,
      amount: formData.amount ? parseFloat(formData.amount) : 0,
      category_id: formData.category_id || null,
      card_id: formData.card_id || null,
      source_card_id: formData.source_card_id || null,
      is_fixed: formData.is_fixed,
      icon: 'FileText',
      color: formData.color,
    })
  }

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
            className="bg-slate-900 rounded-2xl p-6 w-full max-w-lg border border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-xl font-semibold">{editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Plantilla Fija</label>
                  <p className="text-xs text-slate-500">
                    {formData.is_fixed ? 'Confirma y crea la transacción al instante' : 'Abre el modal para editar antes de guardar'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_fixed: !formData.is_fixed })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${formData.is_fixed ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <motion.span
                    initial={false}
                    animate={{ x: formData.is_fixed ? 24 : 0 }}
                    className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow"
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nombre de la Plantilla</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Jugo de naranja"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'income', label: 'Ingreso' },
                    { value: 'expense', label: 'Gasto' },
                    { value: 'payment', label: 'Pago TC' },
                    { value: 'withdrawal', label: 'Retiro' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: value as 'income' | 'expense' | 'payment' | 'withdrawal' })}
                      className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                        formData.type === value
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Descripción</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ej: Jugo de naranja 16oz"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Monto</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.amount ? Number(formData.amount).toLocaleString('es-CO') : ''}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value.replace(/\D/g, '') })}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Categoría</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Tarjeta</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={formData.card_id}
                    onChange={(e) => setFormData({ ...formData, card_id: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="">Sin tarjeta</option>
                    {cards.filter((c) => c.is_active).map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name} - •••• {card.last_four}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(formData.type === 'payment' || formData.type === 'withdrawal') && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tarjeta origen</label>
                  <div className="relative">
                    <ArrowRightLeft className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                      value={formData.source_card_id}
                      onChange={(e) => setFormData({ ...formData, source_card_id: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                      <option value="">Sin tarjeta origen</option>
                      {cards
                        .filter((c) => c.is_active && (c.type === 'debit' || c.type === 'cash'))
                        .map((card) => (
                          <option key={card.id} value={card.id}>
                            {card.name} - •••• {card.last_four}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="template-color-input w-full h-10 bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden appearance-none cursor-pointer"
                />
              </div>

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
                  {editingTemplate ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
