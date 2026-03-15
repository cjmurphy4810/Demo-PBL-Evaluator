import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listEntitlements, deleteEntitlement, reEvaluate } from "../lib/api";
import type { Entitlement, Evaluation } from "../types/api";
import EvaluationResults from "../components/EvaluationResults";

export default function Entitlements() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [selected, setSelected] = useState<{
    entitlement: Entitlement;
    evaluation: Evaluation;
  } | null>(null);

  const queryClient = useQueryClient();

  const { data: entitlements, isLoading } = useQuery({
    queryKey: ["entitlements", search, tierFilter, gradeFilter],
    queryFn: () =>
      listEntitlements({
        search: search || undefined,
        risk_tier: tierFilter || undefined,
        quality_grade: gradeFilter || undefined,
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteEntitlement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      setSelected(null);
    },
  });

  const reEvalMut = useMutation({
    mutationFn: reEvaluate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      if (selected) {
        setSelected({ entitlement: selected.entitlement, evaluation: data.evaluation });
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Entitlements</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          className="input flex-1"
          placeholder="Search by name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input w-36"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="">All Tiers</option>
          {["critical", "high", "medium", "low"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="input w-32"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
        >
          <option value="">All Grades</option>
          {["A", "B", "C", "D", "F"].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : !entitlements?.length ? (
        <div className="text-center py-12 text-gray-400">
          No entitlements found. Go to Evaluate to create one.
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Resource</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Access</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entitlements.map((ent) => (
                <tr
                  key={ent.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    // For now, show basic info without evaluation
                    // A full implementation would fetch evaluation history
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{ent.name}</div>
                    <div className="text-gray-500 text-xs truncate max-w-xs">
                      {ent.description}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ent.resource_type} / {ent.resource_name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize">{ent.access_level}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{ent.source}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        reEvalMut.mutate(ent.id);
                      }}
                    >
                      Re-evaluate
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this entitlement?")) {
                          deleteMut.mutate(ent.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">{selected.entitlement.name}</h2>
            <button
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <EvaluationResults evaluation={selected.evaluation} />
        </div>
      )}
    </div>
  );
}
