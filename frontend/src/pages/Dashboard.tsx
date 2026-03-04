import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { getSummary } from "../lib/api";

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#3b82f6",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};

const TIER_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#22c55e",
};

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["summary"],
    queryFn: getSummary,
  });

  if (isLoading) return <div className="text-gray-500">Loading dashboard...</div>;
  if (error) return <div className="text-red-600">Error: {(error as Error).message}</div>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Entitlements" value={data.total_entitlements} />
        <StatCard label="Evaluated" value={data.evaluated_count} />
        <StatCard
          label="Average Score"
          value={data.average_score.toFixed(1)}
          sub="/100"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Distribution */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Quality Distribution
          </h2>
          {data.quality_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.quality_distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.quality_distribution.map((entry) => (
                    <Cell
                      key={entry.grade}
                      fill={GRADE_COLORS[entry.grade] ?? "#9ca3af"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Tier Distribution */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Risk Tier Distribution
          </h2>
          {data.tier_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.tier_distribution}
                  dataKey="count"
                  nameKey="tier"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ tier, percentage }) =>
                    `${tier} (${percentage}%)`
                  }
                >
                  {data.tier_distribution.map((entry) => (
                    <Cell
                      key={entry.tier}
                      fill={TIER_COLORS[entry.tier] ?? "#9ca3af"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-bold mt-1">
        {value}
        {sub && <span className="text-base font-normal text-gray-400">{sub}</span>}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
      No data yet. Evaluate some entitlements to see charts.
    </div>
  );
}
