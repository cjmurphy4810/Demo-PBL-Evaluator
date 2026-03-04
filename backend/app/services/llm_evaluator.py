"""
LLM Evaluator — Deep pass evaluation using Claude API.

Triggered when rule_score < threshold or critical flags are raised.
Uses structured prompts to evaluate PBL quality dimensions.
"""

import json
import logging

import anthropic

from app.core.config import settings
from app.models.entitlement import Entitlement

logger = logging.getLogger(__name__)

EVALUATION_PROMPT = """You are evaluating the quality of an access entitlement description written in Plain Business Language (PBL).

The entitlement description should clearly communicate:
1. WHAT resource or system is being accessed
2. WHAT level of access is granted (read, write, admin, etc.)
3. WHO this entitlement is intended for
4. UNDER WHAT CONDITIONS access is granted or restricted
5. WHY this access is needed (business justification)

Evaluate the following entitlement description on these dimensions. Score each 0-100:

- clarity: Can a non-technical business stakeholder understand this?
- specificity: Are resources, scope, and boundaries precisely defined?
- actionability: Could an access reviewer approve/deny based on this alone?
- consistency: Is terminology used consistently throughout?

Also provide:
- overall_score: 0-100 holistic quality score
- risk_assessment: "critical" | "high" | "medium" | "low" based on the sensitivity of what's being accessed
- flags: list of specific issues found (short strings, e.g., "missing_time_constraint")
- recommendations: list of specific, actionable improvements (1-2 sentences each)

ENTITLEMENT:
Name: {name}
Description: {description}
Resource: {resource_type} / {resource_name}
Access Level: {access_level}
Conditions: {conditions}
Business Justification: {business_justification}

Respond ONLY with valid JSON in this exact format:
{{
  "overall_score": <number>,
  "clarity": <number>,
  "specificity": <number>,
  "actionability": <number>,
  "consistency": <number>,
  "risk_assessment": "<string>",
  "flags": ["<string>", ...],
  "recommendations": ["<string>", ...]
}}"""


class LLMResult:
    """Result of LLM evaluation."""

    def __init__(self):
        self.overall_score: float = 0.0
        self.clarity_score: float = 0.0
        self.specificity_score: float = 0.0
        self.actionability_score: float = 0.0
        self.consistency_score: float = 0.0
        self.risk_assessment: str = "medium"
        self.flags: list[str] = []
        self.recommendations: list[str] = []
        self.success: bool = False
        self.error: str | None = None


def build_prompt(entitlement: Entitlement) -> str:
    """Build the evaluation prompt for a given entitlement."""
    return EVALUATION_PROMPT.format(
        name=entitlement.name,
        description=entitlement.description,
        resource_type=entitlement.resource_type,
        resource_name=entitlement.resource_name,
        access_level=entitlement.access_level,
        conditions=entitlement.conditions or "Not specified",
        business_justification=entitlement.business_justification or "Not specified",
    )


def parse_llm_response(response_text: str) -> dict:
    """Parse the JSON response from the LLM."""
    # Strip markdown code fences if present
    text = response_text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last lines (code fences)
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    return json.loads(text)


def run_llm_evaluation(entitlement: Entitlement) -> LLMResult:
    """Run LLM evaluation on an entitlement using Claude API."""
    result = LLMResult()

    if not settings.anthropic_api_key:
        result.error = "Anthropic API key not configured"
        logger.warning("LLM evaluation skipped: no API key configured")
        return result

    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        prompt = build_prompt(entitlement)

        message = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = message.content[0].text
        parsed = parse_llm_response(response_text)

        result.overall_score = float(parsed.get("overall_score", 0))
        result.clarity_score = float(parsed.get("clarity", 0))
        result.specificity_score = float(parsed.get("specificity", 0))
        result.actionability_score = float(parsed.get("actionability", 0))
        result.consistency_score = float(parsed.get("consistency", 0))
        result.risk_assessment = parsed.get("risk_assessment", "medium")
        result.flags = parsed.get("flags", [])
        result.recommendations = parsed.get("recommendations", [])
        result.success = True

    except json.JSONDecodeError as e:
        result.error = f"Failed to parse LLM response: {e}"
        logger.error(result.error)
    except anthropic.APIError as e:
        result.error = f"Anthropic API error: {e}"
        logger.error(result.error)
    except Exception as e:
        result.error = f"Unexpected error during LLM evaluation: {e}"
        logger.error(result.error)

    return result
