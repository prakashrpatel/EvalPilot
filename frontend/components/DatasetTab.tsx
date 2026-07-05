"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Dataset, TestCase } from "@/lib/types";
import { Button, Card, Field, Input, Select, Textarea, Badge } from "@/components/ui";

const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export default function DatasetTab({ projectId }: { projectId: number }) {
  const [datasets, setDatasets] = useState<Dataset[] | null>(null);
  const [selected, setSelected] = useState<Dataset | null>(null);
  const [testCases, setTestCases] = useState<TestCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newDatasetName, setNewDatasetName] = useState("");
  const [showAddCase, setShowAddCase] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const [caseForm, setCaseForm] = useState({
    input_prompt: "",
    expected_output: "",
    context: "",
    tags: "",
    severity: "medium" as (typeof SEVERITIES)[number],
    is_golden: true,
  });

  const loadDatasets = () => {
    api
      .listDatasets(projectId)
      .then((ds) => {
        setDatasets(ds);
        if (ds.length && !selected) setSelected(ds[0]);
      })
      .catch((e) => setError(String(e)));
  };

  const loadTestCases = (datasetId: number) => {
    api
      .listTestCases(datasetId)
      .then(setTestCases)
      .catch((e) => setError(String(e)));
  };

  useEffect(loadDatasets, [projectId]);
  useEffect(() => {
    if (selected) loadTestCases(selected.id);
  }, [selected]);

  async function handleCreateDataset(e: React.FormEvent) {
    e.preventDefault();
    if (!newDatasetName.trim()) return;
    try {
      const ds = await api.createDataset(projectId, { name: newDatasetName, version: "v1", source: "manual" });
      setNewDatasetName("");
      setDatasets((prev) => [ds, ...(prev ?? [])]);
      setSelected(ds);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleAddCase(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !caseForm.input_prompt.trim()) return;
    try {
      const tc = await api.createTestCase(selected.id, caseForm);
      setTestCases((prev) => [...(prev ?? []), tc]);
      setCaseForm({ input_prompt: "", expected_output: "", context: "", tags: "", severity: "medium", is_golden: true });
      setShowAddCase(false);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDeleteCase(id: number) {
    try {
      await api.deleteTestCase(id);
      setTestCases((prev) => (prev ?? []).filter((tc) => tc.id !== id));
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleImport(file: File) {
    if (!selected) return;
    setImporting(true);
    setError(null);
    try {
      const created = await api.importTestCases(selected.id, file);
      setTestCases((prev) => [...(prev ?? []), ...created]);
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (datasets === null) return <p className="text-sm text-black/50 dark:text-white/50">Loading...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="Datasets">
              <Select
                value={selected?.id ?? ""}
                onChange={(e) => setSelected(datasets.find((d) => d.id === Number(e.target.value)) ?? null)}
              >
                {datasets.length === 0 && <option value="">No datasets yet</option>}
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.version})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <form onSubmit={handleCreateDataset} className="flex items-end gap-2">
            <Field label="New dataset name">
              <Input
                value={newDatasetName}
                onChange={(e) => setNewDatasetName(e.target.value)}
                placeholder="Golden set v1"
              />
            </Field>
            <Button type="submit">Create</Button>
          </form>
        </div>
      </Card>

      {selected && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">
              Test cases — {selected.name}{" "}
              <span className="text-black/40 dark:text-white/40 text-sm">({testCases?.length ?? 0})</span>
            </h3>
            <div className="flex gap-2">
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
              />
              <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={importing}>
                {importing ? "Importing..." : "Import CSV/JSON"}
              </Button>
              <Button onClick={() => setShowAddCase((v) => !v)}>{showAddCase ? "Cancel" : "+ Add Test Case"}</Button>
            </div>
          </div>

          <p className="text-xs text-black/40 dark:text-white/40 mb-4">
            CSV/JSON columns: input_prompt, expected_output, context, tags, severity, is_golden
          </p>

          {showAddCase && (
            <form onSubmit={handleAddCase} className="grid grid-cols-2 gap-3 mb-5 border border-black/10 dark:border-white/10 rounded-md p-4">
              <div className="col-span-2">
                <Field label="Input prompt">
                  <Textarea
                    required
                    rows={2}
                    value={caseForm.input_prompt}
                    onChange={(e) => setCaseForm({ ...caseForm, input_prompt: e.target.value })}
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Expected output / ideal answer">
                  <Textarea
                    rows={2}
                    value={caseForm.expected_output}
                    onChange={(e) => setCaseForm({ ...caseForm, expected_output: e.target.value })}
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Context / source material (optional)">
                  <Textarea
                    rows={2}
                    value={caseForm.context}
                    onChange={(e) => setCaseForm({ ...caseForm, context: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Tags (comma-separated)">
                <Input value={caseForm.tags} onChange={(e) => setCaseForm({ ...caseForm, tags: e.target.value })} />
              </Field>
              <Field label="Severity">
                <Select
                  value={caseForm.severity}
                  onChange={(e) => setCaseForm({ ...caseForm, severity: e.target.value as typeof caseForm.severity })}
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="col-span-2 flex justify-end">
                <Button type="submit">Add</Button>
              </div>
            </form>
          )}

          {testCases && testCases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-black/40 dark:text-white/40 border-b border-black/10 dark:border-white/10">
                    <th className="py-2 pr-3">Input</th>
                    <th className="py-2 pr-3">Expected output</th>
                    <th className="py-2 pr-3">Severity</th>
                    <th className="py-2 pr-3">Tags</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {testCases.map((tc) => (
                    <tr key={tc.id} className="border-b border-black/5 dark:border-white/5 align-top">
                      <td className="py-2 pr-3 max-w-xs truncate" title={tc.input_prompt}>
                        {tc.input_prompt}
                      </td>
                      <td className="py-2 pr-3 max-w-xs truncate" title={tc.expected_output}>
                        {tc.expected_output || <span className="text-black/30 dark:text-white/30">—</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge tone={tc.severity === "critical" || tc.severity === "high" ? "red" : "neutral"}>
                          {tc.severity}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-black/50 dark:text-white/50">{tc.tags}</td>
                      <td className="py-2 pr-3 text-right">
                        <button
                          onClick={() => handleDeleteCase(tc.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">No test cases yet.</p>
          )}
        </Card>
      )}
    </div>
  );
}
