import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardPath } from '@/lib/constants'

export default async function RootPage() {
  const session = await auth()
  if (session?.user) {
    redirect(getDashboardPath(session.user.role))
  }
  redirect('/login')
}
