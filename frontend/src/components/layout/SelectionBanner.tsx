import { Link } from "react-router-dom";
import { Building2, Settings as SettingsIcon, AlertCircle } from "lucide-react";
import { useCurrentSelection } from "../../hooks/useCurrentSelection";

export function SelectionBanner() {
  const { projectId, brandName, projectName, isConfigured } =
    useCurrentSelection();

  if (!isConfigured) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber bg-amber-soft px-4 py-3 text-sm text-ink">
        <AlertCircle className="w-4 h-4 text-amber" />
        <span>
          No project or brand selected. Configure them on the{" "}
          <Link to="/settings" className="font-semibold text-sage underline">
            Settings page
          </Link>{" "}
          to enable data across the dashboard.
        </span>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-soft-line bg-panel/80 px-4 py-2.5 text-xs">
      <div className="flex items-center gap-4 text-muted">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-sage" />
          <span className="text-[10px] uppercase tracking-wider font-semibold">
            Project
          </span>
          <span className="font-medium text-ink">
            {projectName || projectId.slice(0, 12)}
          </span>
        </span>
        <span className="text-line">·</span>
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider font-semibold">
            Brand
          </span>
          <span className="font-medium text-ink">{brandName || "—"}</span>
        </span>
      </div>
      <Link
        to="/settings"
        className="flex items-center gap-1 text-sage hover:text-graphite font-medium"
      >
        <SettingsIcon className="w-3.5 h-3.5" />
        Change
      </Link>
    </div>
  );
}
