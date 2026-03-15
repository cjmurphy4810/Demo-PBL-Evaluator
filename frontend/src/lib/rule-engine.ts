// Client-side rule engine — mirrors backend/app/services/rule_engine.py

interface RuleResult {
  rule_score: number;
  readability_score: number;
  reading_ease: number;
  gunning_fog: number;
  word_count: number;
  sentence_count: number;
  avg_sentence_length: number;
  passive_voice_ratio: number;
  jargon_count: number;
  completeness_score: number;
  clarity_score: number;
  specificity_score: number;
  consistency_score: number;
  flags: string[];
}

// --- Text helpers ---

function sentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function words(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

function syllableCount(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  let count = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return count ? count.length : 1;
}

function complexWordCount(wordList: string[]): number {
  return wordList.filter((w) => syllableCount(w) >= 3).length;
}

// Flesch Reading Ease (0–100, higher = easier)
function fleschReadingEase(
  wordCount: number,
  sentCount: number,
  totalSyllables: number,
): number {
  if (sentCount === 0 || wordCount === 0) return 0;
  return Math.max(
    0,
    Math.min(
      100,
      206.835 -
        1.015 * (wordCount / sentCount) -
        84.6 * (totalSyllables / wordCount),
    ),
  );
}

// Gunning Fog Index
function gunningFog(
  wordCount: number,
  sentCount: number,
  complexWords: number,
): number {
  if (sentCount === 0 || wordCount === 0) return 0;
  return 0.4 * (wordCount / sentCount + 100 * (complexWords / wordCount));
}

// --- Jargon / ambiguity lists ---

const JARGON_TERMS = new Set([
  "k8s", "iam", "rbac", "vpc", "jwt", "oauth", "saml", "cidr", "ssl", "tls",
  "ssh", "api", "sdk", "cli", "dns", "tcp", "udp", "http", "https", "ldap",
  "saas", "paas", "iaas", "devops", "devsecops", "siem", "soar", "sso",
  "mfa", "totp", "kms", "hsm", "pki", "acl", "nat", "cdn", "waf", "ids",
  "ips", "sla", "rto", "rpo", "mttr", "mtbf",
]);

const AMBIGUOUS_TERMS = [
  "some", "various", "etc", "and/or", "miscellaneous", "multiple", "certain",
  "several", "as needed", "as appropriate", "when necessary",
];

const VAGUE_RESOURCES = [
  "the system", "the database", "the server", "resources", "stuff",
  "infrastructure",
];

const VAGUE_SCOPE = [
  "as needed", "various permissions", "broad access", "full access",
  "whatever is needed",
];

const MIXED_PAIRS: [string, string][] = [
  ["db", "database"], ["app", "application"], ["env", "environment"],
  ["prod", "production"], ["dev", "development"], ["stg", "staging"],
  ["auth", "authentication"], ["config", "configuration"],
];

// --- Dimension scorers ---

function scoreReadability(text: string, flags: string[]): {
  score: number;
  reading_ease: number;
  gunning: number;
  wordCount: number;
  sentCount: number;
  avgSentLen: number;
} {
  const sents = sentences(text);
  const allWords = words(text);
  const wc = allWords.length;
  const sc = sents.length || 1;
  const avgSentLen = wc / sc;

  if (wc < 5) {
    flags.push("text_too_short");
    return { score: 40, reading_ease: 0, gunning: 0, wordCount: wc, sentCount: sc, avgSentLen };
  }

  const totalSyl = allWords.reduce((s, w) => s + syllableCount(w), 0);
  const re = fleschReadingEase(wc, sc, totalSyl);
  const gf = gunningFog(wc, sc, complexWordCount(allWords));

  let score = Math.min(100, Math.max(0, re));

  // Penalties
  if (gf > 12) {
    const penalty = Math.min(20, (gf - 12) * 4);
    score = Math.max(0, score - penalty);
    flags.push("high_gunning_fog");
  }
  if (avgSentLen > 20) {
    const penalty = Math.min(15, (avgSentLen - 20) * 2);
    score = Math.max(0, score - penalty);
    flags.push("long_sentences");
  }

  return { score, reading_ease: re, gunning: gf, wordCount: wc, sentCount: sc, avgSentLen };
}

function scoreCompleteness(
  resourceName: string,
  accessLevel: string,
  conditions: string | null | undefined,
  justification: string | null | undefined,
  owner: string | null | undefined,
  flags: string[],
): number {
  let score = 0;
  if (resourceName) score += 20;
  if (accessLevel) score += 20;
  if (conditions) { score += 20; } else { flags.push("missing_conditions"); }
  if (justification) { score += 20; } else { flags.push("missing_business_justification"); }
  if (owner) score += 20;
  return score;
}

function scoreClarity(text: string, flags: string[]): {
  score: number;
  passive_ratio: number;
  jargon_count: number;
} {
  let score = 100;
  const lower = text.toLowerCase();

  // Jargon
  const allWords = words(lower);
  let jargonCount = 0;
  for (const w of allWords) {
    if (JARGON_TERMS.has(w.replace(/[^a-z0-9]/g, ""))) jargonCount++;
  }
  if (jargonCount > 0) {
    score -= Math.min(40, jargonCount * 5);
    flags.push("jargon_detected");
  }

  // Passive voice (approximate)
  const sents = sentences(text);
  let passiveCount = 0;
  for (const s of sents) {
    if (/\b(is|are|was|were|been|being)\s+\w+(ed|en)\b/i.test(s)) passiveCount++;
  }
  const passiveRatio = sents.length > 0 ? (passiveCount / sents.length) * 100 : 0;
  if (passiveRatio > 20) {
    score -= Math.min(20, (passiveRatio - 20) * 2);
    flags.push("high_passive_voice");
  }

  // Ambiguous terms
  let ambigCount = 0;
  for (const term of AMBIGUOUS_TERMS) {
    if (lower.includes(term)) ambigCount++;
  }
  if (ambigCount > 0) {
    score -= Math.min(25, ambigCount * 5);
    flags.push("ambiguous_terms");
  }

  // Complex sentences (> 25 words)
  let complexSentCount = 0;
  for (const s of sents) {
    if (words(s).length > 25) complexSentCount++;
  }
  if (complexSentCount > 0) {
    score -= Math.min(15, complexSentCount * 3);
    flags.push("complex_sentences");
  }

  return { score: Math.max(0, score), passive_ratio: passiveRatio, jargon_count: jargonCount };
}

function scoreSpecificity(
  description: string,
  resourceName: string,
  flags: string[],
): number {
  let score = 100;
  const lower = (description + " " + resourceName).toLowerCase();

  // Vague resources
  let vagueResCount = 0;
  for (const term of VAGUE_RESOURCES) {
    if (lower.includes(term)) vagueResCount++;
  }
  if (vagueResCount > 0) {
    score -= Math.min(30, vagueResCount * 10);
    flags.push("vague_resources");
  }

  // Vague scope
  let vagueScopeCount = 0;
  for (const term of VAGUE_SCOPE) {
    if (lower.includes(term)) vagueScopeCount++;
  }
  if (vagueScopeCount > 0) {
    score -= Math.min(30, vagueScopeCount * 10);
    flags.push("vague_scope");
  }

  // Bonus for specific patterns (CamelCase or kebab-case)
  const specificMatches = (description + " " + resourceName).match(
    /\b[A-Z][a-z]+[A-Z]\w+\b|\b[a-z]+-[a-z]+-?\w*\b/g,
  );
  if (specificMatches) {
    score = Math.min(100, score + Math.min(30, specificMatches.length * 10));
  }

  return Math.max(0, score);
}

function scoreConsistency(
  description: string,
  accessLevel: string,
  flags: string[],
): number {
  let score = 100;
  const lower = description.toLowerCase();

  // Access level conflicts
  if (
    accessLevel.toLowerCase().includes("read") &&
    !accessLevel.toLowerCase().includes("write")
  ) {
    if (/\b(write|delete|admin|modify|update|create)\b/.test(lower)) {
      score -= 20;
      flags.push("inconsistent_access_level");
    }
  }

  // Mixed abbreviations
  for (const [abbrev, full] of MIXED_PAIRS) {
    const hasAbbrev = new RegExp(`\\b${abbrev}\\b`, "i").test(lower);
    const hasFull = new RegExp(`\\b${full}\\b`, "i").test(lower);
    if (hasAbbrev && hasFull) {
      score -= 5;
      flags.push(`mixed_terminology_${abbrev}`);
    }
  }

  return Math.max(0, score);
}

// --- Main evaluator ---

export function evaluateRules(data: {
  description: string;
  resource_name: string;
  access_level: string;
  conditions?: string | null;
  business_justification?: string | null;
  owner?: string | null;
}): RuleResult {
  const flags: string[] = [];
  const fullText = [data.description, data.conditions, data.business_justification]
    .filter(Boolean)
    .join(". ");

  const readability = scoreReadability(fullText, flags);
  const completeness = scoreCompleteness(
    data.resource_name, data.access_level,
    data.conditions, data.business_justification, data.owner, flags,
  );
  const clarity = scoreClarity(fullText, flags);
  const specificity = scoreSpecificity(data.description, data.resource_name, flags);
  const consistency = scoreConsistency(data.description, data.access_level, flags);

  // Weighted composite: readability 25%, completeness 25%, clarity 20%, specificity 15%, consistency 15%
  const rule_score =
    readability.score * 0.25 +
    completeness * 0.25 +
    clarity.score * 0.20 +
    specificity * 0.15 +
    consistency * 0.15;

  return {
    rule_score: Math.round(rule_score * 100) / 100,
    readability_score: readability.score,
    reading_ease: readability.reading_ease,
    gunning_fog: readability.gunning,
    word_count: readability.wordCount,
    sentence_count: readability.sentCount,
    avg_sentence_length: readability.avgSentLen,
    passive_voice_ratio: clarity.passive_ratio,
    jargon_count: clarity.jargon_count,
    completeness_score: completeness,
    clarity_score: clarity.score,
    specificity_score: specificity,
    consistency_score: consistency,
    flags: [...new Set(flags)],
  };
}
