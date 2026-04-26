import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Sidebar, SelectionBanner } from "./components/layout";
import { Analyzer } from "./pages/Analyzer";
import Agents from "./pages/Agents";
import Adblume from "./pages/Adblume";
import Dashboard from "./pages/Dashboard";
import HeatMap from "./pages/HeatMap";
import ThreatCenter from "./pages/ThreatCenter";
import AIContent from "./pages/AIContent";
import ActionQueue from "./pages/ActionQueue";
import Competitors from "./pages/Competitors";
import CrawlerConfig from "./pages/CrawlerConfig";
import Settings from "./pages/Settings";

const HIDE_BANNER_ON = new Set(["/settings", "/adblume"]);

function MainArea() {
  const { pathname } = useLocation();
  const showBanner = !HIDE_BANNER_ON.has(pathname);

  return (
    <main className="flex-1 ml-64 p-8 text-ink">
      {showBanner && <SelectionBanner />}
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/heatmap" element={<HeatMap />} />
        <Route path="/threats" element={<ThreatCenter />} />
        <Route path="/ai-content" element={<AIContent />} />
        <Route path="/competitors" element={<Competitors />} />
        <Route path="/actions" element={<ActionQueue />} />
        <Route path="/crawlers" element={<CrawlerConfig />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/analyzer" element={<Analyzer />} />
        <Route path="/adblume" element={<Adblume />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <MainArea />
      </div>
    </BrowserRouter>
  );
}
