import type {
  CompareResponse,
  Dataset,
  EvalRun,
  EvalRunDetail,
  Project,
  ReviewQueueItem,
  Rubric,
  TestCase,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listProjects: () => request<Project[]>("/projects"),
  createProject: (data: Partial<Project>) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),
  getProject: (id: number) => request<Project>(`/projects/${id}`),
  deleteProject: (id: number) => request<void>(`/projects/${id}`, { method: "DELETE" }),

  listDatasets: (projectId: number) => request<Dataset[]>(`/projects/${projectId}/datasets`),
  createDataset: (projectId: number, data: Partial<Dataset>) =>
    request<Dataset>(`/projects/${projectId}/datasets`, { method: "POST", body: JSON.stringify(data) }),

  listTestCases: (datasetId: number) => request<TestCase[]>(`/datasets/${datasetId}/test-cases`),
  createTestCase: (datasetId: number, data: Partial<TestCase>) =>
    request<TestCase>(`/datasets/${datasetId}/test-cases`, { method: "POST", body: JSON.stringify(data) }),
  deleteTestCase: (id: number) => request<void>(`/test-cases/${id}`, { method: "DELETE" }),
  importTestCases: (datasetId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<TestCase[]>(`/datasets/${datasetId}/import`, { method: "POST", body: form });
  },

  listRubrics: (projectId: number) => request<Rubric[]>(`/projects/${projectId}/rubrics`),
  createRubric: (projectId: number, data: Partial<Rubric>) =>
    request<Rubric>(`/projects/${projectId}/rubrics`, { method: "POST", body: JSON.stringify(data) }),
  deleteRubric: (projectId: number, id: number) =>
    request<void>(`/projects/${projectId}/rubrics/${id}`, { method: "DELETE" }),

  listEvalRuns: (projectId: number) => request<EvalRun[]>(`/projects/${projectId}/eval-runs`),
  runEval: (
    projectId: number,
    data: { dataset_id: number; name: string; version_label: string; outputs: Record<number, string> },
  ) =>
    request<EvalRunDetail>(`/projects/${projectId}/eval-runs`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getEvalRun: (id: number) => request<EvalRunDetail>(`/eval-runs/${id}`),
  reviewResult: (
    id: number,
    data: { human_override: boolean | null; reviewer_comment: string; corrected_output: string },
  ) => request(`/eval-results/${id}/review`, { method: "PATCH", body: JSON.stringify(data) }),
  compareEvalRuns: (projectId: number, runA: number, runB: number) =>
    request<CompareResponse>(`/projects/${projectId}/eval-runs/compare?run_a=${runA}&run_b=${runB}`),

  getReviewQueue: (projectId: number, includeReviewed = false) =>
    request<ReviewQueueItem[]>(
      `/projects/${projectId}/review-queue${includeReviewed ? "?include_reviewed=true" : ""}`,
    ),
};
