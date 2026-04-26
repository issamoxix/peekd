import { NavLink } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  Grid3X3,
  AlertTriangle,
  Sparkles,
  Target,
  Building2,
  Settings as SettingsIcon,
  ListChecks,
  ScanSearch,
  FileText,
  Bot,
  Search,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/heatmap", icon: Grid3X3, label: "Heat Map" },
  { to: "/threats", icon: AlertTriangle, label: "Threat Center" },
  { to: "/ai-content", icon: Sparkles, label: "AI Content" },
  { to: "/competitors", icon: Building2, label: "Competitors" },
  { to: "/actions", icon: ListChecks, label: "Action Queue" },
  { to: "/crawlers", icon: ScanSearch, label: "Crawler Config" },
  { to: "/agents", icon: Bot, label: "Peec AI Agents" },
  { to: "/analyzer", icon: FileText, label: "Brand Analyzer" },
  { to: "/adblume", icon: Search, label: "Adblume Gap Engine" },
  { to: "/settings", icon: SettingsIcon, label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-50">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Sentinel</h1>
            <p className="text-xs text-gray-400">Brand & Reputation Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          System Active
        </div>
      </div>
    </aside>
  );
}
