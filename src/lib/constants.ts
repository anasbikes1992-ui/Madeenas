export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  STORE_KEEPER: 'STORE_KEEPER',
  SHOP_STAFF: 'SHOP_STAFF',
  FINANCE: 'FINANCE',
  CUSTOMER: 'CUSTOMER',
} as const

export type Role = keyof typeof ROLES

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STORE_KEEPER: 'Store Keeper',
  SHOP_STAFF: 'Shop Staff',
  FINANCE: 'Finance',
  CUSTOMER: 'Customer',
}

// Which roles can submit stock-out requests
export const CAN_REQUEST_STOCK = [
  'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'
]

// Which roles can approve/reject stock-out requests
export const CAN_APPROVE_STOCK = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']

// Which roles can add stock-in
export const CAN_ADD_STOCK_IN = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER']

// Finance department roles
export const FINANCE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE']

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'amber',
  APPROVED: 'blue',
  DISPATCHED: 'indigo',
  ACKNOWLEDGED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
  NEW: 'purple',
  REVIEWED: 'blue',
  QUOTED: 'teal',
  CONFIRMED: 'green',
  CLOSED: 'gray',
  MATCHED: 'green',
  DISCREPANCY: 'red',
}

export const LOCATION_TYPES = {
  WAREHOUSE: 'WAREHOUSE',
  SHOP: 'SHOP',
} as const

export const UNITS = [
  { value: 'meters', label: 'Meters' },
  { value: 'yards', label: 'Yards' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'rolls', label: 'Rolls' },
  { value: 'pieces', label: 'Pieces' },
  { value: 'bundles', label: 'Bundles' },
]

export function getDashboardPath(role: string): string {
  switch (role) {
    case 'FINANCE': return '/finance/dashboard'
    case 'CUSTOMER': return '/'
    default: return '/admin/dashboard'
  }
}
