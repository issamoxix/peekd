import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { Analyzer } from "./pages/Analyzer";
import Agents from "./pages/Agents";
import Dashboard from "./pages/Dashboard";
import HeatMap from "./pages/HeatMap";
import ThreatCenter from "./pages/ThreatCenter";
import AIContent from "./pages/AIContent";
import ActionQueue from "./pages/ActionQueue";
import Competitors from "./pages/Competitors";
import CrawlerConfig from "./pages/CrawlerConfig";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-950">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 text-white">
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
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
