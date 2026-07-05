"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Project, UseCaseType } from "@/lib/types";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

const USE_CASE_TYPES: { value: UseCaseType; label: string }[] = [
  { value: "chatbot", label: "Chatbot" },
  { value: "rag", label: "RAG / Knowledge Assistant" },
  { value: "summarization", label: "Summarization" },
  { value: "content_generation", label: "Content Generation" },
  { value: "agent", label: "AI Agent" },
];

export default function HomePage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    use_case_type: "chatbot" as UseCaseType,
    owner: "",
  });
  const [creating, setCreating] = useState(false);

  const load = () => {
    api
      .listProjects()
      .then(setProjects)
      .catch((e) => setError(String(e)));
  };

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.createProject(form);
      setForm({ name: "", description: "", use_case_type: "chatbot", owner: "" });
      setShowForm(false);
      load();
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Eval Projects</h1>
          <p className="text-sm text-black/60 dark:text-white/60 mt-1">
            Define quality, run evals, and make launch decisions for your AI features.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "+ New Project"}</Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 rounded-md px-3 py-2">{error}</div>
      )}

      {showForm && (
        <Card>
          <form className="grid grid-cols-2 gap-4" onSubmit={handleCreate}>
            <div className="col-span-2">
              <Field label="Project name">
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Customer Support Chatbot"
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Description">
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this AI feature do?"
                />
              </Field>
            </div>
            <Field label="AI use case type">
              <Select
                value={form.use_case_type}
                onChange={(e) => setForm({ ...form, use_case_type: e.target.value as UseCaseType })}
              >
                {USE_CASE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Owner">
              <Input
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                placeholder="Your name"
              />
            </Field>
            <div className="col-span-2 flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {projects === null ? (
        <p className="text-sm text-black/50 dark:text-white/50">Loading...</p>
      ) : projects.length === 0 ? (
        <Card>
          <p className="text-sm text-black/60 dark:text-white/60">
            No eval projects yet. Create one to define quality criteria for an AI feature.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="h-full hover:border-blue-500/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-medium">{p.name}</h2>
                  <span className="text-[10px] uppercase tracking-wide text-black/40 dark:text-white/40">
                    {p.use_case_type.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-black/60 dark:text-white/60 line-clamp-2">
                  {p.description || "No description"}
                </p>
                {p.owner && (
                  <p className="text-xs text-black/40 dark:text-white/40 mt-3">Owner: {p.owner}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
