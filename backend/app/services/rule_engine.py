"""
Rule Engine — Fast pass evaluation of entitlement PBL quality.

Evaluates five dimensions:
1. Readability (25%) — textstat formulas
2. Completeness (25%) — required field presence
3. Clarity (20%) — jargon, passive voice, ambiguity detection
4. Specificity (15%) — vague vs. precise language
5. Consistency (15%) — terminology and format adherence
"""

import re

import textstat

from app.models.entitlement import Entitlement

# --- Jargon & Pattern Lists ---

TECH_JARGON = {
    "k8s", "ns", "sa", "rbac", "abac", "cidr", "vpc", "iam", "arn", "acl",
    "ssh", "tls", "ssl", "mtls", "jwt", "oauth", "saml", "oidc", "ldap",
    "dns", "tcp", "udp", "http", "grpc", "api", "sdk", "cli", "yaml",
    "json", "xml", "csv", "etcd", "s3", "ec2", "rds", "eks", "ecs",
    "gke", "aks", "vm", "vnet", "subnet", "sg", "nacl", "igw", "nat",
    "elb", "alb", "nlb", "cdn", "waf", "kms", "hsm", "pki", "ca",
    "crl", "ocsp", "mfa", "totp", "fido", "u2f", "sso", "idp", "sp",
    "scim", "r/w", "rw", "ro", "sudo", "chmod", "chown",
}

AMBIGUOUS_TERMS = [
    "some", "various", "etc", "etc.", "and/or", "miscellaneous",
    "other", "general", "multiple", "certain", "several",
    "as needed", "as required", "as appropriate", "when necessary",
]

VAGUE_RESOURCES = [
    "the system", "the database", "the server", "the application",
    "resources", "systems", "services", "things", "stuff",
    "the environment", "the platform", "the infrastructure",
]

VAGUE_SCOPE = [
    "as needed", "various permissions", "general access",
    "broad access", "all access", "full access to everything",
    "whatever is needed", "appropriate access",
]

PASSIVE_VOICE_PATTERNS = [
    r"\b(?:is|are|was|were|be|been|being)\s+(?:\w+\s+)*?(?:ed|en)\b",
]


class RuleEngineResult:
    """Result of rule engine evaluation."""

    def __init__(self):
        self.readability_score: float = 100.0
        self.completeness_score: float = 0.0
        self.clarity_score: float = 100.0
        self.specificity_score: float = 100.0
        self.consistency_score: float = 100.0
        self.rule_score: float = 0.0

        # Raw metrics
        self.readability_grade: float = 0.0
        self.reading_ease: float = 0.0
        self.gunning_fog: float = 0.0
        self.word_count: int = 0
        self.sentence_count: int = 0
        self.avg_sentence_length: float = 0.0
        self.passive_voice_ratio: float = 0.0
        self.jargon_count: int = 0

        self.flags: list[str] = []
        self.recommendations: list[str] = []


def evaluate_readability(text: str, result: RuleEngineResult) -> float:
    """Evaluate readability using textstat formulas. Returns 0-100 score."""
    if not text or len(text.split()) < 3:
        result.flags.append("text_too_short")
        result.recommendations.append(
            "Description is too short for meaningful readability analysis. "
            "Aim for at least 2-3 complete sentences."
        )
        return 50.0

    result.reading_ease = textstat.flesch_reading_ease(text)
    result.readability_grade = textstat.flesch_kincaid_grade(text)
    result.gunning_fog = textstat.gunning_fog(text)
    result.word_count = textstat.lexicon_count(text, removepunct=True)
    result.sentence_count = max(textstat.sentence_count(text), 1)
    result.avg_sentence_length = result.word_count / result.sentence_count

    # Score: normalize Flesch Reading Ease to 0-100 (it's already roughly 0-100)
    # Clamp between 0-100
    score = max(0.0, min(100.0, result.reading_ease))

    # Penalize high Gunning Fog (> 12 is difficult)
    if result.gunning_fog > 12:
        penalty = min(20.0, (result.gunning_fog - 12) * 4)
        score = max(0.0, score - penalty)
        result.flags.append("high_gunning_fog")
        result.recommendations.append(
            f"Gunning Fog index is {result.gunning_fog:.1f} (target: ≤12). "
            "Simplify sentence structure and reduce polysyllabic words."
        )

    # Penalize long sentences
    if result.avg_sentence_length > 20:
        penalty = min(15.0, (result.avg_sentence_length - 20) * 2)
        score = max(0.0, score - penalty)
        result.flags.append("long_sentences")
        result.recommendations.append(
            f"Average sentence length is {result.avg_sentence_length:.0f} words (target: ≤20). "
            "Break complex sentences into shorter ones."
        )

    return score


def evaluate_completeness(entitlement: Entitlement, result: RuleEngineResult) -> float:
    """Check for required information fields. Returns 0-100 score."""
    score = 0.0

    # Resource named (+20)
    if entitlement.resource_name and entitlement.resource_name.strip():
        score += 20
    else:
        result.flags.append("missing_resource_name")
        result.recommendations.append("Specify the exact resource being accessed.")

    # Access level specified (+20)
    if entitlement.access_level and entitlement.access_level.strip():
        score += 20
    else:
        result.flags.append("missing_access_level")
        result.recommendations.append(
            "Specify the access level (read, write, admin, etc.)."
        )

    # Conditions stated (+20)
    if entitlement.conditions and entitlement.conditions.strip():
        score += 20
    else:
        result.flags.append("missing_conditions")
        result.recommendations.append(
            "Add conditions or constraints for this access "
            "(e.g., MFA required, time-limited, approval needed)."
        )

    # Business justification (+20)
    if entitlement.business_justification and entitlement.business_justification.strip():
        score += 20
    else:
        result.flags.append("missing_business_justification")
        result.recommendations.append(
            "Add a business justification explaining why this access is needed."
        )

    # Owner identified (+20)
    if entitlement.owner and entitlement.owner.strip():
        score += 20
    else:
        result.flags.append("missing_owner")
        result.recommendations.append(
            "Identify the team or individual responsible for this entitlement."
        )

    return score


def evaluate_clarity(text: str, result: RuleEngineResult) -> float:
    """Check for jargon, passive voice, and ambiguity. Returns 0-100 score."""
    score = 100.0
    text_lower = text.lower()
    words = set(re.findall(r"\b\w+\b", text_lower))

    # Jargon detection
    jargon_found = words & TECH_JARGON
    result.jargon_count = len(jargon_found)
    if jargon_found:
        penalty = min(40.0, len(jargon_found) * 5)
        score -= penalty
        result.flags.append("jargon_detected")
        result.recommendations.append(
            f"Technical jargon detected: {', '.join(sorted(jargon_found))}. "
            "Replace with plain business language equivalents."
        )

    # Passive voice detection
    sentences = re.split(r"[.!?]+", text)
    sentences = [s.strip() for s in sentences if s.strip()]
    passive_count = 0
    for sentence in sentences:
        for pattern in PASSIVE_VOICE_PATTERNS:
            if re.search(pattern, sentence, re.IGNORECASE):
                passive_count += 1
                break

    total_sentences = max(len(sentences), 1)
    result.passive_voice_ratio = passive_count / total_sentences * 100

    if result.passive_voice_ratio > 20:
        excess = result.passive_voice_ratio - 20
        penalty = min(20.0, excess * 2)
        score -= penalty
        result.flags.append("high_passive_voice")
        result.recommendations.append(
            f"Passive voice ratio is {result.passive_voice_ratio:.0f}% (target: <20%). "
            "Use active voice for clearer descriptions."
        )

    # Ambiguous quantifier detection
    ambiguous_found = [term for term in AMBIGUOUS_TERMS if term in text_lower]
    if ambiguous_found:
        penalty = min(25.0, len(ambiguous_found) * 5)
        score -= penalty
        result.flags.append("ambiguous_terms")
        result.recommendations.append(
            f"Ambiguous terms detected: {', '.join(ambiguous_found)}. "
            "Replace with specific, quantifiable language."
        )

    # Long sentence detection
    long_sentences = [s for s in sentences if len(s.split()) > 25]
    if long_sentences:
        penalty = min(15.0, len(long_sentences) * 3)
        score -= penalty
        result.flags.append("complex_sentences")
        result.recommendations.append(
            f"{len(long_sentences)} sentence(s) exceed 25 words. "
            "Break into shorter, more focused sentences."
        )

    return max(0.0, score)


def evaluate_specificity(entitlement: Entitlement, result: RuleEngineResult) -> float:
    """Check for vague vs. precise language. Returns 0-100 score."""
    score = 100.0
    combined_text = (
        f"{entitlement.description} {entitlement.resource_name} "
        f"{entitlement.conditions or ''} {entitlement.business_justification or ''}"
    ).lower()

    # Vague resource references
    vague_resources_found = [v for v in VAGUE_RESOURCES if v in combined_text]
    if vague_resources_found:
        penalty = min(30.0, len(vague_resources_found) * 10)
        score -= penalty
        result.flags.append("vague_resources")
        result.recommendations.append(
            f"Vague resource references: {', '.join(vague_resources_found)}. "
            "Name specific systems, databases, or services."
        )

    # Vague scope
    vague_scope_found = [v for v in VAGUE_SCOPE if v in combined_text]
    if vague_scope_found:
        penalty = min(30.0, len(vague_scope_found) * 10)
        score -= penalty
        result.flags.append("vague_scope")
        result.recommendations.append(
            f"Vague scope descriptors: {', '.join(vague_scope_found)}. "
            "Define specific permissions and boundaries."
        )

    # Bonus for named resources (specific system/service names)
    # Look for patterns like "name-service", "ProductionDB", specific identifiers
    specific_patterns = re.findall(
        r"\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b"  # CamelCase names
        r"|\b\w+-\w+(?:-\w+)*\b",  # kebab-case names
        entitlement.resource_name + " " + entitlement.description,
    )
    if specific_patterns:
        bonus = min(30.0, len(specific_patterns) * 10)
        score = min(100.0, score + bonus)

    return max(0.0, score)


def evaluate_consistency(entitlement: Entitlement, result: RuleEngineResult) -> float:
    """Check terminology consistency. Returns 0-100 score."""
    score = 100.0
    text = entitlement.description

    # Check for inconsistent access level terminology
    access_terms = {"read", "write", "admin", "view", "execute", "delete", "modify"}
    description_lower = text.lower()
    used_terms = [t for t in access_terms if t in description_lower]

    # If description mentions access levels that conflict with the stated access_level
    stated = entitlement.access_level.lower()
    if stated in ("read", "view") and any(
        t in used_terms for t in ("write", "delete", "modify", "admin")
    ):
        score -= 20
        result.flags.append("inconsistent_access_level")
        result.recommendations.append(
            f"Description mentions elevated permissions but access level is '{stated}'. "
            "Ensure the description matches the stated access level."
        )

    # Check for mixed abbreviation/full-form usage
    abbrev_pairs = [
        ("db", "database"),
        ("app", "application"),
        ("env", "environment"),
        ("prod", "production"),
        ("dev", "development"),
        ("stg", "staging"),
        ("auth", "authentication"),
        ("config", "configuration"),
    ]
    for abbrev, full in abbrev_pairs:
        if (
            re.search(rf"\b{abbrev}\b", description_lower)
            and full in description_lower
        ):
            score -= 5
            result.flags.append(f"mixed_terminology_{abbrev}")
            result.recommendations.append(
                f"Mixed use of '{abbrev}' and '{full}'. "
                "Use the full form consistently for clarity."
            )

    return max(0.0, score)


def run_rule_engine(entitlement: Entitlement) -> RuleEngineResult:
    """Run the complete rule engine evaluation on an entitlement."""
    result = RuleEngineResult()
    text = entitlement.description

    # Evaluate each dimension
    result.readability_score = evaluate_readability(text, result)
    result.completeness_score = evaluate_completeness(entitlement, result)
    result.clarity_score = evaluate_clarity(text, result)
    result.specificity_score = evaluate_specificity(entitlement, result)
    result.consistency_score = evaluate_consistency(entitlement, result)

    # Weighted composite score
    result.rule_score = (
        result.readability_score * 0.25
        + result.completeness_score * 0.25
        + result.clarity_score * 0.20
        + result.specificity_score * 0.15
        + result.consistency_score * 0.15
    )

    return result
