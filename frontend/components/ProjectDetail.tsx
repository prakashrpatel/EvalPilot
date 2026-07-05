"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import DatasetTab from "@/components/DatasetTab";
import RubricTab from "@/components/RubricTab";
import RunEvalTab from "@/components/RunEvalTab";
import DashboardTab from "@/components/DashboardTab";
import ReviewQueueTab from "@/components/ReviewQueueTab";

const TABS = ["Dataset", "Rubrics", "Run Eval", "Review Queue", "Dashboard"] as const;
type Tab = (typeof TABS)[number];

export default function ProjectDetail({ projectId }: { projectId: number }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<Tab>("Dataset");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProject(projectId)
      .then(setProject)
      .catch((e) => setError(String(e)));
  }, [projectId]);

  if (error) return <div className="text-sm text-red-500">{error}</div>;
  if (!project) return <p className="text-sm text-black/50 dark:text-white/50">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        <p className="text-sm text-black/60 dark:text-white/60 mt-1">
          {project.description || "No description"}
        </p>
      </div>

      <div className="flex gap-1 border-b border-black/10 dark:border-white/10">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        {tab === "Dataset" && <DatasetTab projectId={projectId} />}
        {tab === "Rubrics" && <RubricTab projectId={projectId} />}
        {tab === "Run Eval" && <RunEvalTab projectId={projectId} />}
        {tab === "Review Queue" && <ReviewQueueTab projectId={projectId} />}
        {tab === "Dashboard" && <DashboardTab projectId={projectId} />}
      </div>
    </div>
  );
}
