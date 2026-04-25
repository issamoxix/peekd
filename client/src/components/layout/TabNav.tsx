import { useProjectContext } from "../../context/ProjectContext";

const TABS = ["Gap Analysis", "Content Strategy", "Progress Tracker"];

export function TabNav() {
  const { activeTab, setActiveTab } = useProjectContext();

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-8">
        {TABS.map((tab, index) => (
          <button
            key={tab}
            onClick={() => setActiveTab(index)}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === index
                ? "border-teal text-teal"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
