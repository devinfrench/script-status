import type { ScriptHealth, SessionRecord } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchScripts(): Promise<ScriptHealth[]> {
  return getJson<ScriptHealth[]>("/api/scripts");
}

export function fetchScriptHealth(scriptName: string): Promise<ScriptHealth> {
  return getJson<ScriptHealth>(`/api/scripts/${encodeURIComponent(scriptName)}/health`);
}

export function fetchSessions(scriptName?: string): Promise<SessionRecord[]> {
  const query = scriptName ? `?script_name=${encodeURIComponent(scriptName)}` : "";
  return getJson<SessionRecord[]>(`/api/sessions${query}`);
}
