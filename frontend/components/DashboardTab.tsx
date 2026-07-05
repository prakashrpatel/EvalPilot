"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { CompareResponse, EvalRun, EvalRunDetail } from "@/lib/types";
import { Badge, Card, Field, Select } from "@/components/ui";

export default function DashboardTab({ projectId }: { projectId: number }) {
  const [runs, setRuns] = useState<EvalRun[] | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [detail, setDetail] = useState<EvalRunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | "pass" | "fail">("fail");

  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);

  useEffect(() => {
    api
      .listEvalRuns(projectId)
      .then((rs) => {
        setRuns(rs);
        if (rs.length) {
          setSelectedRunId(rs[0].id);
          setCompareA(rs[1]?.id ?? rs[0].id);
          setCompareB(rs[0].id);
        }
      })
      .catch((e) => setError(String(e)));
  }, [projectId]);

  useEffect(() => {
    if (!selectedRunId) return;
    api.getEvalRun(selectedRunId).then(setDetail).catch((e) => setError(String(e)));
  }, [selectedRunId]);

  const stats = useMemo(() => {
    if (!detail) return null;
    const total = detail.results.length;
    const passed = detail.results.filter((r) => r.overall_pass).length;
    const metricStats: Record<string, { passed: number; total: number; blocker: boolean }> = {};
    for (const r of detail.results) {
      for (const m of r.metric_results) {
        const bucket = metricStats[m.metric_name] ?? { passed: 0, total: 0, blocker: m.is_launch_blocker };
        bucket.total += 1;
        if (m.passed) bucket.passed += 1;
        metricStats[m.metric_name] = bucket;
      }
    }
    const launchBlockerFailures = detail.results.filter((r) =>
      r.metric_results.some((m) => m.is_launch_blocker && !m.passed),
    ).length;
    return {
      total,
      passed,
      passRate: total ? passed / total : 0,
      metricStats,
      launchBlockerFailures,
      launchReady: launchBlockerFailures === 0 && total > 0,
    };
  }, [detail]);

  async function handleCompare() {
    if (!compareA || !compareB) return;
    try {
      const res = await api.compareEvalRuns(projectId, compareA, compareB);
      setCompareResult(res);
    } catch (e) {
      setError(String(e));
    }
  }

  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (runs === null) return <p className="text-sm text-black/50 dark:text-white/50">Loading...</p>;
  if (runs.length === 0) {
    return (
      <Card>
        <p className="text-sm text-black/60 dark:text-white/60">
          No eval runs yet. Go to the Run Eval tab to run your first evaluation.
        </p>
      </Card>
    );
  }

  const visibleResults =
    detail?.results.filter((r) => {
      if (severityFilter === "pass") return r.overall_pass;
      if (severityFilter === "fail") return !r.overall_pass;
      return true;
    }) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <Field label="Eval run">
          <Select value={selectedRunId ?? ""} onChange={(e) => setSelectedRunId(Number(e.target.value))}>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.id} {r.name || "(unnamed)"} {r.version_label ? `— ${r.version_label}` : ""} —{" "}
                {new Date(r.created_at).toLocaleString()}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Launch readiness" value={stats.launchReady ? "Ready" : "Blocked"} tone={stats.launchReady ? "green" : "red"} />
          <StatCard label="Overall pass rate" value={`${(stats.passRate * 100).toFixed(0)}%`} tone={stats.passRate >= 0.9 ? "green" : "amber"} />
          <StatCard label="Results evaluated" value={String(stats.total)} />
          <StatCard label="Launch-blocker failures" value={String(stats.launchBlockerFailures)} tone={stats.launchBlockerFailures ? "red" : "green"} />
        </div>
      )}

      {stats && Object.keys(stats.metricStats).length > 0 && (
        <Card>
          <h3 className="font-medium mb-3">Metric pass rates</h3>
          <div className="space-y-2">
            {Object.entries(stats.metricStats).map(([name, s]) => {
              const rate = s.total ? s.passed / s.total : 0;
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-40 text-sm shrink-0 truncate">
                    {name} {s.blocker && <Badge tone="amber">blocker</Badge>}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full ${rate >= 0.9 ? "bg-green-500" : rate >= 0.7 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${rate * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-black/50 dark:text-white/50 w-20 text-right">
                    {s.passed}/{s.total} ({(rate * 100).toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Results</h3>
          <Select
            className="w-40"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)}
          >
            <option value="fail">Failures only</option>
            <option value="pass">Passing only</option>
            <option value="all">All</option>
          </Select>
        </div>
        {visibleResults.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Nothing to show for this filter.</p>
        ) : (
          <div className="space-y-3">
            {visibleResults.map((r) => (
              <div key={r.id} className="border border-black/10 dark:border-white/10 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-black/40 dark:text-white/40">Test case #{r.test_case_id}</span>
                  <div className="flex items-center gap-2">
                    {r.reviewed && <Badge tone="amber">Reviewed{r.human_override !== null ? ": " + (r.human_override ? "pass" : "fail") : ""}</Badge>}
                    <Badge tone={r.overall_pass ? "green" : "red"}>{r.overall_pass ? "Pass" : "Fail"}</Badge>
                  </div>
                </div>
                <p className="text-sm mb-2">{r.ai_output}</p>
                <div className="flex flex-wrap gap-2">
                  {r.metric_results.map((m) => (
                    <span
                      key={m.rubric_id}
                      title={m.detail}
                      className={`text-xs px-2 py-0.5 rounded ${
                        m.passed
                          ? "bg-green-500/10 text-green-700 dark:text-green-400"
                          : "bg-red-500/10 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {m.metric_name}: {m.passed ? "pass" : "fail"}
                      {m.is_launch_blocker ? " ⚠" : ""}
                    </span>
                  ))}
                </div>
                {r.reviewer_comment && (
                  <p className="text-xs text-black/50 dark:text-white/50 mt-2 italic">"{r.reviewer_comment}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-medium mb-3">Compare two runs (regression check)</h3>
        <div className="grid grid-cols-3 gap-4 items-end">
          <Field label="Version A (baseline)">
            <Select value={compareA ?? ""} onChange={(e) => setCompareA(Number(e.target.value))}>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} {r.version_label || r.name || "run"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Version B (candidate)">
            <Select value={compareB ?? ""} onChange={(e) => setCompareB(Number(e.target.value))}>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} {r.version_label || r.name || "run"}
                </option>
              ))}
            </Select>
          </Field>
          <button onClick={handleCompare} className="px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
            Compare
          </button>
        </div>

        {compareResult && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-black/40 dark:text-white/40 mb-1">
                A: #{compareResult.run_a.eval_run_id} {compareResult.run_a.version_label}
              </p>
              <p className="text-2xl font-semibold">{(compareResult.run_a.pass_rate * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs text-black/40 dark:text-white/40 mb-1">
                B: #{compareResult.run_b.eval_run_id} {compareResult.run_b.version_label}
              </p>
              <p className="text-2xl font-semibold">
                {(compareResult.run_b.pass_rate * 100).toFixed(0)}%{" "}
                <span className={compareResult.pass_rate_delta >= 0 ? "text-green-500 text-base" : "text-red-500 text-base"}>
                  ({compareResult.pass_rate_delta >= 0 ? "+" : ""}
                  {(compareResult.pass_rate_delta * 100).toFixed(1)} pts)
                </span>
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "amber" }) {
  const toneClass =
    tone === "green"
      ? "text-green-600 dark:text-green-400"
      : tone === "red"
        ? "text-red-600 dark:text-red-400"
        : tone === "amber"
          ? "text-amber-600 dark:text-amber-400"
          : "";
  return (
    <Card>
      <p className="text-xs text-black/40 dark:text-white/40 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${toneClass}`}>{value}</p>
    </Card>
  );
}
