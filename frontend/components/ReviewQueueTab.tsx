"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ReviewQueueItem } from "@/lib/types";
import { Badge, Button, Card, Field, Select, Textarea } from "@/components/ui";

export default function ReviewQueueTab({ projectId }: { projectId: number }) {
  const [items, setItems] = useState<ReviewQueueItem[] | null>(null);
  const [includeReviewed, setIncludeReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { override: string; comment: string; corrected: string }>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);

  const load = () => {
    api
      .getReviewQueue(projectId, includeReviewed)
      .then((qs) => {
        setItems(qs);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const q of qs) {
            if (!next[q.result_id]) {
              next[q.result_id] = {
                override: q.human_override === null ? "agree" : q.human_override ? "pass" : "fail",
                comment: q.reviewer_comment,
                corrected: q.corrected_output,
              };
            }
          }
          return next;
        });
      })
      .catch((e) => setError(String(e)));
  };

  useEffect(load, [projectId, includeReviewed]);

  function updateDraft(resultId: number, patch: Partial<{ override: string; comment: string; corrected: string }>) {
    setDrafts((prev) => ({ ...prev, [resultId]: { ...prev[resultId], ...patch } }));
  }

  async function handleSubmit(resultId: number) {
    const draft = drafts[resultId];
    if (!draft) return;
    setSubmitting(resultId);
    setError(null);
    try {
      await api.reviewResult(resultId, {
        human_override: draft.override === "agree" ? null : draft.override === "pass",
        reviewer_comment: draft.comment,
        corrected_output: draft.corrected,
      });
      if (!includeReviewed) {
        setItems((prev) => (prev ?? []).filter((i) => i.result_id !== resultId));
      } else {
        load();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(null);
    }
  }

  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (items === null) return <p className="text-sm text-black/50 dark:text-white/50">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-black/60 dark:text-white/60">
          Failed results across all eval runs in this project, queued for human review.
        </p>
        <Select className="w-56" value={includeReviewed ? "all" : "pending"} onChange={(e) => setIncludeReviewed(e.target.value === "all")}>
          <option value="pending">Pending review</option>
          <option value="all">All (incl. reviewed)</option>
        </Select>
      </div>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-black/60 dark:text-white/60">
            {includeReviewed ? "No failed results yet." : "Nothing pending — every failed result has been reviewed."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const draft = drafts[item.result_id] ?? { override: "agree", comment: "", corrected: "" };
            return (
              <Card key={item.result_id}>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge tone={item.severity === "critical" || item.severity === "high" ? "red" : "neutral"}>
                    {item.severity}
                  </Badge>
                  <Badge tone="red">Failed</Badge>
                  <span className="text-xs text-black/40 dark:text-white/40">
                    Run #{item.eval_run_id} {item.eval_run_name || ""} {item.version_label ? `— ${item.version_label}` : ""}
                  </span>
                  {item.reviewed && <Badge tone="green">Reviewed</Badge>}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-black/40 dark:text-white/40 mb-1">Input</p>
                    <p className="text-sm">{item.input_prompt}</p>
                    {item.expected_output && (
                      <p className="text-xs text-black/40 dark:text-white/40 mt-2">
                        Expected: {item.expected_output}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-black/40 dark:text-white/40 mb-1">AI output</p>
                    <p className="text-sm">{item.ai_output}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {item.metric_results
                    .filter((m) => !m.passed)
                    .map((m) => (
                      <span
                        key={m.rubric_id}
                        title={m.detail}
                        className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-700 dark:text-red-400"
                      >
                        {m.metric_name}: fail{m.is_launch_blocker ? " ⚠" : ""}
                      </span>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-black/5 dark:border-white/5 pt-3">
                  <Field label="Reviewer verdict">
                    <Select
                      value={draft.override}
                      onChange={(e) => updateDraft(item.result_id, { override: e.target.value })}
                    >
                      <option value="agree">Agree with automated fail</option>
                      <option value="pass">Override to Pass</option>
                      <option value="fail">Override to Fail (confirm)</option>
                    </Select>
                  </Field>
                  <div className="col-span-2">
                    <Field label="Comment">
                      <Textarea
                        rows={1}
                        value={draft.comment}
                        onChange={(e) => updateDraft(item.result_id, { comment: e.target.value })}
                        placeholder="Why does this pass/fail? What should change?"
                      />
                    </Field>
                  </div>
                  <div className="col-span-3">
                    <Field label="Corrected / ideal answer (optional)">
                      <Textarea
                        rows={1}
                        value={draft.corrected}
                        onChange={(e) => updateDraft(item.result_id, { corrected: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="col-span-3 flex justify-end">
                    <Button onClick={() => handleSubmit(item.result_id)} disabled={submitting === item.result_id}>
                      {submitting === item.result_id ? "Saving..." : item.reviewed ? "Update review" : "Submit review"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
