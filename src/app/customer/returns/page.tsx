'use client'

import { useEffect, useState } from 'react'
import { PremiumCard } from '@/components/ui/PremiumCard'
import { GoldButton } from '@/components/ui/GoldButton'
import { NavyButton } from '@/components/ui/NavyButton'
import Link from 'next/link'

interface Return {
  id: string
  returnNumber: string
  status: string
  totalRefundAmount: number
  approvedRefundAmount?: number
  createdAt: string
  sale: {
    receiptNo: string
  }
  items: Array<{
    product: { name: string }
    quantity: number
    refundAmount: number
    reason: string
  }>
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800 border-blue-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
  ITEMS_RECEIVED: 'bg-purple-100 text-purple-800 border-purple-300',
  REFUND_PROCESSING: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  COMPLETED: 'bg-navy-100 text-navy-800 border-navy-300',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300',
}

export default function CustomerReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)

  useEffect(() => {
    fetchReturns()
  }, [])

  const fetchReturns = async () => {
    try {
      const response = await fetch('/api/returns')
      const data = await response.json()
      if (data.success) {
        setReturns(data.returns)
      }
    } catch (error) {
      console.error('Failed to fetch returns:', error)
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-navy-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-navy-200 rounded-lg w-1/3"></div>
            <div className="h-64 bg-navy-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-navy-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold text-navy-900 mb-2">
              My Returns
            </h1>
            <p className="text-navy-600">
              Track and manage your return requests
            </p>
          </div>
          <Link href="/customer/returns/new">
            <GoldButton size="lg">
              + Request Return
            </GoldButton>
          </Link>
        </div>

        {/* Returns List */}
        {returns.length === 0 ? (
          <PremiumCard hover>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-heading font-semibold text-navy-900 mb-2">
                No Returns Yet
              </h3>
              <p className="text-navy-600 mb-6">
                You haven't requested any returns
              </p>
              <Link href="/customer/returns/new">
                <GoldButton>Request Your First Return</GoldButton>
              </Link>
            </div>
          </PremiumCard>
        ) : (
          <div className="space-y-4">
            {returns.map((returnItem) => (
              <PremiumCard key={returnItem.id} hover>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-xl font-heading font-semibold text-navy-900">
                        {returnItem.returnNumber}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium border ${
                          statusColors[returnItem.status as keyof typeof statusColors]
                        }`}
                      >
                        {returnItem.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-navy-700 mb-4">
                      <div>
                        <span className="font-medium">Original Sale:</span>{' '}
                        {returnItem.sale.receiptNo}
                      </div>
                      <div>
                        <span className="font-medium">Requested:</span>{' '}
                        {formatDate(returnItem.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium">Items:</span>{' '}
                        {returnItem.items.length} item(s)
                      </div>
                      <div>
                        <span className="font-medium">Refund Amount:</span>{' '}
                        <span className="text-gold-600 font-semibold">
                          {formatCurrency(
                            returnItem.approvedRefundAmount ||
                              returnItem.totalRefundAmount
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="bg-navy-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-navy-700 mb-2">
                        Items to Return:
                      </p>
                      <div className="space-y-2">
                        {returnItem.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-navy-600">
                              {item.product.name} × {item.quantity}
                            </span>
                            <span className="text-navy-500 text-xs">
                              {item.reason.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="ml-6">
                    <NavyButton
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReturn(returnItem)}
                    >
                      View Details
                    </NavyButton>
                  </div>
                </div>
              </PremiumCard>
            ))}
          </div>
        )}
      </div>

      {/* Return Details Modal */}
      {selectedReturn && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedReturn(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-premium-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-navy-600 to-navy-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-heading font-bold mb-1">
                    {selectedReturn.returnNumber}
                  </h2>
                  <p className="text-navy-100">
                    Sale: {selectedReturn.sale.receiptNo}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedReturn(null)}
                  className="text-white hover:text-gold-300 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-navy-700 mb-2 block">
                  Status
                </label>
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${
                    statusColors[selectedReturn.status as keyof typeof statusColors]
                  }`}
                >
                  {selectedReturn.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Refund Amount */}
              <div>
                <label className="text-sm font-medium text-navy-700 mb-2 block">
                  Refund Amount
                </label>
                <div className="text-3xl font-bold text-gold-600">
                  {formatCurrency(
                    selectedReturn.approvedRefundAmount ||
                      selectedReturn.totalRefundAmount
                  )}
                </div>
                {selectedReturn.approvedRefundAmount &&
                  selectedReturn.approvedRefundAmount !==
                    selectedReturn.totalRefundAmount && (
                    <p className="text-sm text-navy-600 mt-1">
                      Original request:{' '}
                      {formatCurrency(selectedReturn.totalRefundAmount)}
                    </p>
                  )}
              </div>

              {/* Items */}
              <div>
                <label className="text-sm font-medium text-navy-700 mb-2 block">
                  Items
                </label>
                <div className="space-y-3">
                  {selectedReturn.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-navy-50 rounded-lg p-4 border border-navy-100"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-navy-900">
                            {item.product.name}
                          </p>
                          <p className="text-sm text-navy-600">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                        <span className="text-gold-600 font-semibold">
                          {formatCurrency(item.refundAmount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-navy-600">
                        <span className="bg-navy-200 px-2 py-1 rounded">
                          {item.reason.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-navy-100">
                <NavyButton onClick={() => setSelectedReturn(null)}>
                  Close
                </NavyButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
