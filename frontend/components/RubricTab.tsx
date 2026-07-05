"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CheckType, Rubric } from "@/lib/types";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

const CHECK_TYPES: { value: CheckType; label: string; hint: string }[] = [
  { value: "exact_match", label: "Exact match", hint: "Output must exactly equal the expected output." },
  { value: "contains", label: "Contains keywords", hint: "Output must contain all listed keywords." },
  { value: "forbidden_words", label: "Forbidden words", hint: "Output must NOT contain any listed words/phrases." },
  { value: "regex", label: "Regex match", hint: "Output must match a regex pattern." },
  { value: "json_valid", label: "Valid JSON", hint: "Output must be parseable JSON." },
  {
    value: "reference_similarity",
    label: "Reference similarity",
    hint: "Word-overlap score against expected output must meet a threshold.",
  },
];

const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export default function RubricTab({ projectId }: { projectId: number }) {
  const [rubrics, setRubrics] = useState<Rubric[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    metric_name: "",
    description: "",
    check_type: "contains" as CheckType,
    severity: "medium" as (typeof SEVERITIES)[number],
    is_launch_blocker: false,
    configText: "",
  });

  const load = () => {
    api
      .listRubrics(projectId)
      .then(setRubrics)
      .catch((e) => setError(String(e)));
  };

  useEffect(load, [projectId]);

  function parseConfig(): Record<string, unknown> {
    const text = form.configText.trim();
    switch (form.check_type) {
      case "contains":
        return { keywords: text.split(",").map((s) => s.trim()).filter(Boolean) };
      case "forbidden_words":
        return { forbidden: text.split(",").map((s) => s.trim()).filter(Boolean) };
      case "regex":
        return { pattern: text };
      case "reference_similarity":
        return { threshold: text ? Number(text) : 0.5 };
      default:
        return {};
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.metric_name.trim()) return;
    try {
      const rubric = await api.createRubric(projectId, {
        metric_name: form.metric_name,
        description: form.description,
        check_type: form.check_type,
        severity: form.severity,
        is_launch_blocker: form.is_launch_blocker,
        config: parseConfig(),
      });
      setRubrics((prev) => [...(prev ?? []), rubric]);
      setForm({ metric_name: "", description: "", check_type: "contains", severity: "medium", is_launch_blocker: false, configText: "" });
      setShowForm(false);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteRubric(projectId, id);
      setRubrics((prev) => (prev ?? []).filter((r) => r.id !== id));
    } catch (e) {
      setError(String(e));
    }
  }

  const configHint = CHECK_TYPES.find((c) => c.value === form.check_type)?.hint ?? "";
  const configLabel =
    form.check_type === "contains"
      ? "Required keywords (comma-separated)"
      : form.check_type === "forbidden_words"
        ? "Forbidden words/phrases (comma-separated)"
        : form.check_type === "regex"
          ? "Regex pattern"
          : form.check_type === "reference_similarity"
            ? "Word-overlap threshold (0-1, default 0.5)"
            : null;

  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (rubrics === null) return <p className="text-sm text-black/50 dark:text-white/50">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "+ Add Rubric Criterion"}</Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <Field label="Metric name">
              <Input
                required
                value={form.metric_name}
                onChange={(e) => setForm({ ...form, metric_name: e.target.value })}
                placeholder="Policy Compliance"
              />
            </Field>
            <Field label="Check type">
              <Select
                value={form.check_type}
                onChange={(e) => setForm({ ...form, check_type: e.target.value as CheckType, configText: "" })}
              >
                {CHECK_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="col-span-2">
              <Field label="Description">
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this metric measure?"
                />
              </Field>
            </div>
            {configLabel && (
              <div className="col-span-2">
                <Field label={configLabel}>
                  <Input value={form.configText} onChange={(e) => setForm({ ...form, configText: e.target.value })} />
                </Field>
                <p className="text-xs text-black/40 dark:text-white/40 mt-1">{configHint}</p>
              </div>
            )}
            <Field label="Severity">
              <Select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as typeof form.severity })}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_launch_blocker}
                  onChange={(e) => setForm({ ...form, is_launch_blocker: e.target.checked })}
                />
                Launch blocker (critical failures block launch readiness)
              </label>
            </div>
            <div className="col-span-2 flex justify-end">
              <Button type="submit">Add Rubric</Button>
            </div>
          </form>
        </Card>
      )}

      {rubrics.length === 0 ? (
        <Card>
          <p className="text-sm text-black/60 dark:text-white/60">
            No rubric criteria yet. Add at least one before running an eval.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rubrics.map((r) => (
            <Card key={r.id} className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{r.metric_name}</h3>
                  <Badge>{CHECK_TYPES.find((c) => c.value === r.check_type)?.label ?? r.check_type}</Badge>
                  <Badge tone={r.severity === "critical" || r.severity === "high" ? "red" : "neutral"}>
                    {r.severity}
                  </Badge>
                  {r.is_launch_blocker && <Badge tone="amber">Launch blocker</Badge>}
                </div>
                {r.description && <p className="text-sm text-black/60 dark:text-white/60">{r.description}</p>}
                {Object.keys(r.config ?? {}).length > 0 && (
                  <p className="text-xs text-black/40 dark:text-white/40 mt-1 font-mono">
                    {JSON.stringify(r.config)}
                  </p>
                )}
              </div>
              <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline shrink-0">
                Delete
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
