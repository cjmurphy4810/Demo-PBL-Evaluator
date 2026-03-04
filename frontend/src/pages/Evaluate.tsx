import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { evaluateInline } from "../lib/api";
import type { EvaluateRequest, Evaluation } from "../types/api";
import EvaluationResults from "../components/EvaluationResults";

const INITIAL: EvaluateRequest = {
  name: "",
  description: "",
  resource_type: "",
  resource_name: "",
  access_level: "read",
};

const ACCESS_LEVELS = ["read", "view", "write", "read-write", "execute", "admin", "full"];
const RESOURCE_TYPES = ["database", "application", "API", "infrastructure", "storage", "network"];

export default function Evaluate() {
  const [form, setForm] = useState<EvaluateRequest>(INITIAL);
  const [result, setResult] = useState<Evaluation | null>(null);

  const mutation = useMutation({
    mutationFn: evaluateInline,
    onSuccess: (data) => setResult(data.evaluation),
  });

  const set = (field: keyof EvaluateRequest) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value || undefined }));

  const canSubmit = form.name && form.description && form.resource_type && form.resource_name;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Input Form */}
      <div>
        <h1 className="text-2xl font-bold mb-6">Evaluate Entitlement</h1>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mutation.mutate(form);
          }}
        >
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
            disabled={!canSubmit || mutation.isPending}
            className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? "Evaluating..." : "Evaluate"}
          </button>

          {mutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {mutation.error.message}
            </div>
          )}
        </form>
      </div>

      {/* Results */}
      <div>
        {result ? (
          <>
            <h2 className="text-2xl font-bold mb-6">Results</h2>
            <EvaluationResults evaluation={result} />
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
