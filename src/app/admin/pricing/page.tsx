'use client'

import { useEffect, useState } from 'react'
import { PremiumCard } from '@/components/ui/PremiumCard'
import { GoldButton } from '@/components/ui/GoldButton'
import { NavyButton } from '@/components/ui/NavyButton'

interface PriceRule {
  id: string
  name: string
  ruleType: string
  discountType: string
  discountValue: number
  priority: number
  isActive: boolean
  startsAt?: string
  endsAt?: string
  conditions: any
  createdAt: string
}

const RULE_TYPES = [
  { value: 'BULK_DISCOUNT', label: 'Bulk Discount', icon: '📦' },
  { value: 'CUSTOMER_SEGMENT', label: 'Customer Segment', icon: '👥' },
  { value: 'STOCK_LEVEL', label: 'Stock Level', icon: '📊' },
  { value: 'TIME_BASED', label: 'Time-Based', icon: '⏰' },
  { value: 'PRODUCT_CATEGORY', label: 'Product Category', icon: '🏷️' },
]

const DISCOUNT_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount (Rs.)' },
  { value: 'FIXED_PRICE', label: 'Fixed Price (Rs.)' },
]

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PriceRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [ruleType, setRuleType] = useState('BULK_DISCOUNT')
  const [discountType, setDiscountType] = useState('PERCENTAGE')
  const [discountValue, setDiscountValue] = useState('')
  const [priority, setPriority] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  
  // Condition fields
  const [minQuantity, setMinQuantity] = useState('')
  const [maxQuantity, setMaxQuantity] = useState('')
  const [customerSegment, setCustomerSegment] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [productIds, setProductIds] = useState<string[]>([])
  const [stockThreshold, setStockThreshold] = useState('')
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([])

  useEffect(() => {
    fetchRules()
  }, [])

  useEffect(() => {
    if (editingRule) {
      setName(editingRule.name)
      setRuleType(editingRule.ruleType)
      setDiscountType(editingRule.discountType)
      setDiscountValue(editingRule.discountValue.toString())
      setPriority(editingRule.priority.toString())
      setIsActive(editingRule.isActive)
      setStartsAt(editingRule.startsAt || '')
      setEndsAt(editingRule.endsAt || '')
      
      // Load conditions
      const cond = editingRule.conditions || {}
      setMinQuantity(cond.minQuantity?.toString() || '')
      setMaxQuantity(cond.maxQuantity?.toString() || '')
      setCustomerSegment(cond.customerSegment || '')
      setCategoryIds(cond.categoryIds || [])
      setProductIds(cond.productIds || [])
      setStockThreshold(cond.stockThreshold?.toString() || '')
      setDaysOfWeek(cond.daysOfWeek || [])
    }
  }, [editingRule])

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/pricing/rules')
      const data = await response.json()
      if (data.success) {
        setRules(data.rules)
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setRuleType('BULK_DISCOUNT')
    setDiscountType('PERCENTAGE')
    setDiscountValue('')
    setPriority('0')
    setIsActive(true)
    setStartsAt('')
    setEndsAt('')
    setMinQuantity('')
    setMaxQuantity('')
    setCustomerSegment('')
    setCategoryIds([])
    setProductIds([])
    setStockThreshold('')
    setDaysOfWeek([])
    setEditingRule(null)
    setShowForm(false)
  }

  const buildConditions = () => {
    const conditions: any = {}
    
    if (ruleType === 'BULK_DISCOUNT') {
      if (minQuantity) conditions.minQuantity = parseFloat(minQuantity)
      if (maxQuantity) conditions.maxQuantity = parseFloat(maxQuantity)
    } else if (ruleType === 'CUSTOMER_SEGMENT') {
      if (customerSegment) conditions.customerSegment = customerSegment
    } else if (ruleType === 'STOCK_LEVEL') {
      if (stockThreshold) conditions.stockThreshold = parseFloat(stockThreshold)
    } else if (ruleType === 'TIME_BASED') {
      if (daysOfWeek.length > 0) conditions.daysOfWeek = daysOfWeek
    } else if (ruleType === 'PRODUCT_CATEGORY') {
      if (categoryIds.length > 0) conditions.categoryIds = categoryIds
      if (productIds.length > 0) conditions.productIds = productIds
    }
    
    return conditions
  }

  const handleSubmit = async () => {
    if (!name || !discountValue) {
      alert('Please fill in required fields')
      return
    }

    const payload = {
      name,
      ruleType,
      discountType,
      discountValue: parseFloat(discountValue),
      priority: parseInt(priority),
      isActive,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
      conditions: buildConditions(),
    }

    try {
      const url = editingRule
        ? `/api/pricing/rules/${editingRule.id}`
        : '/api/pricing/rules'
      const method = editingRule ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (data.success) {
        alert(`Rule ${editingRule ? 'updated' : 'created'} successfully!`)
        fetchRules()
        resetForm()
      } else {
        alert(data.error || 'Failed to save rule')
      }
    } catch (error) {
      console.error('Failed to save rule:', error)
      alert('Failed to save rule')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const response = await fetch(`/api/pricing/rules/${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        alert('Rule deleted successfully!')
        fetchRules()
      } else {
        alert(data.error || 'Failed to delete rule')
      }
    } catch (error) {
      console.error('Failed to delete rule:', error)
      alert('Failed to delete rule')
    }
  }

  const toggleActive = async (rule: PriceRule) => {
    try {
      const response = await fetch(`/api/pricing/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      })
      const data = await response.json()
      if (data.success) {
        fetchRules()
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error)
    }
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold text-navy-900 mb-2">
              Dynamic Pricing Rules
            </h1>
            <p className="text-navy-600">
              Create and manage intelligent pricing strategies
            </p>
          </div>
          <GoldButton
            size="lg"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
          >
            + Create New Rule
          </GoldButton>
        </div>

        {/* Rules List */}
        {!showForm ? (
          <>
            {rules.length === 0 ? (
              <PremiumCard hover>
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💰</div>
                  <h3 className="text-xl font-heading font-semibold text-navy-900 mb-2">
                    No Pricing Rules Yet
                  </h3>
                  <p className="text-navy-600 mb-6">
                    Create your first pricing rule to start offering dynamic discounts
                  </p>
                  <GoldButton onClick={() => setShowForm(true)}>
                    Create First Rule
                  </GoldButton>
                </div>
              </PremiumCard>
            ) : (
              <div className="space-y-4">
                {rules
                  .sort((a, b) => b.priority - a.priority)
                  .map((rule) => (
                    <PremiumCard key={rule.id} hover>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <span className="text-3xl">
                              {
                                RULE_TYPES.find((t) => t.value === rule.ruleType)
                                  ?.icon
                              }
                            </span>
                            <div>
                              <h3 className="text-xl font-heading font-semibold text-navy-900">
                                {rule.name}
                              </h3>
                              <p className="text-sm text-navy-600">
                                {
                                  RULE_TYPES.find((t) => t.value === rule.ruleType)
                                    ?.label
                                }{' '}
                                • Priority: {rule.priority}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                rule.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-sm text-navy-700 mb-4">
                            <div>
                              <span className="font-medium">Discount:</span>{' '}
                              <span className="text-gold-600 font-semibold">
                                {rule.discountType === 'PERCENTAGE'
                                  ? `${rule.discountValue}%`
                                  : `Rs. ${rule.discountValue}`}
                              </span>
                            </div>
                            {rule.startsAt && (
                              <div>
                                <span className="font-medium">Valid From:</span>{' '}
                                {new Date(rule.startsAt).toLocaleDateString()}
                              </div>
                            )}
                            {rule.endsAt && (
                              <div>
                                <span className="font-medium">Valid Until:</span>{' '}
                                {new Date(rule.endsAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <NavyButton
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingRule(rule)
                                setShowForm(true)
                              }}
                            >
                              ✏️ Edit
                            </NavyButton>
                            <NavyButton
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(rule.id)}
                            >
                              🗑️ Delete
                            </NavyButton>
                            <div className="ml-auto">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={rule.isActive}
                                  onChange={() => toggleActive(rule)}
                                  className="w-5 h-5 rounded border-navy-300 text-gold-500 focus:ring-gold-500"
                                />
                                <span className="text-sm text-navy-700">
                                  Active
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </PremiumCard>
                  ))}
              </div>
            )}
          </>
        ) : (
          /* Rule Form */
          <PremiumCard>
            <h2 className="text-2xl font-heading font-bold text-navy-900 mb-6">
              {editingRule ? 'Edit Price Rule' : 'Create New Price Rule'}
            </h2>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-navy-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-navy-500"
                    placeholder="e.g., Bulk Discount 10+"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Rule Type *
                  </label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value)}
                    className="w-full border border-navy-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-navy-500"
                  >
                    {RULE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Discount */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Discount Type *
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full border border-navy-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-navy-500"
                  >
                    {DISCOUNT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full border border-navy-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-navy-500"
                    placeholder={discountType === 'PERCENTAGE' ? '10' : '1000'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Priority (0-100)
                  </label>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full border border-navy-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-navy-500"
                    placeholder="0"
                  />
                  <p className="text-xs text-navy-500 mt-1">
                    Higher priority applied first
                  </p>
                </div>
              </div>

              {/* Conditions based on Rule Type */}
              <div className="bg-navy-50 rounded-lg p-6 border border-navy-200">
                <h3 className="text-lg font-semibold text-navy-900 mb-4">
                  Conditions
                </h3>

                {ruleType === 'BULK_DISCOUNT' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Minimum Quantity
                      </label>
                      <input
                        type="number"
                        value={minQuantity}
                        onChange={(e) => setMinQuantity(e.target.value)}
                        className="w-full border border-navy-300 rounded-lg px-4 py-2"
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Maximum Quantity (optional)
                      </label>
                      <input
                        type="number"
                        value={maxQuantity}
                        onChange={(e) => setMaxQuantity(e.target.value)}
                        className="w-full border border-navy-300 rounded-lg px-4 py-2"
                        placeholder="100"
                      />
                    </div>
                  </div>
                )}

                {ruleType === 'CUSTOMER_SEGMENT' && (
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-2">
                      Customer Segment
                    </label>
                    <select
                      value={customerSegment}
                      onChange={(e) => setCustomerSegment(e.target.value)}
                      className="w-full border border-navy-300 rounded-lg px-4 py-2"
                    >
                      <option value="">Select segment...</option>
                      <option value="VIP">VIP Customers</option>
                      <option value="WHOLESALE">Wholesale</option>
                      <option value="RETAIL">Retail</option>
                      <option value="NEW">New Customers</option>
                    </select>
                  </div>
                )}

                {ruleType === 'STOCK_LEVEL' && (
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-2">
                      Stock Threshold (%)
                    </label>
                    <input
                      type="number"
                      value={stockThreshold}
                      onChange={(e) => setStockThreshold(e.target.value)}
                      className="w-full border border-navy-300 rounded-lg px-4 py-2"
                      placeholder="20"
                    />
                    <p className="text-xs text-navy-500 mt-1">
                      Apply when stock is below this percentage
                    </p>
                  </div>
                )}

                {ruleType === 'TIME_BASED' && (
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-2">
                      Days of Week
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(
                        (day) => (
                          <label
                            key={day}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={daysOfWeek.includes(day)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setDaysOfWeek([...daysOfWeek, day])
                                } else {
                                  setDaysOfWeek(
                                    daysOfWeek.filter((d) => d !== day)
                                  )
                                }
                              }}
                              className="w-4 h-4 rounded border-navy-300 text-gold-500"
                            />
                            <span className="text-sm text-navy-700">{day}</span>
                          </label>
                        )
                      )}
                    </div>
                  </div>
                )}

                {ruleType === 'PRODUCT_CATEGORY' && (
                  <div>
                    <p className="text-sm text-navy-600">
                      Category/Product filters (add via API or extend form)
                    </p>
                  </div>
                )}
              </div>

              {/* Validity Period */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Valid From (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full border border-navy-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-navy-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Valid Until (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full border border-navy-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-navy-500"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded border-navy-300 text-gold-500 focus:ring-gold-500"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-navy-700 cursor-pointer"
                >
                  Activate rule immediately
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-navy-200">
                <NavyButton
                  variant="outline"
                  className="flex-1"
                  onClick={resetForm}
                >
                  Cancel
                </NavyButton>
                <GoldButton className="flex-1" onClick={handleSubmit}>
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </GoldButton>
              </div>
            </div>
          </PremiumCard>
        )}
      </div>
    </div>
  )
}
