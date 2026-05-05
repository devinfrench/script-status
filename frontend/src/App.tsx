import { useMemo, useState } from "react";
import type React from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchScriptHealth, fetchScripts } from "./api";
import { formatDateTime, formatNumber, formatRuntime } from "./format";
import type { ScriptHealth, SessionRecord } from "./types";

export function App() {
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
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
  const filteredScripts = useMemo(() => {
    const normalized = filter.trim().toLowerCase();
    if (!normalized) return scripts;
    return scripts.filter((script) =>
      script.script_name.toLowerCase().includes(normalized),
    );
  }, [filter, scripts]);

  const activeScript =
    detailQuery.data ??
    scripts.find((script) => script.script_name === selectedScript) ??
    scripts[0];

  return (
    <main className="min-h-screen bg-panel text-ink">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
              Script Status
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Bot sessions and recent health by script.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Scripts" value={scripts.length.toString()} />
            <Metric
              label="Runs"
              value={formatNumber(
                scripts.reduce((sum, script) => sum + script.run_count, 0),
              )}
            />
          </div>
        </header>

        {scriptsQuery.isLoading ? (
          <StateMessage text="Loading script health..." />
        ) : null}
        {scriptsQuery.isError ? (
          <StateMessage text="Unable to load script health." tone="bad" />
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                aria-label="Filter scripts"
                className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none ring-good/20 transition focus:border-good focus:ring-4"
                placeholder="Filter scripts"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </div>
            <div className="grid gap-3" aria-label="Script summaries">
              {filteredScripts.map((script) => (
                <ScriptSummaryCard
                  key={script.script_name}
                  script={script}
                  selected={script.script_name === activeScript?.script_name}
                  onSelect={() => setSelectedScript(script.script_name)}
                />
              ))}
              {!scriptsQuery.isLoading && filteredScripts.length === 0 ? (
                <StateMessage text="No scripts match the current filter." />
              ) : null}
            </div>
          </div>

          <div>
            {activeScript ? (
              <ScriptDetail
                script={activeScript}
                loading={detailQuery.isFetching && selectedScript !== null}
              />
            ) : (
              <StateMessage text="No sessions found." />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-md border border-line bg-white px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
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
      className={`rounded-md border px-4 py-3 text-sm ${tone === "bad" ? "border-red-200 bg-red-50 text-bad" : "border-line bg-white text-slate-600"}`}
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
      className={`rounded-md border bg-white p-4 text-left transition hover:border-good hover:shadow-sm ${
        selected ? "border-good ring-2 ring-good/15" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">
            {script.script_name}
          </div>
          <div className="mt-1 text-xs text-slate-500">
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
      <div className="text-slate-500">{label}</div>
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
  return (
    <section className="flex flex-col gap-4">
      <div className="border-b border-line pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{script.script_name}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {script.run_count} runs,{" "}
              {formatRuntime(script.average_runtime_seconds)} average runtime.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Pill
              icon={<CheckCircle2 className="h-4 w-4" />}
              label={`${script.recent_success_count} success`}
              tone="good"
            />
            <Pill
              icon={<XCircle className="h-4 w-4" />}
              label={`${script.recent_failure_count} failure`}
              tone="bad"
            />
            <Pill
              icon={<AlertTriangle className="h-4 w-4" />}
              label={`${script.recent_unknown_count} unknown`}
              tone="warn"
            />
          </div>
        </div>
      </div>

      {loading ? <StateMessage text="Refreshing script detail..." /> : null}

      <div className="grid gap-3">
        {script.recent_sessions.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </div>
    </section>
  );
}

function Pill({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "good" | "bad" | "warn";
}) {
  const toneClass = {
    good: "border-green-200 bg-green-50 text-good",
    bad: "border-red-200 bg-red-50 text-bad",
    warn: "border-amber-200 bg-amber-50 text-warn",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${toneClass}`}
    >
      {icon}
      {label}
    </span>
  );
}

function SessionRow({ session }: { session: SessionRecord }) {
  const xpPerHour =
    getNumberField(session.runtime_info, "xp_gained_hr") ??
    calculateXpPerHour(session);
  const level = getNumberField(session.runtime_info, "level");
  const levelsGained = getNumberField(session.runtime_info, "levels_gained");

  return (
    <article className="rounded-md border border-line bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
      <div className="flex items-center gap-1 text-xs text-slate-500">
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
