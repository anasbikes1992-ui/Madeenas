'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PremiumCard } from '@/components/ui/PremiumCard'
import { GoldButton } from '@/components/ui/GoldButton'
import { NavyButton } from '@/components/ui/NavyButton'

interface Sale {
  id: string
  receiptNo: string
  createdAt: string
  grandTotal: number
  items: Array<{
    id: string
    product: { id: string; name: string; unit: string }
    quantity: number
    unitPrice: number
    total: number
  }>
}

const RETURN_REASONS = [
  { value: 'DEFECTIVE', label: 'Defective Item' },
  { value: 'WRONG_ITEM', label: 'Wrong Item Received' },
  { value: 'SIZE_ISSUE', label: 'Size Issue' },
  { value: 'COLOR_MISMATCH', label: 'Color Mismatch' },
  { value: 'DAMAGED', label: 'Damaged in Transit' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not as Described' },
  { value: 'CHANGED_MIND', label: 'Changed Mind' },
  { value: 'OTHER', label: 'Other' },
]

export default function NewReturnPage() {
  const router = useRouter()
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [returnItems, setReturnItems] = useState<
    Array<{
      saleItemId: string
      productId: string
      quantity: number
      reason: string
      note: string
    }>
  >([])
  const [customerNote, setCustomerNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'select-sale' | 'select-items' | 'confirm'>(
    'select-sale'
  )

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      // Fetch customer's sales/orders
      const response = await fetch('/api/sales?myOrders=true')
      const data = await response.json()
      if (data.success) {
        setSales(data.sales)
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error)
    }
  }

  const handleSaleSelect = (sale: Sale) => {
    setSelectedSale(sale)
    // Initialize return items
    setReturnItems(
      sale.items.map((item) => ({
        saleItemId: item.id,
        productId: item.product.id,
        quantity: 0,
        reason: '',
        note: '',
      }))
    )
    setStep('select-items')
  }

  const handleQuantityChange = (index: number, quantity: number) => {
    const maxQty = selectedSale!.items[index].quantity
    const validQty = Math.max(0, Math.min(quantity, maxQty))
    setReturnItems((prev) => {
      const updated = [...prev]
      updated[index].quantity = validQty
      return updated
    })
  }

  const handleReasonChange = (index: number, reason: string) => {
    setReturnItems((prev) => {
      const updated = [...prev]
      updated[index].reason = reason
      return updated
    })
  }

  const handleNoteChange = (index: number, note: string) => {
    setReturnItems((prev) => {
      const updated = [...prev]
      updated[index].note = note
      return updated
    })
  }

  const calculateRefund = () => {
    if (!selectedSale) return 0
    return returnItems.reduce((total, item, idx) => {
      if (item.quantity > 0) {
        const saleItem = selectedSale.items[idx]
        return total + saleItem.unitPrice * item.quantity
      }
      return total
    }, 0)
  }

  const handleSubmit = async () => {
    if (!selectedSale) return

    const itemsToReturn = returnItems.filter((item) => item.quantity > 0)
    if (itemsToReturn.length === 0) {
      alert('Please select at least one item to return')
      return
    }

    const missingReason = itemsToReturn.find((item) => !item.reason)
    if (missingReason) {
      alert('Please select a reason for all items')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: selectedSale.id,
          items: itemsToReturn,
          customerNote,
          preferredResolution: 'REFUND',
        }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Return request submitted successfully!')
        router.push('/customer/returns')
      } else {
        alert(data.error || 'Failed to submit return request')
      }
    } catch (error) {
      console.error('Failed to submit return:', error)
      alert('Failed to submit return request')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-navy-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-navy-900 mb-2">
            Request Return
          </h1>
          <p className="text-navy-600">
            Select items you'd like to return and get a refund
          </p>
        </div>

        {/* Step 1: Select Sale */}
        {step === 'select-sale' && (
          <PremiumCard>
            <h2 className="text-2xl font-heading font-semibold text-navy-900 mb-6">
              Step 1: Select Your Purchase
            </h2>
            {sales.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🛍️</div>
                <p className="text-navy-600">No purchases found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="border border-navy-200 rounded-lg p-4 hover:border-gold-500 hover:shadow-gold transition-all cursor-pointer"
                    onClick={() => handleSaleSelect(sale)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-navy-900">
                          {sale.receiptNo}
                        </p>
                        <p className="text-sm text-navy-600">
                          {new Date(sale.createdAt).toLocaleDateString('en-LK')}
                        </p>
                        <p className="text-sm text-navy-600 mt-1">
                          {sale.items.length} item(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gold-600 font-semibold">
                          {formatCurrency(sale.grandTotal)}
                        </p>
                        <GoldButton size="sm" className="mt-2">
                          Select →
                        </GoldButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PremiumCard>
        )}

        {/* Step 2: Select Items */}
        {step === 'select-items' && selectedSale && (
          <PremiumCard>
            <h2 className="text-2xl font-heading font-semibold text-navy-900 mb-2">
              Step 2: Select Items to Return
            </h2>
            <p className="text-navy-600 mb-6">
              Sale: <span className="font-semibold">{selectedSale.receiptNo}</span>
            </p>

            <div className="space-y-4 mb-6">
              {selectedSale.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="border border-navy-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-navy-900">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-navy-600">
                        Original quantity: {item.quantity} {item.product.unit} @{' '}
                        {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-navy-700 font-medium">
                      {formatCurrency(item.total)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Return Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={returnItems[idx]?.quantity || 0}
                        onChange={(e) =>
                          handleQuantityChange(idx, parseInt(e.target.value) || 0)
                        }
                        className="w-full border border-navy-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                      />
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Reason for Return
                      </label>
                      <select
                        value={returnItems[idx]?.reason || ''}
                        onChange={(e) => handleReasonChange(idx, e.target.value)}
                        className="w-full border border-navy-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                        disabled={!returnItems[idx]?.quantity}
                      >
                        <option value="">Select reason...</option>
                        {RETURN_REASONS.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Item Note */}
                  {returnItems[idx]?.quantity > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Additional Details (Optional)
                      </label>
                      <textarea
                        value={returnItems[idx]?.note || ''}
                        onChange={(e) => handleNoteChange(idx, e.target.value)}
                        rows={2}
                        className="w-full border border-navy-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                        placeholder="Describe the issue..."
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Customer Note */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-navy-700 mb-2">
                General Comments (Optional)
              </label>
              <textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                rows={3}
                className="w-full border border-navy-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                placeholder="Any additional information about your return..."
              />
            </div>

            {/* Refund Summary */}
            <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-navy-700 font-medium">
                  Estimated Refund:
                </span>
                <span className="text-2xl font-bold text-gold-600">
                  {formatCurrency(calculateRefund())}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <NavyButton variant="outline" onClick={() => setStep('select-sale')}>
                ← Back
              </NavyButton>
              <GoldButton
                onClick={handleSubmit}
                disabled={loading || calculateRefund() === 0}
              >
                {loading ? 'Submitting...' : 'Submit Return Request'}
              </GoldButton>
            </div>
          </PremiumCard>
        )}
      </div>
    </div>
  )
}
