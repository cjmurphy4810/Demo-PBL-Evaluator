import type { Evaluation } from "../types/api";
import GradeBadge from "./GradeBadge";
import TierBadge from "./TierBadge";
import ScoreBar from "./ScoreBar";

export default function EvaluationResults({
  evaluation,
}: {
  evaluation: Evaluation;
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
            <div className="text-xs text-gray-500">
              {evaluation.evaluation_method === "hybrid"
                ? "Hybrid (Rules + LLM)"
                : "Rules Only"}
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div>Rule: {evaluation.rule_score.toFixed(1)}</div>
          {evaluation.llm_score != null && (
            <div>LLM: {evaluation.llm_score.toFixed(1)}</div>
          )}
        </div>
      </div>

      {/* Dimension Scores */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Dimensions
        </h3>
        <ScoreBar label="Readability" score={dims.readability} />
        <ScoreBar label="Completeness" score={dims.completeness} />
        <ScoreBar label="Clarity" score={dims.clarity} />
        <ScoreBar label="Specificity" score={dims.specificity} />
        <ScoreBar label="Consistency" score={dims.consistency} />
        {dims.actionability != null && (
          <ScoreBar label="Actionability" score={dims.actionability} />
        )}
      </div>

      {/* Flags */}
      {evaluation.flags.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Issues Found
          </h3>
          <div className="flex flex-wrap gap-2">
            {evaluation.flags.map((flag) => (
              <span
                key={flag}
                className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded border border-red-200"
              >
                {flag.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {evaluation.recommendations.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Recommendations
          </h3>
          <ul className="space-y-2">
            {evaluation.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-blue-500 shrink-0">-</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
