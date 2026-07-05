export type UseCaseType = "chatbot" | "rag" | "summarization" | "content_generation" | "agent";

export interface Project {
  id: number;
  name: string;
  description: string;
  use_case_type: UseCaseType;
  owner: string;
  created_at: string;
}

export interface Dataset {
  id: number;
  project_id: number;
  name: string;
  version: string;
  source: string;
  created_at: string;
}

export interface TestCase {
  id: number;
  dataset_id: number;
  input_prompt: string;
  expected_output: string;
  context: string;
  tags: string;
  severity: "low" | "medium" | "high" | "critical";
  is_golden: boolean;
  created_at: string;
}

export type CheckType =
  | "exact_match"
  | "contains"
  | "forbidden_words"
  | "regex"
  | "json_valid"
  | "reference_similarity";

export interface Rubric {
  id: number;
  project_id: number;
  metric_name: string;
  description: string;
  check_type: CheckType;
  config: Record<string, unknown>;
  severity: "low" | "medium" | "high" | "critical";
  is_launch_blocker: boolean;
  created_at: string;
}

export interface MetricResult {
  rubric_id: number;
  metric_name: string;
  passed: boolean;
  detail: string;
  is_launch_blocker: boolean;
}

export interface EvalResult {
  id: number;
  test_case_id: number;
  ai_output: string;
  metric_results: MetricResult[];
  overall_pass: boolean;
  human_override: boolean | null;
  reviewer_comment: string;
  corrected_output: string;
  reviewed: boolean;
  reviewed_at: string | null;
}

export interface ReviewQueueItem {
  result_id: number;
  eval_run_id: number;
  eval_run_name: string;
  version_label: string;
  test_case_id: number;
  input_prompt: string;
  expected_output: string;
  severity: "low" | "medium" | "high" | "critical";
  tags: string;
  ai_output: string;
  metric_results: MetricResult[];
  overall_pass: boolean;
  human_override: boolean | null;
  reviewer_comment: string;
  corrected_output: string;
  reviewed: boolean;
  reviewed_at: string | null;
}

export interface EvalRun {
  id: number;
  project_id: number;
  dataset_id: number;
  name: string;
  version_label: string;
  status: string;
  created_at: string;
}

export interface EvalRunDetail extends EvalRun {
  results: EvalResult[];
}

export interface CompareSummary {
  eval_run_id: number;
  name: string;
  version_label: string;
  total: number;
  passed: number;
  pass_rate: number;
  metric_pass_rates: Record<string, number>;
}

export interface CompareResponse {
  run_a: CompareSummary;
  run_b: CompareSummary;
  pass_rate_delta: number;
}
