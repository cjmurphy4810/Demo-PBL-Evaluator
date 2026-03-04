import { Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Evaluate from "./pages/Evaluate";
import Entitlements from "./pages/Entitlements";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/evaluate", label: "Evaluate" },
  { to: "/entitlements", label: "Entitlements" },
];

export default function App() {
  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-8">
          <span className="text-lg font-bold text-gray-900">PBL Evaluator</span>
          <div className="flex gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/evaluate" element={<Evaluate />} />
          <Route path="/entitlements" element={<Entitlements />} />
        </Routes>
      </main>
    </div>
  );
}
