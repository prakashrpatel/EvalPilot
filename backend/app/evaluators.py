import json
import re
from typing import Any

from . import models


def run_check(rubric: models.Rubric, ai_output: str, test_case: models.TestCase) -> dict[str, Any]:
    """Run a single deterministic rubric check against an AI output.

    Returns a dict: {rubric_id, metric_name, passed, detail, is_launch_blocker}
    """
    config = rubric.config or {}
    check_type = rubric.check_type
    passed = False
    detail = ""

    try:
        if check_type == "exact_match":
            passed = ai_output.strip() == (test_case.expected_output or "").strip()
            detail = "Matched expected output exactly." if passed else "Output does not match expected output."

        elif check_type == "contains":
            keywords = config.get("keywords", [])
            case_sensitive = config.get("case_sensitive", False)
            haystack = ai_output if case_sensitive else ai_output.lower()
            needles = keywords if case_sensitive else [k.lower() for k in keywords]
            missing = [kw for kw, needle in zip(keywords, needles) if needle not in haystack]
            passed = len(missing) == 0
            detail = "All required keywords present." if passed else f"Missing keywords: {', '.join(missing)}"

        elif check_type == "forbidden_words":
            forbidden = config.get("forbidden", [])
            case_sensitive = config.get("case_sensitive", False)
            haystack = ai_output if case_sensitive else ai_output.lower()
            needles = forbidden if case_sensitive else [w.lower() for w in forbidden]
            found = [w for w, needle in zip(forbidden, needles) if needle in haystack]
            passed = len(found) == 0
            detail = "No forbidden words found." if passed else f"Forbidden words found: {', '.join(found)}"

        elif check_type == "regex":
            pattern = config.get("pattern", "")
            flags = re.IGNORECASE if config.get("case_insensitive", True) else 0
            passed = bool(re.search(pattern, ai_output, flags)) if pattern else False
            detail = "Output matches pattern." if passed else f"Output does not match pattern: {pattern}"

        elif check_type == "json_valid":
            try:
                json.loads(ai_output)
                passed = True
                detail = "Output is valid JSON."
            except (json.JSONDecodeError, TypeError):
                passed = False
                detail = "Output is not valid JSON."

        elif check_type == "reference_similarity":
            expected = (test_case.expected_output or "").strip().lower()
            actual = ai_output.strip().lower()
            threshold = config.get("threshold", 0.5)
            score = _word_overlap_score(expected, actual)
            passed = score >= threshold
            detail = f"Word overlap score {score:.2f} (threshold {threshold})."

        else:
            detail = f"Unknown check type: {check_type}"
            passed = False

    except Exception as exc:  # deterministic checks should never crash an eval run
        passed = False
        detail = f"Check errored: {exc}"

    return {
        "rubric_id": rubric.id,
        "metric_name": rubric.metric_name,
        "passed": passed,
        "detail": detail,
        "is_launch_blocker": rubric.is_launch_blocker,
    }


def _word_overlap_score(expected: str, actual: str) -> float:
    if not expected:
        return 1.0 if not actual else 0.0
    expected_words = set(expected.split())
    actual_words = set(actual.split())
    if not expected_words:
        return 0.0
    overlap = expected_words & actual_words
    return len(overlap) / len(expected_words)
