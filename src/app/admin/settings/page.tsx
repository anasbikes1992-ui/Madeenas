'use client'
import Link from 'next/link'
import { 
  Users, 
  MapPin, 
  Tag, 
  Truck, 
  Settings as SettingsIcon,
  Shield,
  Database
} from 'lucide-react'

interface SettingCard {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  color: string
}

export default function SettingsPage() {
  const settings: SettingCard[] = [
    {
      title: 'Users',
      description: 'Manage user accounts, roles, and permissions',
      href: '/admin/settings/users',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-500'
    },
    {
      title: 'Locations',
      description: 'Manage warehouses, shops, and storage locations',
      href: '/admin/settings/locations',
      icon: <MapPin className="w-6 h-6" />,
      color: 'bg-green-500'
    },
    {
      title: 'Categories',
      description: 'Organize products into categories',
      href: '/admin/settings/categories',
      icon: <Tag className="w-6 h-6" />,
      color: 'bg-purple-500'
    },
    {
      title: 'Suppliers',
      description: 'Manage supplier information and contacts',
      href: '/admin/settings/suppliers',
      icon: <Truck className="w-6 h-6" />,
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="p-8 space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">Manage system configuration and master data</p>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settings.map((setting) => (
          <Link
            key={setting.href}
            href={setting.href}
            className="card hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
          >
            <div className="flex items-start gap-4">
              <div className={`${setting.color} w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                {setting.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">{setting.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{setting.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* System Info Card */}
      <div className="card bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-slate-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">System Administration</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Configure and manage core system settings. Changes here affect all users and locations. 
              Ensure proper authorization before making modifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
