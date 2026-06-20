export type RuntimeInfo = Record<string, unknown>;

export interface SessionRecord {
  id: number;
  script_name: string;
  stopped_at: string;
  started_at: string;
  run_time_seconds: number;
  experience_gained: number;
  status: string;
  runtime_info: RuntimeInfo;
}

export interface ScriptHealth {
  script_name: string;
  run_count: number;
  average_runtime_seconds: number;
  latest_stopped_at: string | null;
  total_experience_gained: number;
  recent_success_count: number;
  recent_failure_count: number;
  recent_unknown_count: number;
  recent_sessions: SessionRecord[];
  health_sessions: SessionRecord[];
}
