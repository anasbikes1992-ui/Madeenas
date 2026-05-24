const endpointGroups = [
  {
    title: 'Storefront and Cart',
    description: 'Customer-facing browsing, saved cart state, and VAT-aware checkout for Sri Lankan textile buyers.',
    endpoints: [
      { method: 'GET', path: '/api/gallery', note: 'Product gallery with category and stock data.' },
      { method: 'POST', path: '/api/gallery', note: 'Create gallery order request.' },
      { method: 'GET', path: '/api/cart', note: 'Load the authenticated customer cart.' },
      { method: 'POST', path: '/api/cart', note: 'Add or merge cart items.' },
      { method: 'POST', path: '/api/checkout', note: 'Convert cart into customer order.' },
    ],
  },
  {
    title: 'Customer Orders',
    description: 'Order tracking, approval workflows, and fulfillment from customer order to sale.',
    endpoints: [
      { method: 'GET', path: '/api/customer-orders', note: 'List orders for customer or operations views.' },
      { method: 'GET', path: '/api/customer-orders/{id}', note: 'Get a single order and its line items.' },
      { method: 'PATCH', path: '/api/customer-orders/{id}', note: 'Update order status.' },
      { method: 'POST', path: '/api/customer-orders/{id}/fulfill', note: 'Fulfill order into a sale and deduct stock.' },
    ],
  },
  {
    title: 'Sales and Invoicing',
    description: 'Counter sales, receipt history, invoice exports, and VAT totals in LKR.',
    endpoints: [
      { method: 'GET', path: '/api/sales', note: 'List receipt history with customer and item details.' },
      { method: 'POST', path: '/api/sales', note: 'Create a point-of-sale sale transaction.' },
      { method: 'GET', path: '/openapi.json', note: 'Machine-readable OpenAPI document for tooling.' },
    ],
  },
] as const

const methodStyles: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-50 text-blue-700 border-blue-200',
  PATCH: 'bg-amber-50 text-amber-700 border-amber-200',
}

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-500">API Reference</p>
          <h1 className="mt-3 text-4xl font-black text-slate-950">Madeena Textile API docs for Sri Lanka trade operations</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            This reference covers the operational endpoints that power customer ordering, admin sales, inventory-linked fulfillment,
            and VAT-aware invoicing in LKR.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <a
              href="/openapi.json"
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              Open OpenAPI JSON
            </a>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-semibold text-slate-600">
              Repo docs: API-DOCUMENTATION.md
            </span>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            ['Currency', 'LKR'],
            ['Default VAT', '18%'],
            ['Core flows', 'Gallery, cart, sales, fulfillment'],
          ].map(([label, value]) => (
            <article key={label} className="rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
            </article>
          ))}
        </section>

        <section className="space-y-6">
          {endpointGroups.map((group) => (
            <article key={group.title} className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <h2 className="text-2xl font-black text-slate-950">{group.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{group.description}</p>
              <div className="mt-6 space-y-3">
                {group.endpoints.map((endpoint) => (
                  <div key={`${endpoint.method}-${endpoint.path}`} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex min-w-18 justify-center rounded-full border px-3 py-1 text-xs font-bold ${methodStyles[endpoint.method]}`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-semibold text-slate-900">{endpoint.path}</code>
                    </div>
                    <p className="text-sm text-slate-600">{endpoint.note}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
