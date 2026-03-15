// RBAC Design Review Engine
// Evaluates entitlement design quality from a role-based access control perspective
// Aligned with ISACA CISA Review Manual — Separation of Duties, NIST AC-5, ISO 27001 A.9

import type { RbacDimensions, RbacFinding } from "../types/api";

export interface RbacResult {
  final_score: number;
  quality_grade: string;
  risk_tier: string;
  dimensions: RbacDimensions;
  flags: string[];
  recommendations: string[];
  findings: RbacFinding[];
}

// --- Separation of Duties conflict matrix ---
// Roles that should NOT share the same entitlement without explicit justification
const SOD_CONFLICTS: [string, string, string][] = [
  ["Developer", "Business Ops", "Developers should not have direct business operations access — violates change management controls"],
  ["Developer", "Security Admin", "Development and security administration must be segregated to prevent self-approval of security exceptions"],
  ["Developer", "Auditor", "Development and audit functions must remain independent per ISACA CISA standards"],
  ["Developer", "Compliance Officer", "Development and compliance oversight must be segregated"],
  ["Tester", "Developer", "Testing and development should be performed by separate individuals to ensure independent validation"],
  ["System Admin", "Auditor", "System administration and audit must be independent — auditors cannot audit systems they administer"],
  ["System Admin", "Security Admin", "System and security administration combined creates excessive privileged access without oversight"],
  ["Database Admin", "Developer", "Database administration and development combined allows uncontrolled schema and data changes"],
  ["Database Admin", "Auditor", "Database administrators cannot independently audit data they manage"],
  ["External Customer", "System Admin", "External customers must never have system administration privileges"],
  ["External Customer", "Database Admin", "External customers must never have database administration access"],
  ["External Customer", "Security Admin", "External customers must never have security administration access"],
  ["External Vendor", "Security Admin", "External vendors must not have security administration access without strict controls"],
  ["External Vendor", "Database Admin", "External vendors should not have database administration access"],
  ["Executive Management", "Developer", "Executive management with development access creates segregation risk for approval workflows"],
];

// --- Role-to-access-level appropriateness matrix ---
// What access levels are typically appropriate for each role
const ROLE_ACCESS_GUIDELINES: Record<string, { appropriate: string[]; risky: string[]; reason: string }> = {
  "Developer": {
    appropriate: ["read", "read-write", "write"],
    risky: ["admin", "full", "execute"],
    reason: "Developers typically need read-write access to development environments but should not have admin or execute privileges in production",
  },
  "Tester": {
    appropriate: ["read", "read-write", "execute"],
    risky: ["admin", "full"],
    reason: "Testers need read and execute access for test environments but admin access exceeds their functional requirements",
  },
  "Business Tester": {
    appropriate: ["read", "view", "execute"],
    risky: ["write", "read-write", "admin", "full"],
    reason: "Business testers should have read/execute access for UAT but write access to underlying systems is excessive",
  },
  "Business Ops": {
    appropriate: ["read", "read-write", "view"],
    risky: ["admin", "full", "execute"],
    reason: "Business operations staff need functional access but admin-level privileges violate least-privilege principles",
  },
  "Business Analyst": {
    appropriate: ["read", "view"],
    risky: ["write", "read-write", "admin", "full", "execute"],
    reason: "Business analysts should have read-only access for analysis — write access is outside their functional responsibility",
  },
  "External Customer": {
    appropriate: ["read", "view"],
    risky: ["write", "read-write", "admin", "full", "execute"],
    reason: "External customers must have minimal access — any write or admin access represents a significant security risk",
  },
  "External Vendor": {
    appropriate: ["read", "view"],
    risky: ["admin", "full", "execute"],
    reason: "External vendors should have tightly scoped access with explicit contractual justification for anything beyond read-only",
  },
  "Auditor": {
    appropriate: ["read", "view"],
    risky: ["write", "read-write", "admin", "full", "execute"],
    reason: "Auditors must have read-only access to maintain independence — write access compromises audit integrity",
  },
  "Compliance Officer": {
    appropriate: ["read", "view"],
    risky: ["write", "read-write", "admin", "full", "execute"],
    reason: "Compliance officers require read-only access for oversight — write access creates conflict of interest",
  },
  "Service Desk": {
    appropriate: ["read", "view", "execute"],
    risky: ["admin", "full"],
    reason: "Service desk staff need operational access but full admin privileges exceed their support function",
  },
  "Security Admin": {
    appropriate: ["read", "read-write", "admin"],
    risky: ["full"],
    reason: "Security admins need elevated access for security functions but unrestricted 'full' access should be avoided",
  },
  "System Admin": {
    appropriate: ["read", "read-write", "admin", "execute"],
    risky: ["full"],
    reason: "System admins need broad access but 'full' unrestricted access should require additional approval",
  },
  "Database Admin": {
    appropriate: ["read", "read-write", "admin", "execute"],
    risky: ["full"],
    reason: "Database admins need database-level access but unlimited 'full' access should be constrained",
  },
};

// --- Keywords that suggest specific functional areas ---
const ROLE_KEYWORDS: Record<string, string[]> = {
  "Developer": ["code", "develop", "build", "deploy", "commit", "merge", "branch", "repository", "IDE", "debug", "compile", "pipeline"],
  "Tester": ["test", "QA", "quality", "regression", "automation", "selenium", "junit", "coverage", "defect", "bug"],
  "Business Tester": ["UAT", "user acceptance", "business validation", "scenario", "sign-off", "business test"],
  "Tech Ops": ["monitor", "incident", "alert", "uptime", "SLA", "ticket", "operational", "maintenance", "patching"],
  "Business Ops": ["transaction", "processing", "settlement", "reconciliation", "booking", "adjustment", "override"],
  "Security Admin": ["firewall", "certificate", "encryption", "vulnerability", "patch", "antivirus", "intrusion", "SIEM"],
  "Database Admin": ["schema", "backup", "restore", "index", "query", "tablespace", "replication", "migration"],
  "Auditor": ["audit", "review", "compliance", "finding", "evidence", "control", "attestation", "SOX"],
  "External Customer": ["customer portal", "self-service", "account view", "statement", "balance", "transfer"],
};

// --- Division-relevant keywords ---
const DIVISION_KEYWORDS: Record<string, string[]> = {
  "Wholesale Banking": ["wholesale", "corporate", "institutional", "syndicated", "treasury management", "commercial lending"],
  "Retail Banking": ["retail", "branch", "consumer", "checking", "savings", "personal", "ATM"],
  "Trading": ["trading", "market", "position", "portfolio", "execution", "settlement", "derivative", "FX", "equity", "fixed income"],
  "Consumer Lending": ["loan", "mortgage", "auto loan", "personal loan", "origination", "underwriting", "servicing"],
  "Business Banking": ["small business", "SME", "merchant", "business account", "commercial", "business lending"],
  "Credit Cards": ["credit card", "rewards", "billing", "statement", "chargeback", "dispute", "card management"],
  "Digital Customer Experience": ["digital", "mobile", "online banking", "app", "UX", "customer experience", "web portal"],
  "Wealth Management": ["wealth", "advisory", "investment", "trust", "estate", "private banking", "portfolio management"],
  "Risk Management": ["risk", "exposure", "limit", "VaR", "stress test", "credit risk", "market risk", "operational risk"],
  "Compliance": ["compliance", "regulatory", "KYC", "AML", "BSA", "sanctions", "OFAC", "suspicious activity"],
  "Information Technology": ["IT", "infrastructure", "server", "network", "cloud", "DevOps", "ITSM"],
  "Operations": ["operations", "processing", "clearance", "settlement", "reconciliation", "back office"],
};

// --- Scoring functions ---

function scoreTitleDescriptionAlignment(name: string, description: string, flags: string[], findings: RbacFinding[]): number {
  let score = 100;
  const titleLower = name.toLowerCase().replace(/[_\-]/g, " ");
  const descLower = description.toLowerCase();

  // Extract meaningful words from title (skip common filler)
  const fillerWords = new Set(["the", "a", "an", "for", "to", "of", "and", "or", "in", "on", "with", "by", "is", "are", "view", "access", "entitlement", "permission"]);
  const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2 && !fillerWords.has(w));

  if (titleWords.length === 0) {
    score -= 30;
    flags.push("title_lacks_meaningful_terms");
    findings.push({
      severity: "high",
      category: "Title-Description Alignment",
      description: "The entitlement title does not contain meaningful terms that describe what access is granted.",
      recommendation: "Rename the entitlement to clearly reflect its purpose, such as 'Wholesale_Trading_ReadOnly' or 'DevTeam_AMES_ReadWrite'.",
    });
    return Math.max(0, score);
  }

  // Check how many title words appear in description
  const matchedWords = titleWords.filter(w => descLower.includes(w));
  const matchRatio = matchedWords.length / titleWords.length;

  if (matchRatio < 0.3) {
    score -= 40;
    flags.push("title_description_mismatch");
    findings.push({
      severity: "critical",
      category: "Title-Description Mismatch",
      description: `The entitlement title "${name}" does not align with the description. Key terms from the title (${titleWords.join(", ")}) are largely absent from the description text.`,
      recommendation: "Either rename the entitlement to match what the description actually describes, or rewrite the description to accurately reflect the entitlement title. Mismatched titles create confusion during access reviews and certification.",
    });
  } else if (matchRatio < 0.6) {
    score -= 20;
    flags.push("title_description_partial_mismatch");
    findings.push({
      severity: "medium",
      category: "Title-Description Alignment",
      description: `The entitlement title partially aligns with the description, but some title terms (${titleWords.filter(w => !descLower.includes(w)).join(", ")}) are not reflected in the description.`,
      recommendation: "Strengthen the alignment by ensuring the description explicitly addresses all concepts referenced in the title.",
    });
  }

  // Check for contradictions: title says one thing, description says opposite
  const restrictiveTerms = ["only", "restricted", "limited", "exclusive"];
  const titleHasRestriction = restrictiveTerms.some(t => titleLower.includes(t));
  const broadTerms = ["all users", "anyone", "unrestricted", "full access", "no limitations", "any user"];
  const descHasBroad = broadTerms.some(t => descLower.includes(t));

  if (titleHasRestriction && descHasBroad) {
    score -= 30;
    flags.push("title_description_contradiction");
    findings.push({
      severity: "critical",
      category: "Title-Description Contradiction",
      description: "The title implies restricted access but the description uses broad, unrestricted language. This creates a significant access control risk.",
      recommendation: "Resolve the contradiction — if access is restricted, the description must clearly state the specific restrictions. If access is broad, the title should not imply limitations.",
    });
  }

  return Math.max(0, score);
}

function scoreRoleAppropriateness(
  roles: string[],
  accessLevel: string,
  description: string,
  flags: string[],
  findings: RbacFinding[],
): number {
  if (roles.length === 0) {
    flags.push("no_roles_assigned");
    findings.push({
      severity: "high",
      category: "Role Assignment",
      description: "No roles have been assigned to this entitlement. Every entitlement must specify which roles should have this access.",
      recommendation: "Select the appropriate roles for this entitlement based on the principle of least privilege — only roles that functionally require this access.",
    });
    return 30;
  }

  let score = 100;
  const al = accessLevel.toLowerCase();

  for (const role of roles) {
    const guidelines = ROLE_ACCESS_GUIDELINES[role];
    if (!guidelines) continue;

    if (guidelines.risky.some(r => al.includes(r))) {
      score -= 15;
      flags.push(`risky_access_for_${role.toLowerCase().replace(/\s+/g, "_")}`);
      findings.push({
        severity: "high",
        category: "Role-Access Mismatch",
        description: `The "${role}" role is assigned ${accessLevel} access. ${guidelines.reason}.`,
        recommendation: `Consider reducing the access level for the "${role}" role, or provide explicit business justification and compensating controls for this elevated access.`,
      });
    }

    // Check if description contains role-relevant keywords
    const keywords = ROLE_KEYWORDS[role];
    if (keywords) {
      const descLower = description.toLowerCase();
      const hasRelevantContent = keywords.some(kw => descLower.includes(kw.toLowerCase()));
      if (!hasRelevantContent && roles.length <= 2) {
        score -= 5;
        findings.push({
          severity: "low",
          category: "Role Relevance",
          description: `The description does not contain terminology typically associated with the "${role}" role. This may indicate the entitlement is not well-targeted for this role.`,
          recommendation: `Verify that the "${role}" role genuinely needs this entitlement, or update the description to clarify how this access supports their function.`,
        });
      }
    }
  }

  return Math.max(0, score);
}

function scoreDivisionRelevance(
  divisions: string[],
  name: string,
  description: string,
  _roles: string[],
  flags: string[],
  findings: RbacFinding[],
): number {
  if (divisions.length === 0) {
    flags.push("no_divisions_assigned");
    findings.push({
      severity: "medium",
      category: "Division Assignment",
      description: "No business divisions have been assigned. Division assignment helps ensure entitlements are reviewed by the correct business owners during certification.",
      recommendation: "Select the business division(s) that this entitlement serves to enable proper governance and certification routing.",
    });
    return 50;
  }

  let score = 100;
  const textLower = (name + " " + description).toLowerCase();

  // Check for division-relevant keywords in the description
  let hasRelevantContent = false;
  for (const div of divisions) {
    const keywords = DIVISION_KEYWORDS[div];
    if (keywords) {
      if (keywords.some(kw => textLower.includes(kw.toLowerCase()))) {
        hasRelevantContent = true;
      }
    }
  }

  if (!hasRelevantContent && divisions.length > 0) {
    score -= 15;
    findings.push({
      severity: "low",
      category: "Division Relevance",
      description: `The entitlement text does not contain terminology typically associated with the selected division(s): ${divisions.join(", ")}. The description may not clearly tie this access to the business function.`,
      recommendation: "Update the description to explicitly reference how this access supports the selected business division's operations.",
    });
  }

  // Flag if too many divisions — suggests overly broad entitlement
  if (divisions.length > 3) {
    score -= 20;
    flags.push("excessive_divisions");
    findings.push({
      severity: "medium",
      category: "Entitlement Scope",
      description: `This entitlement spans ${divisions.length} divisions. Broadly scoped entitlements are harder to review, certify, and may violate least-privilege principles.`,
      recommendation: "Consider splitting this into separate, division-specific entitlements for better access governance and simpler certification reviews.",
    });
  }

  return Math.max(0, score);
}

function scoreSeparationOfDuties(
  roles: string[],
  accessLevel: string,
  flags: string[],
  findings: RbacFinding[],
): number {
  if (roles.length <= 1) return 100;

  let score = 100;
  const roleSet = new Set(roles);

  for (const [roleA, roleB, reason] of SOD_CONFLICTS) {
    if (roleSet.has(roleA) && roleSet.has(roleB)) {
      const al = accessLevel.toLowerCase();
      const isHighAccess = ["write", "read-write", "admin", "full", "execute"].some(l => al.includes(l));

      if (isHighAccess) {
        score -= 25;
        flags.push(`sod_conflict_${roleA.toLowerCase().replace(/\s+/g, "_")}_${roleB.toLowerCase().replace(/\s+/g, "_")}`);
        findings.push({
          severity: "critical",
          category: "Separation of Duties Violation",
          description: `Roles "${roleA}" and "${roleB}" are both assigned to this entitlement with ${accessLevel} access. ${reason}. Per ISACA CISA guidelines and NIST AC-5 (Separation of Duties), these roles must be segregated to prevent conflicts of interest and reduce fraud risk.`,
          recommendation: `Create separate entitlements for "${roleA}" and "${roleB}" with access levels appropriate to each role's functional requirements. If combined access is unavoidable, document compensating controls (dual approval, activity logging, periodic review).`,
        });
      } else {
        score -= 10;
        findings.push({
          severity: "medium",
          category: "Separation of Duties Risk",
          description: `Roles "${roleA}" and "${roleB}" share this entitlement. While read-level access is lower risk, ${reason.charAt(0).toLowerCase() + reason.slice(1)}.`,
          recommendation: `Review whether both roles genuinely need this shared access, even at read-only level. Consider whether separate entitlements would improve access review clarity.`,
        });
      }
    }
  }

  return Math.max(0, score);
}

function scoreScopeDefinition(
  name: string,
  description: string,
  roles: string[],
  _divisions: string[],
  conditions: string | null | undefined,
  flags: string[],
  findings: RbacFinding[],
): number {
  let score = 100;
  const descLower = description.toLowerCase();
  const nameLower = name.toLowerCase();

  // Check if title mentions a specific audience but description is vague
  const audienceTerms = roles.map(r => r.toLowerCase());
  const titleMentionsAudience = audienceTerms.some(r => nameLower.includes(r.split(" ")[0]));

  if (titleMentionsAudience) {
    // Title references a role — description should clarify what that role does with this access
    const actionVerbs = ["allows", "enables", "permits", "grants", "provides", "authorizes", "gives"];
    const hasActionClarity = actionVerbs.some(v => descLower.includes(v));
    if (!hasActionClarity) {
      score -= 15;
      findings.push({
        severity: "medium",
        category: "Scope Definition",
        description: "The title references specific roles but the description does not clearly state what actions those roles can perform with this access.",
        recommendation: "Add explicit action statements: 'This entitlement allows [role] to [specific actions] within [specific system/boundary].'",
      });
    }
  }

  // Check for overly permissive language
  const permissiveTerms = ["all access", "full control", "unrestricted", "everything", "no limits", "unlimited"];
  for (const term of permissiveTerms) {
    if (descLower.includes(term)) {
      score -= 20;
      flags.push("overly_permissive_scope");
      findings.push({
        severity: "high",
        category: "Scope Definition",
        description: `The description uses overly permissive language ("${term}"). Well-designed entitlements define specific boundaries rather than granting blanket access.`,
        recommendation: "Replace broad access language with specific permissions: which screens, functions, data sets, or API endpoints are included. Define what is excluded as well.",
      });
      break;
    }
  }

  // Check if conditions limit scope appropriately for risky role combinations
  if (roles.some(r => ["External Customer", "External Vendor"].includes(r))) {
    if (!conditions || conditions.trim().length < 10) {
      score -= 20;
      flags.push("external_role_missing_conditions");
      findings.push({
        severity: "critical",
        category: "Scope Definition",
        description: "External roles (Customer/Vendor) are assigned but no meaningful conditions or constraints are defined. External access must always include explicit conditions per NIST AC-17 (Remote Access) and ISO 27001 A.9.4.",
        recommendation: "Add conditions such as: IP restrictions, time-based access windows, MFA requirements, contractual scope limitations, and data access boundaries.",
      });
    }
  }

  return Math.max(0, score);
}

// --- Main RBAC evaluator ---

export function evaluateRbac(data: {
  name: string;
  description: string;
  resource_type: string;
  resource_name: string;
  access_level: string;
  conditions?: string | null;
  business_justification?: string | null;
  owner?: string | null;
  roles?: string[];
  divisions?: string[];
}): RbacResult {
  const flags: string[] = [];
  const findings: RbacFinding[] = [];
  const roles = data.roles ?? [];
  const divisions = data.divisions ?? [];

  const titleDescScore = scoreTitleDescriptionAlignment(data.name, data.description, flags, findings);
  const roleScore = scoreRoleAppropriateness(roles, data.access_level, data.description, flags, findings);
  const divisionScore = scoreDivisionRelevance(divisions, data.name, data.description, roles, flags, findings);
  const sodScore = scoreSeparationOfDuties(roles, data.access_level, flags, findings);
  const scopeScore = scoreScopeDefinition(data.name, data.description, roles, divisions, data.conditions, flags, findings);

  // Weighted composite:
  // Title-Description Alignment: 25% — most fundamental design quality indicator
  // Role Appropriateness: 25% — core RBAC principle
  // Separation of Duties: 25% — critical compliance requirement
  // Division Relevance: 10% — governance supporting
  // Scope Definition: 15% — access boundary clarity
  const finalScore =
    titleDescScore * 0.25 +
    roleScore * 0.25 +
    sodScore * 0.25 +
    scopeScore * 0.15 +
    divisionScore * 0.10;

  const roundedScore = Math.round(finalScore * 100) / 100;

  let grade: string;
  if (roundedScore >= 90) grade = "A";
  else if (roundedScore >= 75) grade = "B";
  else if (roundedScore >= 60) grade = "C";
  else if (roundedScore >= 40) grade = "D";
  else grade = "F";

  // Risk tier based on findings severity
  const criticalCount = findings.filter(f => f.severity === "critical").length;
  const highCount = findings.filter(f => f.severity === "high").length;

  let riskTier: string;
  if (criticalCount >= 2) riskTier = "critical";
  else if (criticalCount >= 1 || highCount >= 2) riskTier = "high";
  else if (highCount >= 1) riskTier = "medium";
  else riskTier = "low";

  const recommendations = findings
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    })
    .map(f => f.recommendation);

  return {
    final_score: roundedScore,
    quality_grade: grade,
    risk_tier: riskTier,
    dimensions: {
      title_description_alignment: titleDescScore,
      role_appropriateness: roleScore,
      division_relevance: divisionScore,
      separation_of_duties: sodScore,
      scope_definition: scopeScore,
    },
    flags: [...new Set(flags)],
    recommendations: [...new Set(recommendations)],
    findings,
  };
}
