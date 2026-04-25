import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import HeatMap from './pages/HeatMap'
import ThreatCenter from './pages/ThreatCenter'
import ActionQueue from './pages/ActionQueue'
import Competitors from './pages/Competitors'
import CrawlerConfig from './pages/CrawlerConfig'
import Settings from './pages/Settings'

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-950">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/heatmap" element={<HeatMap />} />
            <Route path="/threats" element={<ThreatCenter />} />
            <Route path="/actions" element={<ActionQueue />} />
            <Route path="/competitors" element={<Competitors />} />
            <Route path="/crawlers" element={<CrawlerConfig />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
