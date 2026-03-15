import type { Evaluation } from "../types/api";

interface DimensionExplanation {
  name: string;
  score: number;
  weight: string;
  explanation: string;
  improvement: string | null;
}

function getDimensionExplanations(evaluation: Evaluation): DimensionExplanation[] {
  const dims = evaluation.dimensions;
  const flags = new Set(evaluation.flags);
  const explanations: DimensionExplanation[] = [];

  // --- Readability ---
  {
    const score = dims.readability;
    let explanation: string;
    let improvement: string | null = null;

    if (score >= 80) {
      explanation =
        "The entitlement text is written at an appropriate reading level and uses clear, accessible sentence structures that non-technical stakeholders can follow.";
    } else {
      const issues: string[] = [];
      if (flags.has("high_gunning_fog"))
        issues.push("the text uses complex, multi-syllable vocabulary that raises the Gunning Fog Index above acceptable thresholds");
      if (flags.has("long_sentences"))
        issues.push("sentences are excessively long, making the text harder to parse");
      if (flags.has("text_too_short"))
        issues.push("the description is too brief to generate meaningful readability metrics");

      explanation = `This entitlement scored ${score.toFixed(0)}/100 in readability because ${issues.length > 0 ? issues.join(", and ") : "the overall text complexity exceeds recommended levels for business documentation"}.`;
      improvement =
        "Consider rewriting with shorter sentences (under 20 words each), replacing multi-syllable technical terms with simpler alternatives, and ensuring the description is detailed enough to be self-explanatory. Aim for language that a business manager without technical background could read and immediately understand.";
    }

    explanations.push({ name: "Readability", score, weight: "25%", explanation, improvement });
  }

  // --- Completeness ---
  {
    const score = dims.completeness;
    let explanation: string;
    let improvement: string | null = null;

    if (score >= 80) {
      explanation =
        "The entitlement definition includes all or most of the essential fields: resource identification, access level, conditions, business justification, and ownership.";
    } else {
      const missing: string[] = [];
      if (flags.has("missing_conditions"))
        missing.push("conditions or constraints governing when this access applies");
      if (flags.has("missing_business_justification"))
        missing.push("a business justification explaining why this access is needed");

      explanation = `This entitlement scored ${score.toFixed(0)}/100 in completeness because it is missing ${missing.length > 0 ? missing.join(" and ") : "one or more required fields"}.`;
      improvement =
        "Add the missing fields to create a complete entitlement record. Every entitlement should clearly state: what resource is accessed, at what level, under what conditions, why the access is needed, and who is responsible. Complete records are essential for audit readiness and ISO 27001 compliance.";
    }

    explanations.push({ name: "Completeness", score, weight: "25%", explanation, improvement });
  }

  // --- Clarity ---
  {
    const score = dims.clarity;
    let explanation: string;
    let improvement: string | null = null;

    if (score >= 80) {
      explanation =
        "The entitlement language is clear and avoids common pitfalls like technical jargon, passive voice, and ambiguous terminology.";
    } else {
      const issues: string[] = [];
      if (flags.has("jargon_detected"))
        issues.push("technical jargon or acronyms that non-technical reviewers may not understand");
      if (flags.has("high_passive_voice"))
        issues.push("passive voice constructions that obscure who performs the action and who is affected");
      if (flags.has("ambiguous_terms"))
        issues.push("vague terms like 'various,' 'some,' 'etc.,' or 'as needed' that leave the scope open to interpretation");
      if (flags.has("complex_sentences"))
        issues.push("overly complex sentence structures that reduce comprehension");

      explanation = `This entitlement scored ${score.toFixed(0)}/100 in clarity because the text contains ${issues.length > 0 ? issues.join("; ") : "language that reduces comprehension for a general business audience"}.`;
      improvement =
        "Replace technical acronyms with their full, plain-language equivalents (e.g., use 'identity management system' instead of 'IAM'). Rewrite passive sentences in active voice (e.g., 'The developer accesses...' instead of 'Access is granted to...'). Replace vague terms with specific quantities or named items.";
    }

    explanations.push({ name: "Clarity", score, weight: "20%", explanation, improvement });
  }

  // --- Specificity ---
  {
    const score = dims.specificity;
    let explanation: string;
    let improvement: string | null = null;

    if (score >= 80) {
      explanation =
        "The entitlement names specific resources, systems, and access boundaries rather than using generic references.";
    } else {
      const issues: string[] = [];
      if (flags.has("vague_resources"))
        issues.push("generic resource references like 'the system,' 'the database,' or 'infrastructure' instead of naming specific systems");
      if (flags.has("vague_scope"))
        issues.push("broad scope language like 'full access,' 'as needed,' or 'various permissions' instead of enumerating exact permissions");

      explanation = `This entitlement scored ${score.toFixed(0)}/100 in specificity because the text uses ${issues.length > 0 ? issues.join(", and ") : "language that does not clearly delineate what is and is not included in this access grant"}.`;
      improvement =
        "Name the exact systems, databases, APIs, or applications by their actual identifiers (e.g., 'ProductionDB-West-2' instead of 'the database'). Define the exact permissions granted (e.g., 'read and list objects in the reports S3 bucket' instead of 'access to storage'). Specific entitlements enforce least-privilege and make access reviews actionable.";
    }

    explanations.push({ name: "Specificity", score, weight: "15%", explanation, improvement });
  }

  // --- Consistency ---
  {
    const score = dims.consistency;
    let explanation: string;
    let improvement: string | null = null;

    if (score >= 80) {
      explanation =
        "The entitlement uses consistent terminology throughout, and the described actions align with the stated access level.";
    } else {
      const issues: string[] = [];
      if (flags.has("inconsistent_access_level"))
        issues.push("the description mentions actions (like write, delete, or admin operations) that conflict with the stated access level");
      const mixedFlags = evaluation.flags.filter((f) => f.startsWith("mixed_terminology_"));
      if (mixedFlags.length > 0) {
        const terms = mixedFlags.map((f) => f.replace("mixed_terminology_", ""));
        issues.push(`the text mixes abbreviations with their full forms (${terms.map((t) => `'${t}'`).join(", ")}), which creates ambiguity`);
      }

      explanation = `This entitlement scored ${score.toFixed(0)}/100 in consistency because ${issues.length > 0 ? issues.join("; and ") : "the terminology is not used uniformly throughout the definition"}.`;
      improvement =
        "Choose one form for each term and use it consistently throughout (e.g., always 'database' or always 'DB,' but not both). Ensure the access level field matches the actions described — if the level is 'read,' the description should not reference write, modify, or delete operations.";
    }

    explanations.push({ name: "Consistency", score, weight: "15%", explanation, improvement });
  }

  return explanations;
}

function getOverallExplanation(evaluation: Evaluation): string {
  const grade = evaluation.quality_grade;
  const score = evaluation.final_score;

  if (grade === "A") {
    return `This entitlement received a grade of A (${score.toFixed(1)}/100), indicating excellent plain business language quality. The definition is clear, complete, and ready for stakeholder review and audit.`;
  }
  if (grade === "B") {
    return `This entitlement received a grade of B (${score.toFixed(1)}/100), indicating good quality with minor areas for improvement. Review the dimension details below to identify opportunities to strengthen the language further.`;
  }
  if (grade === "C") {
    return `This entitlement received a grade of C (${score.toFixed(1)}/100), indicating adequate but improvable quality. Several dimensions need attention to bring this entitlement to a standard suitable for audit and cross-functional review.`;
  }
  if (grade === "D") {
    return `This entitlement received a grade of D (${score.toFixed(1)}/100), indicating poor documentation quality. Significant revisions are needed across multiple dimensions. Focus on the areas flagged below to bring the language up to an acceptable standard.`;
  }
  return `This entitlement received a grade of F (${score.toFixed(1)}/100), indicating the documentation does not meet minimum quality standards. The entitlement definition requires substantial rewriting. Address each dimension flagged below, starting with the lowest-scoring areas.`;
}

export default function ScoreExplanation({
  evaluation,
}: {
  evaluation: Evaluation;
}) {
  const overallExplanation = getOverallExplanation(evaluation);
  const dimensions = getDimensionExplanations(evaluation);
  const needsWork = dimensions.filter((d) => d.improvement !== null);

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Score Explanation
      </h3>

      {/* Overall */}
      <p className="text-sm text-gray-700 leading-relaxed">{overallExplanation}</p>

      {/* Per-dimension breakdown */}
      <div className="space-y-3">
        {dimensions.map((dim) => (
          <div
            key={dim.name}
            className={`rounded-lg p-3 text-sm ${
              dim.improvement
                ? "bg-amber-50 border border-amber-200"
                : "bg-green-50 border border-green-200"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">
                {dim.name}{" "}
                <span
                  className={
                    dim.improvement ? "text-amber-700" : "text-green-700"
                  }
                >
                  ({dim.score.toFixed(0)}/100)
                </span>
              </span>
              <span className="text-xs text-gray-500">{dim.weight} weight</span>
            </div>
            <p
              className={`leading-relaxed ${
                dim.improvement ? "text-amber-900" : "text-green-900"
              }`}
            >
              {dim.explanation}
            </p>
            {dim.improvement && (
              <p className="mt-2 text-amber-800 leading-relaxed">
                <strong>To improve:</strong> {dim.improvement}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Summary action */}
      {needsWork.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
          <strong>Focus areas:</strong> The dimensions with the most room for
          improvement are{" "}
          <strong>
            {needsWork
              .sort((a, b) => a.score - b.score)
              .map((d) => d.name)
              .join(", ")}
          </strong>
          . Addressing these will have the greatest impact on raising the overall
          score toward 100%.
        </div>
      )}
    </div>
  );
}
