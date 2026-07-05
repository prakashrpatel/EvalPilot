# EvalPilot — Requirements

Condensed from the original PRD ("AI Evals for PMs.pdf"). This document
captures the product requirements; see the **Implementation Status**
section at the bottom for what's actually built in this repo versus
deferred.

## 1. Product Summary

AI products are harder to test than traditional software because outputs
vary for the same input. Traditional pass/fail testing isn't enough for
LLM-based chatbots, copilots, RAG systems, and AI agents.

**EvalPilot** is a structured, PM-friendly platform where teams create
golden datasets, generate synthetic test cases, define evaluation
rubrics, run automated and human evaluations, compare model/prompt
versions, and monitor production quality over time — turning AI quality
from guesswork into a measurable product workflow.

## 2. Problem Statement

AI teams ship LLM-powered features without a consistent way to measure
output quality. Many rely on manual testing, demo-based confidence, or
subjective review, leading to production issues: hallucinations,
irrelevant answers, unsafe responses, incorrect tool usage, poor tone,
inconsistent UX. Existing tools are engineering-focused (evals, tracing,
observability); PMs and business stakeholders struggle to define quality
criteria, review outputs, and connect eval results to product decisions.

## 3. Target Users

**Primary**
- **AI Product Manager** — defines product goals, quality criteria, customer experience expectations, launch readiness.
- **AI Engineer / ML Engineer** — connects model outputs, prompts, traces, APIs, and experiment runs into the platform.
- **QA Analyst / Test Engineer** — creates test cases, reviews outputs, validates regressions, tracks defects.
- **Domain Expert / Business Reviewer** — reviews outputs for accuracy, compliance, policy, tone, business correctness.

**Secondary**
- **Engineering Manager** — reviews quality trends and release readiness.
- **Compliance / Risk Reviewer** — reviews safety, policy, privacy, regulated-domain outputs.
- **Customer Support Lead** — validates support-bot responses and escalations.

## 4. Goals

1. Help AI teams define quality criteria for LLM applications.
2. Create and manage golden test datasets.
3. Generate synthetic test scenarios to expand coverage.
4. Run automated evals using deterministic checks and LLM-as-judge.
5. Support human review workflows for subjective or high-risk outputs.
6. Detect hallucinations, irrelevant responses, unsafe outputs, and tone issues.
7. Compare prompt, model, retrieval, and workflow versions.
8. Provide dashboards for launch readiness and production monitoring.
9. Convert failed evals into improvement tasks for product and engineering teams.

## 5. Non-Goals (MVP)

1. Training or fine-tuning models directly.
2. Replacing existing observability platforms.
3. Becoming a full annotation platform.
4. Supporting every AI modality — initial scope is text-based LLM applications.
5. Providing legal/compliance certification — evidence and workflow support only.

## 6. MVP Lifecycle

```
Create dataset → Define rubric → Run eval → Review results →
Compare versions → Track improvements
```

**Modules**: Project Setup · Golden Dataset Manager · Synthetic Test Case
Generator · Evaluation Rubric Builder · Eval Runner · Human Review Queue ·
Result Dashboard · Regression Comparison · Issue Tracking / Export ·
Basic Production Sampling.

## 7. Key Use Cases

1. **PM defines AI quality criteria** — correctness, helpfulness, tone, policy compliance, hallucination risk, escalation behavior.
2. **Team creates golden dataset** — real or manually authored test cases with input, expected behavior, ideal answer, policy, tags, severity.
3. **Synthetic data expansion** — generate emotional/incomplete/multilingual/edge-case variations of golden examples.
4. **Automated evaluation** — score outputs via rules, rubric-based LLM judges, and optional reference answers.
5. **Human review** — low-confidence/high-risk/failed outputs routed to reviewers who score and comment.
6. **Prompt/model regression testing** — compare eval results against the previous production version before launch.
7. **Production monitoring** — sample live interactions, score them, flag issues, feed failures back into the golden dataset.

## 8. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | Project creation: name, description, use case type, owner, reviewers, quality dimensions. |
| FR-02 | Dataset management: create, edit, import, export, tag, version datasets. |
| FR-03 | Golden test cases: mark examples as goldens (trusted evaluation baseline). |
| FR-04 | Synthetic test generation: generate variations from existing examples, require approval before use. |
| FR-05 | Rubric builder: scoring criteria, scale, severity, pass/fail thresholds, launch blockers. |
| FR-06 | Eval execution: run against API endpoint, uploaded output file, or manual output entry. |
| FR-07 | Automated evaluators: deterministic checks, LLM-as-judge, reference comparison, groundedness, safety checks. |
| FR-08 | Human review: manually review outputs, assign scores, add comments, override automated scores. |
| FR-09 | Version comparison: compare eval results across prompt/model/retrieval versions and release candidates. |
| FR-10 | Dashboard: pass rate, fail rate, metric trends, severity breakdown, top failure reasons, launch readiness. |
| FR-11 | Failed case management: convert failed evals into tickets, export to Jira/Azure DevOps/GitHub Issues/CSV. |
| FR-12 | Production sampling: import or sample production traces and evaluate real-world interactions. |

## 9. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Security | Role-based access control for admin, PM, engineer, reviewer, viewer. |
| Privacy | PII redaction before storing production examples. |
| Auditability | Version history for datasets, rubrics, model versions, reviewer decisions. |
| Scalability | Batch eval runs with thousands of test cases. |
| Reliability | Eval results reproducible with stored model, prompt, rubric, and dataset versions. |
| Explainability | Every automated score includes a reason or evidence. |
| Cost Control | Configurable sampling rate, judge model, max tokens, batch size. |
| Integration | API, CSV/JSON upload, webhook; future CI/CD and observability integrations. |

## 10. Recommended Metrics

**Quality**: Correctness, Helpfulness, Relevance, Completeness, Tone Score.

**Trust & Safety**: Hallucination Rate, Groundedness Score, Safety Failure
Rate, Escalation Accuracy, Policy Compliance Score.

**RAG-specific**: faithfulness, response relevancy, context precision,
context recall, retrieval relevance.

**Agent-specific**: Tool Call Accuracy, Tool Call F1, Task Completion
Rate, Step Efficiency, Recovery Rate.

### Hallucination Rate

```
Hallucination Rate = Number of hallucinated responses / Total evaluated responses × 100
```

A response is hallucinated if it includes information that is: not
supported by retrieved context, not present in the source of truth,
fabricated/unverifiable, contradictory to known business policy, or
overconfident despite missing evidence.

Detection methods (MVP): human reviewer label, LLM-as-judge groundedness
check, source citation validation, retrieval context comparison,
rule-based detection for unsupported policy claims.

## 11. Launch Readiness Criteria (example gate)

| Metric | Required Threshold |
|--------|--------------------|
| Overall Pass Rate | ≥ 90% |
| Hallucination Rate | ≤ 3% |
| Safety Failure Rate | 0 critical failures |
| Policy Compliance | ≥ 95% |
| Human Review Agreement | ≥ 85% |
| Regression vs Previous Version | No critical regression |
| P0/P1 Failure Cases | 100% reviewed |

## 12. Data Model

- **Project**: id, name, description, use case type, owner, team members, created date, status.
- **Dataset**: id, project id, name, version, source, tags, created by.
- **Test Case**: id, dataset id, input prompt, expected output, context/source material, tags, severity, golden flag, created by.
- **Rubric**: id, project id, metric name, description, scoring scale, pass threshold, severity, launch blocker flag.
- **Eval Run**: id, project id, dataset/model/prompt/rubric version, run status, start/end time, cost, created by.
- **Eval Result**: id, eval run id, test case id, AI output, metric scores, pass/fail, explanation, human override, reviewer comments.

## 13. MVP Prioritization

**P0 (Must Have)**: project creation, golden dataset manager, rubric
builder, CSV/JSON import, eval runner, LLM-as-judge scoring,
deterministic rule checks, human review queue, results dashboard,
version comparison.

**P1 (Should Have)**: synthetic test generation, production trace
sampling, reviewer calibration, Jira/Azure DevOps/GitHub export, PII
redaction, alerting for critical failures, cost tracking.

**P2 (Could Have)**: CI/CD integration, prompt optimization suggestions,
multi-modal evals, advanced agent trajectory evaluation, compliance
evidence export, custom judge model marketplace.

---

## Implementation Status (this repo)

Scope so far: **P0 MVP minus LLM-as-judge** (deferred pending a model
provider/API-key decision).

| Module | Status |
|--------|--------|
| Project creation | ✅ Built |
| Golden dataset manager (+ CSV/JSON import) | ✅ Built |
| Rubric builder | ✅ Built (deterministic checks only: exact match, contains, forbidden words, regex, JSON validity, reference similarity) |
| Eval runner | ✅ Built (manual/bulk-paste model outputs; no live API endpoint connector yet) |
| Deterministic rule checks | ✅ Built |
| LLM-as-judge scoring | ❌ Deferred — needs provider (Anthropic/OpenAI) + API key |
| Human review queue | ✅ Built (cross-run pending queue, override, comment, corrected answer) |
| Results dashboard | ✅ Built (pass rate, launch readiness, per-metric breakdown, filters) |
| Version comparison | ✅ Built (two-run pass-rate delta comparison) |
| Synthetic test generation (P1) | ❌ Not built |
| Production trace sampling (P1) | ❌ Not built |
| PII redaction (P1) | ❌ Not built |
| Alerting for critical failures (P1) | ❌ Not built |
| Jira/Azure DevOps/GitHub export (P1) | ❌ Not built |
| RBAC / auth (NFR) | ❌ Not built — no auth in this prototype |
| CI/CD, multi-modal, compliance export (P2) | ❌ Not built |

See `README.md` for setup/running instructions and current project layout.
