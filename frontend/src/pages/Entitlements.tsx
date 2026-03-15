import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listEntitlements, deleteEntitlement, reEvaluate, reEvaluateRbac } from "../lib/api";
import type { Entitlement, Evaluation, RbacEvaluation } from "../types/api";
import EvaluationResults from "../components/EvaluationResults";
import RbacResults from "../components/RbacResults";

type EvalMode = "pbl" | "rbac";

export default function Entitlements() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [viewMode, setViewMode] = useState<EvalMode>("pbl");
  const [selected, setSelected] = useState<{
    entitlement: Entitlement;
    pblEvaluation?: Evaluation;
    rbacEvaluation?: RbacEvaluation;
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

  const reEvalPblMut = useMutation({
    mutationFn: reEvaluate,
    onSuccess: (data, entitlementId) => {
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      const ent = entitlements?.find((e) => e.id === entitlementId);
      if (ent) {
        setSelected((prev) => ({
          ...prev,
          entitlement: ent,
          pblEvaluation: data.evaluation,
        }));
      }
    },
  });

  const reEvalRbacMut = useMutation({
    mutationFn: reEvaluateRbac,
    onSuccess: (data, entitlementId) => {
      queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      const ent = entitlements?.find((e) => e.id === entitlementId);
      if (ent) {
        setSelected((prev) => ({
          ...prev,
          entitlement: ent,
          rbacEvaluation: data.evaluation,
        }));
      }
    },
  });

  const handleRowClick = (ent: Entitlement) => {
    reEvalPblMut.mutate(ent.id);
    reEvalRbacMut.mutate(ent.id);
  };

  const isPending = reEvalPblMut.isPending || reEvalRbacMut.isPending;

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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Roles</th>
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
                  <td className="px-4 py-3">
                    {ent.roles && ent.roles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {ent.roles.slice(0, 2).map((r) => (
                          <span key={r} className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                            {r}
                          </span>
                        ))}
                        {ent.roles.length > 2 && (
                          <span className="text-xs text-gray-400">+{ent.roles.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(ent);
                      }}
                    >
                      Review
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

      {/* Loading indicator */}
      {isPending && (
        <div className="text-center py-4 text-blue-600 text-sm">
          Evaluating...
        </div>
      )}

      {/* Detail Panel */}
      {selected && (selected.pblEvaluation || selected.rbacEvaluation) && (
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
            {selected.entitlement.roles && selected.entitlement.roles.length > 0 && (
              <div>
                <span className="text-gray-500 block">Roles</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.entitlement.roles.map((r) => (
                    <span key={r} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{r}</span>
                  ))}
                </div>
              </div>
            )}
            {selected.entitlement.divisions && selected.entitlement.divisions.length > 0 && (
              <div>
                <span className="text-gray-500 block">Divisions</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.entitlement.divisions.map((d) => (
                    <span key={d} className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">{d}</span>
                  ))}
                </div>
              </div>
            )}
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

          {/* Toggle between PBL and RBAC results */}
          <div className="flex rounded-lg border border-gray-300 mb-6 overflow-hidden">
            <button
              type="button"
              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                viewMode === "pbl"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setViewMode("pbl")}
            >
              PBL Quality
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                viewMode === "rbac"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setViewMode("rbac")}
            >
              RBAC Design
            </button>
          </div>

          {viewMode === "pbl" && selected.pblEvaluation && (
            <EvaluationResults evaluation={selected.pblEvaluation} />
          )}
          {viewMode === "rbac" && selected.rbacEvaluation && (
            <RbacResults evaluation={selected.rbacEvaluation} />
          )}
        </div>
      )}
    </div>
  );
}
