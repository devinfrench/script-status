import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const scripts = [
  {
    script_name: "Agility",
    run_count: 2,
    average_runtime_seconds: 120,
    latest_stopped_at: "2026-05-04T12:00:00Z",
    total_experience_gained: 2500,
    recent_success_count: 1,
    recent_failure_count: 1,
    recent_unknown_count: 0,
    recent_sessions: [
      {
        id: 1,
        script_name: "Agility",
        stopped_at: "2026-05-04T12:00:00Z",
        started_at: "2026-05-04T11:58:00Z",
        run_time_seconds: 120,
        experience_gained: 1500,
        status: "MISSING_REQUIREMENTS",
        runtime_info: {
          status: "failed",
          reason: "bank pin",
          xp_gained_hr: 45000,
          level: 82,
          levels_gained: 1
        }
      }
    ]
  },
  {
    script_name: "Fishing",
    run_count: 1,
    average_runtime_seconds: 540000,
    latest_stopped_at: "2026-05-03T12:00:00Z",
    total_experience_gained: 10000,
    recent_success_count: 1,
    recent_failure_count: 0,
    recent_unknown_count: 0,
    recent_sessions: []
  }
];

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/scripts/Agility/health")) {
          return Promise.resolve(new Response(JSON.stringify(scripts[0]), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify(scripts), { status: 200 }));
      })
    );
  });

  it("renders script summaries and selected session metrics", async () => {
    renderApp();

    expect((await screen.findAllByText("Agility")).length).toBeGreaterThan(0);
    expect(screen.getByText("Fishing")).toBeInTheDocument();
    expect(screen.getByText("XP/hr")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Missing Requirements")).toBeInTheDocument();
    expect(screen.getByText("45,000")).toBeInTheDocument();
    expect(screen.getByText("Level")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("Levels gained")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.queryByText(/bank pin/)).not.toBeInTheDocument();
  });

  it("filters scripts", async () => {
    renderApp();

    await screen.findAllByText("Agility");
    await userEvent.type(screen.getByLabelText("Filter scripts"), "fish");

    const summaries = screen.getByLabelText("Script summaries");
    await waitFor(() => expect(within(summaries).queryByText("Agility")).not.toBeInTheDocument());
    expect(within(summaries).getByText("Fishing")).toBeInTheDocument();
  });
});
