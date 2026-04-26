import { NavLink } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  Grid3X3,
  AlertTriangle,
  Sparkles,
  Building2,
  Settings as SettingsIcon,
  ListChecks,
  ScanSearch,
  FileText,
  Bot,
  Search,
  Wand2,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/heatmap", icon: Grid3X3, label: "Heat Map" },
  { to: "/threats", icon: AlertTriangle, label: "Threat Center" },
  { to: "/ai-content", icon: Sparkles, label: "AI Content" },
  { to: "/competitors", icon: Building2, label: "Competitors" },
  { to: "/actions", icon: ListChecks, label: "Action Queue" },
  { to: "/crawlers", icon: ScanSearch, label: "Crawler Config" },
  { to: "/prompts", icon: Wand2, label: "Prompt Studio" },
  { to: "/agents", icon: Bot, label: "Peec AI Agents" },
  { to: "/analyzer", icon: FileText, label: "Brand Analyzer" },
  { to: "/gap-engine", icon: Search, label: "Gap Engine" },
  { to: "/settings", icon: SettingsIcon, label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-panel border-r border-line flex flex-col z-50">
      <div className="px-6 py-5 border-b border-soft-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sage rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-ink">Peekd</h1>
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">
              Brand Intelligence
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sage-soft text-sage"
                  : "text-muted hover:text-ink hover:bg-pearl"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-soft-line">
        <div className="flex items-center gap-2 text-[11px] text-muted uppercase tracking-wider font-semibold">
          <div className="w-1.5 h-1.5 rounded-full bg-sage" />
          System Active
        </div>
      </div>
    </aside>
  );
}
