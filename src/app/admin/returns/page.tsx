'use client'

import { useEffect, useState } from 'react'
import { PremiumCard } from '@/components/ui/PremiumCard'
import { GoldButton } from '@/components/ui/GoldButton'
import { NavyButton } from '@/components/ui/NavyButton'

interface Return {
  id: string
  returnNumber: string
  status: string
  totalRefundAmount: number
  approvedRefundAmount?: number
  createdAt: string
  customerNote?: string
  adminNote?: string
  rejectionReason?: string
  customer: { name: string; email: string }
  sale: { receiptNo: string }
  items: Array<{
    product: { name: string }
    quantity: number
    unitPrice: number
    refundAmount: number
    reason: string
    note?: string
  }>
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  ITEMS_RECEIVED: 'bg-purple-100 text-purple-800',
  REFUND_PROCESSING: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-navy-100 text-navy-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([])
  const [filteredReturns, setFilteredReturns] = useState<Return[]>([])
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [actionLoading, setActionLoading] = useState(false)

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showReceivedModal, setShowReceivedModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)

  const [adjustedAmount, setAdjustedAmount] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [inspectionNote, setInspectionNote] = useState('')
  const [itemCondition, setItemCondition] = useState('GOOD')
  const [refundMethod, setRefundMethod] = useState('ORIGINAL_METHOD')
  const [transactionRef, setTransactionRef] = useState('')

  useEffect(() => {
    fetchReturns()
  }, [])

  useEffect(() => {
    if (statusFilter === 'ALL') {
      setFilteredReturns(returns)
    } else {
      setFilteredReturns(returns.filter((r) => r.status === statusFilter))
    }
  }, [statusFilter, returns])

  const fetchReturns = async () => {
    try {
      const response = await fetch('/api/returns')
      const data = await response.json()
      if (data.success) {
        setReturns(data.returns)
        setFilteredReturns(data.returns)
      }
    } catch (error) {
      console.error('Failed to fetch returns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (
    returnId: string,
    action: string,
    payload: any
  ) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/returns/${returnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      })

      const data = await response.json()
      if (data.success) {
        alert('Action completed successfully!')
        fetchReturns()
        setSelectedReturn(null)
        closeAllModals()
      } else {
        alert(data.error || 'Action failed')
      }
    } catch (error) {
      console.error('Failed to perform action:', error)
      alert('Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const closeAllModals = () => {
    setShowApproveModal(false)
    setShowRejectModal(false)
    setShowReceivedModal(false)
    setShowRefundModal(false)
    setAdjustedAmount('')
    setAdminNote('')
    setRejectionReason('')
    setInspectionNote('')
    setTransactionRef('')
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
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-navy-200 rounded-lg w-1/3"></div>
          <div className="h-64 bg-navy-100 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-navy-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-navy-900 mb-2">
            Returns Management
          </h1>
          <p className="text-navy-600">
            Review and process customer return requests
          </p>
        </div>

        {/* Filters */}
        <PremiumCard className="mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-navy-700">Status:</span>
            {['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'ITEMS_RECEIVED', 'REFUND_PROCESSING', 'COMPLETED', 'REJECTED'].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-gold-500 text-white shadow-gold'
                      : 'bg-navy-50 text-navy-700 hover:bg-navy-100'
                  }`}
                >
                  {status.replace(/_/g, ' ')}
                  {status === 'ALL' && ` (${returns.length})`}
                  {status !== 'ALL' &&
                    ` (${returns.filter((r) => r.status === status).length})`}
                </button>
              )
            )}
          </div>
        </PremiumCard>

        {/* Returns List */}
        {filteredReturns.length === 0 ? (
          <PremiumCard>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-heading font-semibold text-navy-900 mb-2">
                No Returns Found
              </h3>
              <p className="text-navy-600">
                {statusFilter === 'ALL'
                  ? 'No return requests yet'
                  : `No ${statusFilter.toLowerCase().replace(/_/g, ' ')} returns`}
              </p>
            </div>
          </PremiumCard>
        ) : (
          <div className="space-y-4">
            {filteredReturns.map((returnItem) => (
              <PremiumCard key={returnItem.id} hover>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="text-xl font-heading font-semibold text-navy-900">
                        {returnItem.returnNumber}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          statusColors[returnItem.status as keyof typeof statusColors]
                        }`}
                      >
                        {returnItem.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm text-navy-700 mb-4">
                      <div>
                        <span className="font-medium">Customer:</span>{' '}
                        {returnItem.customer.name}
                      </div>
                      <div>
                        <span className="font-medium">Sale:</span>{' '}
                        {returnItem.sale.receiptNo}
                      </div>
                      <div>
                        <span className="font-medium">Requested:</span>{' '}
                        {formatDate(returnItem.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium">Items:</span>{' '}
                        {returnItem.items.length}
                      </div>
                      <div>
                        <span className="font-medium">Refund:</span>{' '}
                        <span className="text-gold-600 font-semibold">
                          {formatCurrency(
                            returnItem.approvedRefundAmount ||
                              returnItem.totalRefundAmount
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      {returnItem.status === 'PENDING' && (
                        <>
                          <GoldButton
                            size="sm"
                            onClick={() => {
                              setSelectedReturn(returnItem)
                              setShowApproveModal(true)
                            }}
                          >
                            ✓ Approve
                          </GoldButton>
                          <NavyButton
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReturn(returnItem)
                              setShowRejectModal(true)
                            }}
                          >
                            × Reject
                          </NavyButton>
                        </>
                      )}
                      {returnItem.status === 'APPROVED' && (
                        <GoldButton
                          size="sm"
                          onClick={() => {
                            setSelectedReturn(returnItem)
                            setShowReceivedModal(true)
                          }}
                        >
                          Mark Items Received
                        </GoldButton>
                      )}
                      {returnItem.status === 'ITEMS_RECEIVED' && (
                        <GoldButton
                          size="sm"
                          onClick={() => {
                            setSelectedReturn(returnItem)
                            setShowRefundModal(true)
                          }}
                        >
                          Process Refund
                        </GoldButton>
                      )}
                      <NavyButton
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReturn(returnItem)}
                      >
                        View Details
                      </NavyButton>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedReturn && !showApproveModal && !showRejectModal && !showReceivedModal && !showRefundModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedReturn(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-premium-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-navy-600 to-navy-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-heading font-bold mb-1">
                    {selectedReturn.returnNumber}
                  </h2>
                  <p className="text-navy-100">
                    {selectedReturn.customer.name} • {selectedReturn.sale.receiptNo}
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
              {/* Customer Note */}
              {selectedReturn.customerNote && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-navy-700 mb-2">
                    Customer's Note:
                  </p>
                  <p className="text-navy-600">{selectedReturn.customerNote}</p>
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="text-lg font-heading font-semibold text-navy-900 mb-3">
                  Items to Return
                </h3>
                <div className="space-y-3">
                  {selectedReturn.items.map((item, idx) => (
                    <div key={idx} className="border border-navy-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-navy-900">
                            {item.product.name}
                          </p>
                          <p className="text-sm text-navy-600">
                            Qty: {item.quantity} @ {formatCurrency(item.unitPrice)}
                          </p>
                          <p className="text-xs text-navy-500 mt-1">
                            Reason: {item.reason.replace(/_/g, ' ')}
                          </p>
                          {item.note && (
                            <p className="text-xs text-navy-500 mt-1">
                              Note: {item.note}
                            </p>
                          )}
                        </div>
                        <span className="text-gold-600 font-semibold">
                          {formatCurrency(item.refundAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Notes */}
              {(selectedReturn.adminNote || selectedReturn.rejectionReason) && (
                <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-navy-700 mb-2">
                    Admin Notes:
                  </p>
                  <p className="text-navy-600">
                    {selectedReturn.adminNote || selectedReturn.rejectionReason}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <NavyButton onClick={() => setSelectedReturn(null)}>
                  Close
                </NavyButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-premium-lg max-w-md w-full p-6">
            <h3 className="text-2xl font-heading font-bold text-navy-900 mb-4">
              Approve Return
            </h3>
            <p className="text-navy-600 mb-6">
              {selectedReturn.returnNumber}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  Original Refund Amount
                </label>
                <p className="text-2xl font-bold text-navy-900">
                  {formatCurrency(selectedReturn.totalRefundAmount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  Adjusted Refund Amount (optional)
                </label>
                <input
                  type="number"
                  value={adjustedAmount}
                  onChange={(e) => setAdjustedAmount(e.target.value)}
                  placeholder={selectedReturn.totalRefundAmount.toString()}
                  className="w-full border border-navy-300 rounded-lg px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  Admin Note (optional)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="w-full border border-navy-300 rounded-lg px-4 py-2"
                  placeholder="Add any notes..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <NavyButton
                variant="outline"
                className="flex-1"
                onClick={closeAllModals}
                disabled={actionLoading}
              >
                Cancel
              </NavyButton>
              <GoldButton
                className="flex-1"
                onClick={() =>
                  handleAction(selectedReturn.id, 'approve', {
                    adjustedRefundAmount: adjustedAmount
                      ? parseFloat(adjustedAmount)
                      : undefined,
                    adminNote: adminNote || undefined,
                  })
                }
                disabled={actionLoading}
              >
                {actionLoading ? 'Approving...' : 'Approve Return'}
              </GoldButton>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-premium-lg max-w-md w-full p-6">
            <h3 className="text-2xl font-heading font-bold text-navy-900 mb-4">
              Reject Return
            </h3>
            <p className="text-navy-600 mb-6">
              {selectedReturn.returnNumber}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Reason for Rejection *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full border border-navy-300 rounded-lg px-4 py-2"
                placeholder="Explain why this return is being rejected..."
                required
              />
            </div>

            <div className="flex gap-3">
              <NavyButton
                variant="outline"
                className="flex-1"
                onClick={closeAllModals}
                disabled={actionLoading}
              >
                Cancel
              </NavyButton>
              <NavyButton
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() =>
                  handleAction(selectedReturn.id, 'reject', {
                    rejectionReason,
                  })
                }
                disabled={actionLoading || !rejectionReason}
              >
                {actionLoading ? 'Rejecting...' : 'Reject Return'}
              </NavyButton>
            </div>
          </div>
        </div>
      )}

      {/* Received Modal */}
      {showReceivedModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-premium-lg max-w-md w-full p-6">
            <h3 className="text-2xl font-heading font-bold text-navy-900 mb-4">
              Mark Items Received
            </h3>
            <p className="text-navy-600 mb-6">
              {selectedReturn.returnNumber}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  Item Condition *
                </label>
                <select
                  value={itemCondition}
                  onChange={(e) => setItemCondition(e.target.value)}
                  className="w-full border border-navy-300 rounded-lg px-4 py-2"
                >
                  <option value="GOOD">Good Condition (Restock)</option>
                  <option value="ACCEPTABLE">Acceptable (Restock)</option>
                  <option value="DAMAGED">Damaged (Do Not Restock)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  Inspection Note (optional)
                </label>
                <textarea
                  value={inspectionNote}
                  onChange={(e) => setInspectionNote(e.target.value)}
                  rows={3}
                  className="w-full border border-navy-300 rounded-lg px-4 py-2"
                  placeholder="Inspection findings..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <NavyButton
                variant="outline"
                className="flex-1"
                onClick={closeAllModals}
                disabled={actionLoading}
              >
                Cancel
              </NavyButton>
              <GoldButton
                className="flex-1"
                onClick={() =>
                  handleAction(selectedReturn.id, 'mark_received', {
                    condition: itemCondition,
                    inspectionNote: inspectionNote || undefined,
                  })
                }
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Confirm Receipt'}
              </GoldButton>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-premium-lg max-w-md w-full p-6">
            <h3 className="text-2xl font-heading font-bold text-navy-900 mb-4">
              Process Refund
            </h3>
            <p className="text-navy-600 mb-6">
              {selectedReturn.returnNumber}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  Refund Amount
                </label>
                <p className="text-3xl font-bold text-gold-600">
                  {formatCurrency(
                    selectedReturn.approvedRefundAmount ||
                      selectedReturn.totalRefundAmount
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  Refund Method *
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full border border-navy-300 rounded-lg px-4 py-2"
                >
                  <option value="ORIGINAL_METHOD">Original Payment Method</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="STORE_CREDIT">Store Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  Transaction Reference *
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full border border-navy-300 rounded-lg px-4 py-2"
                  placeholder="Transaction ID or reference..."
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <NavyButton
                variant="outline"
                className="flex-1"
                onClick={closeAllModals}
                disabled={actionLoading}
              >
                Cancel
              </NavyButton>
              <GoldButton
                className="flex-1"
                onClick={() =>
                  handleAction(selectedReturn.id, 'process_refund', {
                    refundMethod,
                    transactionReference: transactionRef,
                  })
                }
                disabled={actionLoading || !transactionRef}
              >
                {actionLoading ? 'Processing...' : 'Process Refund'}
              </GoldButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
