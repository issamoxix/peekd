import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { 
  Shield, LayoutDashboard, AlertTriangle, ListChecks, 
  Users, Bot, Settings, Grid3X3, Building2
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/heatmap', icon: Grid3X3, label: 'Heat Map' },
  { to: '/threats', icon: AlertTriangle, label: 'Threat Center' },
  { to: '/actions', icon: ListChecks, label: 'Action Queue' },
  { to: '/competitors', icon: Users, label: 'Competitors' },
  { to: '/crawlers', icon: Bot, label: 'Crawler Config' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { data: config } = useQuery<{ company_name: string }>({
    queryKey: ['config'],
    queryFn: async () => (await axios.get('/api/settings/config')).data,
    staleTime: 30000,
  })

  const companyName = config?.company_name

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">SENTINEL</h1>
            <p className="text-xs text-gray-400">AI Reputation Defense</p>
          </div>
        </div>
      </div>

      {/* Company Name */}
      {companyName && (
        <div className="px-6 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300 truncate">{companyName}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          System Active
        </div>
      </div>
    </aside>
  )
}
