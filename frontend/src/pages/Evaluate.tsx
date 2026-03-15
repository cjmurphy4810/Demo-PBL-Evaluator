import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { evaluateInline, evaluateRbacInline } from "../lib/api";
import type { EvaluateRequest, Evaluation, RbacEvaluation } from "../types/api";
import { ROLE_CATEGORIES, DIVISION_CATEGORIES } from "../types/api";
import EvaluationResults from "../components/EvaluationResults";
import RbacResults from "../components/RbacResults";
import MultiSelect from "../components/MultiSelect";

type EvalMode = "pbl" | "rbac";

const INITIAL: EvaluateRequest = {
  name: "",
  description: "",
  resource_type: "",
  resource_name: "",
  access_level: "read",
  roles: [],
  divisions: [],
};

const ACCESS_LEVELS = ["read", "view", "write", "read-write", "execute", "admin", "full"];
const RESOURCE_TYPES = ["database", "application", "API", "infrastructure", "storage", "network"];

export default function Evaluate() {
  const [form, setForm] = useState<EvaluateRequest>(INITIAL);
  const [mode, setMode] = useState<EvalMode>("pbl");
  const [pblResult, setPblResult] = useState<Evaluation | null>(null);
  const [rbacResult, setRbacResult] = useState<RbacEvaluation | null>(null);

  const pblMutation = useMutation({
    mutationFn: evaluateInline,
    onSuccess: (data) => {
      setPblResult(data.evaluation);
      setRbacResult(null);
    },
  });

  const rbacMutation = useMutation({
    mutationFn: evaluateRbacInline,
    onSuccess: (data) => {
      setRbacResult(data.evaluation);
      setPblResult(null);
    },
  });

  const set = (field: keyof EvaluateRequest) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value || undefined }));

  const canSubmit = form.name && form.description && form.resource_type && form.resource_name;
  const isPending = pblMutation.isPending || rbacMutation.isPending;
  const error = pblMutation.error || rbacMutation.error;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (mode === "pbl") {
      pblMutation.mutate(form);
    } else {
      rbacMutation.mutate(form);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Input Form */}
      <div>
        <h1 className="text-2xl font-bold mb-4">Evaluate Entitlement</h1>

        {/* Mode Toggle */}
        <div className="flex rounded-lg border border-gray-300 mb-6 overflow-hidden">
          <button
            type="button"
            className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${
              mode === "pbl"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setMode("pbl")}
          >
            PBL Quality Review
          </button>
          <button
            type="button"
            className={`flex-1 py-2.5 px-4 text-sm font-medium transition-colors ${
              mode === "rbac"
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setMode("rbac")}
          >
            RBAC Design Review
          </button>
        </div>

        {/* Mode description */}
        <div className={`text-xs mb-4 p-2 rounded ${mode === "pbl" ? "bg-blue-50 text-blue-700" : "bg-indigo-50 text-indigo-700"}`}>
          {mode === "pbl"
            ? "Evaluates the readability, completeness, clarity, specificity, and consistency of the entitlement's plain business language."
            : "Evaluates RBAC design quality: title-description alignment, role appropriateness, separation of duties compliance, and scope definition."}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Entitlement Name" required>
            <input
              className="input"
              placeholder="e.g., Production DB Admin"
              value={form.name}
              onChange={set("name")}
            />
          </Field>

          <Field label="Description" required>
            <textarea
              className="input min-h-[120px]"
              placeholder="Describe what access this entitlement grants, in plain business language..."
              value={form.description}
              onChange={set("description")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Resource Type" required>
              <select className="input" value={form.resource_type} onChange={set("resource_type")}>
                <option value="">Select...</option>
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>

            <Field label="Resource Name" required>
              <input
                className="input"
                placeholder="e.g., payments-db-prod"
                value={form.resource_name}
                onChange={set("resource_name")}
              />
            </Field>
          </div>

          <Field label="Access Level" required>
            <select className="input" value={form.access_level} onChange={set("access_level")}>
              {ACCESS_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>

          {/* Roles multi-select */}
          <MultiSelect
            label="Assigned Roles"
            options={ROLE_CATEGORIES}
            selected={form.roles ?? []}
            onChange={(roles) => setForm((prev) => ({ ...prev, roles }))}
            required={mode === "rbac"}
          />

          {/* Divisions multi-select */}
          <MultiSelect
            label="Business Divisions"
            options={DIVISION_CATEGORIES}
            selected={form.divisions ?? []}
            onChange={(divisions) => setForm((prev) => ({ ...prev, divisions }))}
          />

          <Field label="Conditions">
            <textarea
              className="input min-h-[80px]"
              placeholder="e.g., Requires VPN, MFA, and manager approval..."
              value={form.conditions ?? ""}
              onChange={set("conditions")}
            />
          </Field>

          <Field label="Business Justification">
            <textarea
              className="input min-h-[80px]"
              placeholder="Why is this access needed?"
              value={form.business_justification ?? ""}
              onChange={set("business_justification")}
            />
          </Field>

          <Field label="Owner">
            <input
              className="input"
              placeholder="Team or individual responsible"
              value={form.owner ?? ""}
              onChange={set("owner")}
            />
          </Field>

          <button
            type="submit"
            disabled={!canSubmit || isPending}
            className={`w-full py-2.5 px-4 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              mode === "pbl"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isPending
              ? "Evaluating..."
              : mode === "pbl"
                ? "Evaluate PBL Quality"
                : "Evaluate RBAC Design"}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error.message}
            </div>
          )}
        </form>
      </div>

      {/* Results */}
      <div>
        {pblResult ? (
          <>
            <h2 className="text-2xl font-bold mb-6">PBL Quality Results</h2>
            <EvaluationResults evaluation={pblResult} />
          </>
        ) : rbacResult ? (
          <>
            <h2 className="text-2xl font-bold mb-6">RBAC Design Results</h2>
            <RbacResults evaluation={rbacResult} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Submit an entitlement to see evaluation results
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
