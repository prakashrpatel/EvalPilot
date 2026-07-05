"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Dataset, EvalRunDetail, Rubric, TestCase } from "@/lib/types";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

export default function RunEvalTab({ projectId }: { projectId: number }) {
  const [datasets, setDatasets] = useState<Dataset[] | null>(null);
  const [rubrics, setRubrics] = useState<Rubric[] | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [testCases, setTestCases] = useState<TestCase[] | null>(null);
  const [outputs, setOutputs] = useState<Record<number, string>>({});
  const [runName, setRunName] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [bulkJson, setBulkJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<EvalRunDetail | null>(null);

  useEffect(() => {
    api.listDatasets(projectId).then((ds) => {
      setDatasets(ds);
      if (ds.length) setSelectedDataset(ds[0]);
    }).catch((e) => setError(String(e)));
    api.listRubrics(projectId).then(setRubrics).catch((e) => setError(String(e)));
  }, [projectId]);

  useEffect(() => {
    if (!selectedDataset) return;
    setResult(null);
    api
      .listTestCases(selectedDataset.id)
      .then((tcs) => {
        setTestCases(tcs);
        setOutputs({});
      })
      .catch((e) => setError(String(e)));
  }, [selectedDataset]);

  function applyBulkJson() {
    try {
      const parsed = JSON.parse(bulkJson) as Record<string, string>;
      const mapped: Record<number, string> = {};
      for (const [k, v] of Object.entries(parsed)) mapped[Number(k)] = v;
      setOutputs((prev) => ({ ...prev, ...mapped }));
      setError(null);
    } catch {
      setError("Bulk paste must be valid JSON: {\"test_case_id\": \"ai output\", ...}");
    }
  }

  async function handleRun() {
    if (!selectedDataset) return;
    setRunning(true);
    setError(null);
    try {
      const run = await api.runEval(projectId, {
        dataset_id: selectedDataset.id,
        name: runName,
        version_label: versionLabel,
        outputs,
      });
      setResult(run);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  if (error && datasets === null) return <div className="text-sm text-red-500">{error}</div>;
  if (datasets === null || rubrics === null) return <p className="text-sm text-black/50 dark:text-white/50">Loading...</p>;

  if (datasets.length === 0) {
    return (
      <Card>
        <p className="text-sm text-black/60 dark:text-white/60">
          Create a dataset with test cases first (Dataset tab).
        </p>
      </Card>
    );
  }
  if (rubrics.length === 0) {
    return (
      <Card>
        <p className="text-sm text-black/60 dark:text-white/60">
          Define at least one rubric criterion first (Rubrics tab).
        </p>
      </Card>
    );
  }

  const filledCount = Object.values(outputs).filter((v) => v && v.trim()).length;

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Dataset">
            <Select
              value={selectedDataset?.id ?? ""}
              onChange={(e) => setSelectedDataset(datasets.find((d) => d.id === Number(e.target.value)) ?? null)}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.version})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Run name">
            <Input value={runName} onChange={(e) => setRunName(e.target.value)} placeholder="Baseline run" />
          </Field>
          <Field label="Version label (for comparison)">
            <Input
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="prompt-v2"
            />
          </Field>
        </div>
      </Card>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 rounded-md px-3 py-2">{error}</div>
      )}

      <Card>
        <h3 className="font-medium mb-2">Bulk paste outputs (optional)</h3>
        <p className="text-xs text-black/40 dark:text-white/40 mb-2">
          {'JSON map of test_case_id -> AI output, e.g. {"1": "Hello, how can I help?"}'}
        </p>
        <div className="flex gap-2">
          <Textarea rows={2} value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} />
          <Button variant="secondary" onClick={applyBulkJson} className="shrink-0 h-fit">
            Apply
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">
            Enter model outputs — {filledCount}/{testCases?.length ?? 0} filled
          </h3>
          <Button onClick={handleRun} disabled={running || filledCount === 0}>
            {running ? "Running..." : "Run Eval"}
          </Button>
        </div>
        <div className="space-y-4">
          {(testCases ?? []).map((tc) => (
            <div key={tc.id} className="grid grid-cols-2 gap-3 border-t border-black/5 dark:border-white/5 pt-3 first:border-0 first:pt-0">
              <div>
                <p className="text-xs text-black/40 dark:text-white/40 mb-1">Input #{tc.id}</p>
                <p className="text-sm">{tc.input_prompt}</p>
                {tc.expected_output && (
                  <p className="text-xs text-black/40 dark:text-white/40 mt-1">
                    Expected: {tc.expected_output}
                  </p>
                )}
              </div>
              <Textarea
                rows={2}
                placeholder="Paste the AI/model output for this input..."
                value={outputs[tc.id] ?? ""}
                onChange={(e) => setOutputs((prev) => ({ ...prev, [tc.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </Card>

      {result && (
        <Card className="border-green-500/40">
          <p className="text-sm">
            Eval run <strong>#{result.id}</strong> completed with {result.results.length} results.{" "}
            <span className="text-black/50 dark:text-white/50">Check the Dashboard tab for details.</span>
          </p>
        </Card>
      )}
    </div>
  );
}
