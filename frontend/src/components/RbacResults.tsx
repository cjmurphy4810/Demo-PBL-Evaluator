import type { RbacEvaluation } from "../types/api";
import GradeBadge from "./GradeBadge";
import TierBadge from "./TierBadge";
import ScoreBar from "./ScoreBar";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-50 border-red-300 text-red-900",
  high: "bg-orange-50 border-orange-300 text-orange-900",
  medium: "bg-yellow-50 border-yellow-300 text-yellow-900",
  low: "bg-blue-50 border-blue-300 text-blue-900",
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-blue-500 text-white",
};

const DIMENSION_LABELS: Record<string, string> = {
  title_description_alignment: "Title-Description Alignment",
  role_appropriateness: "Role Appropriateness",
  division_relevance: "Division Relevance",
  separation_of_duties: "Separation of Duties",
  scope_definition: "Scope Definition",
};

const DIMENSION_WEIGHTS: Record<string, string> = {
  title_description_alignment: "25%",
  role_appropriateness: "25%",
  separation_of_duties: "25%",
  scope_definition: "15%",
  division_relevance: "10%",
};

export default function RbacResults({
  evaluation,
}: {
  evaluation: RbacEvaluation;
}) {
  const dims = evaluation.dimensions;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold tabular-nums">
            {evaluation.final_score.toFixed(1)}
          </div>
          <div className="space-y-1">
            <div className="flex gap-2">
              <GradeBadge grade={evaluation.quality_grade} />
              <TierBadge tier={evaluation.risk_tier} />
            </div>
            <div className="text-xs text-gray-500">RBAC Design Review</div>
          </div>
        </div>
      </div>

      {/* Dimension Scores */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          RBAC Dimensions
        </h3>
        {Object.entries(dims).map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between text-xs text-gray-500 mb-0.5">
              <span>{DIMENSION_LABELS[key] ?? key}</span>
              <span>{DIMENSION_WEIGHTS[key] ?? ""} weight</span>
            </div>
            <ScoreBar label="" score={value} />
          </div>
        ))}
      </div>

      {/* Findings */}
      {evaluation.findings.length > 0 && (
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Design Findings
          </h3>
          {evaluation.findings.map((finding, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 ${SEVERITY_STYLES[finding.severity] ?? ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${SEVERITY_BADGE[finding.severity] ?? ""}`}
                >
                  {finding.severity}
                </span>
                <span className="text-xs font-semibold">{finding.category}</span>
              </div>
              <p className="text-sm leading-relaxed">{finding.description}</p>
              <p className="text-sm leading-relaxed mt-2">
                <strong>Recommendation:</strong> {finding.recommendation}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {evaluation.findings.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900">
          <strong>No design issues found.</strong> This entitlement's RBAC design
          aligns with separation of duties principles and role-based access
          control best practices.
        </div>
      )}
    </div>
  );
}
