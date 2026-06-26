import { OrderStatus } from '@prisma/client'

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  PROCESSING: {
    label: 'Processing',
    className: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  SHIPPED: {
    label: 'Shipped',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  DELIVERED: {
    label: 'Delivered',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-800 border-gray-300',
  },
  READY: {
    label: 'Ready',
    className: 'bg-teal-100 text-teal-800 border-teal-300',
  },
}

export function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  )
}

interface OrderStatusSelectProps {
  value: OrderStatus
  onChange: (status: OrderStatus) => void
  disabled?: boolean
  allowedStatuses?: OrderStatus[]
}

export function OrderStatusSelect({
  value,
  onChange,
  disabled = false,
  allowedStatuses,
}: OrderStatusSelectProps) {
  const statuses = allowedStatuses || Object.keys(statusConfig) as OrderStatus[]

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as OrderStatus)}
      disabled={disabled}
      className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {statuses.map((status) => (
        <option key={status} value={status}>
          {statusConfig[status].label}
        </option>
      ))}
    </select>
  )
}
