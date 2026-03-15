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
    onSuccess: (data, entitlementId) => {
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      const ent = entitlements?.find((e) => e.id === entitlementId);
      if (ent) {
        setSelected({ entitlement: ent, evaluation: data.evaluation });
      }
    },
  });

  const handleRowClick = (ent: Entitlement) => {
    reEvalMut.mutate(ent.id);
  };

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
                  className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                    selected?.entitlement.id === ent.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleRowClick(ent)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-blue-700 hover:text-blue-900">
                      {ent.name}
                    </div>
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

      {/* Loading indicator for re-evaluation */}
      {reEvalMut.isPending && (
        <div className="text-center py-4 text-blue-600 text-sm">
          Evaluating...
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

          {/* Entitlement Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <span className="text-gray-500 block">Resource</span>
              <span className="font-medium">
                {selected.entitlement.resource_type} / {selected.entitlement.resource_name}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Access Level</span>
              <span className="font-medium capitalize">{selected.entitlement.access_level}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500 block">Description</span>
              <span className="font-medium">{selected.entitlement.description}</span>
            </div>
            {selected.entitlement.conditions && (
              <div className="col-span-2">
                <span className="text-gray-500 block">Conditions</span>
                <span className="font-medium">{selected.entitlement.conditions}</span>
              </div>
            )}
            {selected.entitlement.business_justification && (
              <div className="col-span-2">
                <span className="text-gray-500 block">Business Justification</span>
                <span className="font-medium">{selected.entitlement.business_justification}</span>
              </div>
            )}
            {selected.entitlement.owner && (
              <div>
                <span className="text-gray-500 block">Owner</span>
                <span className="font-medium">{selected.entitlement.owner}</span>
              </div>
            )}
          </div>

          <hr className="mb-6" />

          {/* Evaluation Results with Score Explanation */}
          <EvaluationResults evaluation={selected.evaluation} />
        </div>
      )}
    </div>
  );
}
