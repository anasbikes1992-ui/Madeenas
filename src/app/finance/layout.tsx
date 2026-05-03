import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  const role = session.user.role
  if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE'].includes(role)) redirect('/admin/dashboard')
  return <>{children}</>
}
