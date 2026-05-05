import { useState } from "react";
import type React from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  HelpCircle,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchScriptHealth, fetchScripts } from "./api";
import { formatDateTime, formatNumber, formatRuntime } from "./format";
import type { ScriptHealth, SessionRecord } from "./types";

export function App() {
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const scriptsQuery = useQuery({
    queryKey: ["scripts"],
    queryFn: fetchScripts,
  });
  const detailQuery = useQuery({
    queryKey: ["script-health", selectedScript],
    queryFn: () => fetchScriptHealth(selectedScript!),
    enabled: selectedScript !== null,
  });

  const scripts = scriptsQuery.data ?? [];
  const activeScript =
    detailQuery.data ??
    scripts.find((script) => script.script_name === selectedScript) ??
    scripts[0];

  return (
    <main className="h-screen overflow-hidden bg-panel text-ink">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="shrink-0 border-b border-line bg-panel/95 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-brand sm:text-3xl">
                Script Status
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Bot sessions and recent health by script.
              </p>
            </div>
            <div className="grid gap-3 text-sm">
              <Metric
                label="Sessions"
                value={formatNumber(
                  scripts.reduce((sum, script) => sum + script.run_count, 0),
                )}
              />
            </div>
          </div>
        </header>

        <div className="flex shrink-0 flex-col gap-3 py-4">
          {scriptsQuery.isLoading ? (
            <StateMessage text="Loading sessions..." />
          ) : null}
          {scriptsQuery.isError ? (
            <StateMessage text="Unable to load sessions." tone="bad" />
          ) : null}
          {!scriptsQuery.isLoading &&
          !scriptsQuery.isError &&
          scripts.length === 0 ? (
            <StateMessage text="No sessions found." />
          ) : null}
        </div>

        <section className="grid min-h-0 flex-1 gap-6 pb-5 lg:grid-cols-[minmax(320px,420px)_1fr]">
          <div className="themed-scrollbar min-h-0 overflow-y-auto pr-1">
            <div className="grid gap-3" aria-label="Script summaries">
              {scripts.map((script) => (
                <ScriptSummaryCard
                  key={script.script_name}
                  script={script}
                  selected={script.script_name === activeScript?.script_name}
                  onSelect={() => setSelectedScript(script.script_name)}
                />
              ))}
            </div>
          </div>

          <div className="min-h-0">
            {activeScript ? (
              <ScriptDetail
                script={activeScript}
                loading={detailQuery.isFetching && selectedScript !== null}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-md border border-line bg-surface px-3 py-2 shadow-sm">
      <div className="text-xs text-slate-300">{label}</div>
      <div className="truncate text-base font-semibold">{value}</div>
    </div>
  );
}

function StateMessage({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: "neutral" | "bad";
}) {
  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm ${tone === "bad" ? "border-red-400/50 bg-red-950/30 text-bad" : "border-line bg-surface text-slate-300"}`}
    >
      {text}
    </div>
  );
}

function ScriptSummaryCard({
  script,
  selected,
  onSelect,
}: {
  script: ScriptHealth;
  selected: boolean;
  onSelect: () => void;
}) {
  const failures = script.recent_failure_count;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-md border bg-surface p-4 text-left shadow-sm transition hover:border-good hover:bg-muted hover:shadow ${
        selected ? "border-good bg-muted ring-2 ring-good/25" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">
            {script.script_name}
          </div>
          <div className="mt-1 text-xs text-slate-300">
            Latest {formatDateTime(script.latest_stopped_at)}
          </div>
        </div>
        {failures > 0 ? (
          <XCircle className="h-5 w-5 shrink-0 text-bad" />
        ) : (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-good" />
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <SummaryCell label="Runs" value={formatNumber(script.run_count)} />
        <SummaryCell
          label="Avg"
          value={formatRuntime(script.average_runtime_seconds)}
        />
      </div>
    </button>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-300">{label}</div>
      <div className="truncate font-semibold">{value}</div>
    </div>
  );
}

function ScriptDetail({
  script,
  loading,
}: {
  script: ScriptHealth;
  loading: boolean;
}) {
  const statusCounts = getSessionStatusCounts(script.recent_sessions);

  return (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0 border-b border-line pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand">
              {script.script_name}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {script.run_count} runs,{" "}
              {formatRuntime(script.average_runtime_seconds)} average runtime.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {statusCounts.map(({ status, count }) => (
              <Pill
                key={status}
                icon={getStatusIcon(status)}
                label={`${count} ${formatStatus(status)}`}
                className={getStatusPillClass(status)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="themed-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        {loading ? <StateMessage text="Refreshing script detail..." /> : null}

        {script.recent_sessions.length > 0 ? (
          <div className="grid gap-3">
            {script.recent_sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <StateMessage text="No recent sessions found for this script." />
        )}
      </div>
    </section>
  );
}

function getSessionStatusCounts(sessions: SessionRecord[]) {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    const normalized = session.status.toUpperCase();
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => left.status.localeCompare(right.status));
}

function Pill({
  icon,
  label,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

function getStatusPillClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "SUCCESS") {
    return "border-green-400/40 bg-green-950/30 text-good";
  }
  if (normalized === "UNKNOWN") {
    return "border-amber-400/40 bg-amber-950/30 text-warn";
  }
  if (normalized === "MISSING_REQUIREMENTS") {
    return "border-slate-400/50 bg-muted text-slate-200";
  }
  if (normalized === "STUCK" || normalized === "ERROR") {
    return "border-red-400/40 bg-red-950/30 text-bad";
  }
  return "border-line bg-surface text-slate-300";
}

function SessionRow({ session }: { session: SessionRecord }) {
  const xpPerHour =
    getNumberField(session.runtime_info, "xp_gained_hr") ??
    calculateXpPerHour(session);
  const level = getNumberField(session.runtime_info, "level");
  const levelsGained = getNumberField(session.runtime_info, "levels_gained");
  const highlightClass = getStatusHighlightClass(session.status);

  return (
    <article
      className={`rounded-md border bg-surface p-4 shadow-sm ${highlightClass}`}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SessionFact
          icon={getStatusIcon(session.status)}
          label="Status"
          value={formatStatus(session.status)}
        />
        <SessionFact
          icon={<Clock className="h-4 w-4" />}
          label="Started"
          value={formatDateTime(session.started_at)}
        />
        <SessionFact
          icon={<Clock className="h-4 w-4" />}
          label="Stopped"
          value={formatDateTime(session.stopped_at)}
        />
        <SessionFact
          icon={<Activity className="h-4 w-4" />}
          label="Runtime"
          value={formatRuntime(session.run_time_seconds)}
        />
        <SessionFact
          icon={<Database className="h-4 w-4" />}
          label="XP gained"
          value={formatNumber(session.experience_gained)}
        />
        <SessionFact
          icon={<TrendingUp className="h-4 w-4" />}
          label="XP/hr"
          value={formatOptionalNumber(xpPerHour)}
        />
        <SessionFact
          icon={<BarChart3 className="h-4 w-4" />}
          label="Level"
          value={formatOptionalNumber(level)}
        />
        <SessionFact
          icon={<BarChart3 className="h-4 w-4" />}
          label="Levels gained"
          value={formatOptionalNumber(levelsGained)}
        />
      </div>
    </article>
  );
}

function getStatusHighlightClass(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "SUCCESS") {
    return "border-good ring-2 ring-good/25";
  }
  if (normalized === "UNKNOWN") {
    return "border-warn ring-2 ring-warn/25";
  }
  if (normalized === "MISSING_REQUIREMENTS") {
    return "border-slate-400 ring-2 ring-slate-400/25";
  }
  if (normalized === "STUCK" || normalized === "ERROR") {
    return "border-bad ring-2 ring-bad/25";
  }
  return "border-line";
}

function getStatusIcon(status: string): React.ReactNode {
  const normalized = status.toUpperCase();
  if (normalized === "SUCCESS") {
    return <CheckCircle2 className="h-4 w-4 text-good" />;
  }
  if (normalized === "UNKNOWN") {
    return <AlertTriangle className="h-4 w-4 text-warn" />;
  }
  if (normalized === "MISSING_REQUIREMENTS") {
    return <AlertTriangle className="h-4 w-4 text-slate-300" />;
  }
  if (normalized === "STUCK" || normalized === "ERROR") {
    return <XCircle className="h-4 w-4 text-bad" />;
  }
  return <HelpCircle className="h-4 w-4 text-slate-400" />;
}

function SessionFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-xs text-slate-300">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function getNumberField(
  value: Record<string, unknown>,
  key: string,
): number | null {
  const field = value[key];
  if (typeof field === "number" && Number.isFinite(field)) {
    return field;
  }
  if (typeof field === "string" && field.trim() !== "") {
    const parsed = Number(field);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function calculateXpPerHour(session: SessionRecord): number | null {
  if (session.run_time_seconds <= 0) {
    return null;
  }
  return Math.round(
    (session.experience_gained / session.run_time_seconds) * 3600,
  );
}

function formatOptionalNumber(value: number | null): string {
  return value === null ? "N/A" : formatNumber(value);
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
