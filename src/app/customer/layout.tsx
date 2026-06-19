import { CustomerHeader } from '@/components/customer/CustomerHeader'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.06),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#eef4ff_100%)] text-slate-900">
      <CustomerHeader />
      <main>{children}</main>
    </div>
  )
}
