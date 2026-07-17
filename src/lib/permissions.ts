export type AppRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'STORE_KEEPER'
  | 'SHOP_STAFF'
  | 'FINANCE'
  | 'CUSTOMER'

export type PermissionKey =
  | 'users.manage'
  | 'users.resetPassword'
  | 'products.read'
  | 'products.create'
  | 'products.update'
  | 'products.archive'
  | 'categories.manage'
  | 'suppliers.manage'
  | 'locations.read'
  | 'locations.manage'
  | 'inventory.read'
  | 'inventory.reorder'
  | 'stock.request'
  | 'stock.approve'
  | 'stock.dispatch'
  | 'stock.receive'
  | 'stock.in'
  | 'stock.adjust'
  | 'sales.read'
  | 'sales.create'
  | 'credit.read'
  | 'credit.recordPayment'
  | 'reports.read'
  | 'customerOrders.read'
  | 'settings.manage'

export const ALL_PERMISSIONS: PermissionKey[] = [
  'users.manage', 'users.resetPassword',
  'products.read', 'products.create', 'products.update', 'products.archive',
  'categories.manage', 'suppliers.manage',
  'locations.read', 'locations.manage',
  'inventory.read', 'inventory.reorder',
  'stock.request', 'stock.approve', 'stock.dispatch', 'stock.receive', 'stock.in', 'stock.adjust',
  'sales.read', 'sales.create',
  'credit.read', 'credit.recordPayment',
  'reports.read', 'customerOrders.read', 'settings.manage'
]

export const permissionMatrix: Record<PermissionKey, AppRole[]> = {
  'users.manage': ['SUPER_ADMIN', 'ADMIN'],
  'users.resetPassword': ['SUPER_ADMIN'],
  'products.read': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF', 'FINANCE', 'CUSTOMER'],
  'products.create': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  'products.update': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  'products.archive': ['SUPER_ADMIN', 'ADMIN'],
  'categories.manage': ['SUPER_ADMIN', 'ADMIN'],
  'suppliers.manage': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  'locations.read': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF', 'FINANCE'],
  'locations.manage': ['SUPER_ADMIN', 'ADMIN'],
  'inventory.read': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF', 'FINANCE'],
  'inventory.reorder': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  'stock.request': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'],
  'stock.approve': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  'stock.dispatch': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'],
  'stock.receive': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'],
  'stock.in': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  'stock.adjust': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  'sales.read': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE', 'SHOP_STAFF', 'STORE_KEEPER'],
  'sales.create': ['SUPER_ADMIN', 'ADMIN', 'SHOP_STAFF'],
  'credit.read': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE', 'SHOP_STAFF'],
  // Recording a repayment moves money against a customer's balance, so it is
  // restricted more tightly than reading it.
  'credit.recordPayment': ['SUPER_ADMIN', 'ADMIN', 'FINANCE'],
  'reports.read': ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'],
  'customerOrders.read': ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  'settings.manage': ['SUPER_ADMIN'],
}

export function hasPermission(
  userRole: string | null | undefined, 
  permission: PermissionKey, 
  user?: { useCustomPermissions?: boolean; permissions?: string[] } | null
): boolean {
  if (user?.useCustomPermissions) {
    return user.permissions?.includes(permission) || false
  }
  if (!userRole) return false
  return permissionMatrix[permission]?.includes(userRole as AppRole) || false
}
