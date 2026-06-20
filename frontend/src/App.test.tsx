import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function session(id: number, scriptName: string, status: string) {
  return {
    id,
    script_name: scriptName,
    stopped_at: "2026-05-04T12:00:00Z",
    started_at: "2026-05-04T11:58:00Z",
    run_time_seconds: 120,
    experience_gained: 1500,
    status,
    runtime_info: {
      xp_gained_hr: 45000,
      level: 82,
      levels_gained: 1
    }
  };
}

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
    recent_sessions: [session(1, "Agility", "MISSING_REQUIREMENTS")]
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
  },
  {
    script_name: "Cooking",
    run_count: 26,
    average_runtime_seconds: 300,
    latest_stopped_at: "2026-05-02T12:00:00Z",
    total_experience_gained: 26000,
    recent_success_count: 26,
    recent_failure_count: 0,
    recent_unknown_count: 0,
    recent_sessions: Array.from({ length: 26 }, (_, index) =>
      session(100 + index, "Cooking", "SUCCESS"),
    )
  },
  {
    script_name: "Mining",
    run_count: 10,
    average_runtime_seconds: 300,
    latest_stopped_at: "2026-05-01T12:00:00Z",
    total_experience_gained: 3000,
    recent_success_count: 9,
    recent_failure_count: 1,
    recent_unknown_count: 0,
    recent_sessions: [
      session(5, "Mining", "STUCK"),
      ...Array.from({ length: 9 }, (_, index) =>
        session(6 + index, "Mining", "SUCCESS"),
      )
    ]
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
        if (url.includes("/api/scripts/Fishing/health")) {
          return Promise.resolve(new Response(JSON.stringify(scripts[1]), { status: 200 }));
        }
        if (url.includes("/api/scripts/Cooking/health")) {
          return Promise.resolve(new Response(JSON.stringify(scripts[2]), { status: 200 }));
        }
        if (url.includes("/api/scripts/Mining/health")) {
          return Promise.resolve(new Response(JSON.stringify(scripts[3]), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify(scripts), { status: 200 }));
      })
    );
  });

  it("renders script summaries and selected session metrics", async () => {
    renderApp();

    expect((await screen.findAllByText("Agility")).length).toBeGreaterThan(0);
    expect(screen.getByText("Fishing")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("XP/hr")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Missing Requirements")).toBeInTheDocument();
    expect(screen.getByText("45,000")).toBeInTheDocument();
    expect(screen.getByText("Level")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("Levels gained")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.queryByText(/bank pin/)).not.toBeInTheDocument();
    const summaries = screen.getByLabelText("Script summaries");
    expect(within(summaries).getByText("Agility")).toBeInTheDocument();
    expect(within(summaries).getByText("Fishing")).toBeInTheDocument();
    expect(screen.queryByLabelText("Filter scripts")).not.toBeInTheDocument();
  });

  it("labels script card health from recent session percentages", async () => {
    renderApp();

    const summaries = screen.getByLabelText("Script summaries");

    expect(
      await within(summaries).findByRole("button", {
        name: "Agility health good",
      }),
    ).toBeInTheDocument();
    expect(
      within(summaries).getByRole("button", {
        name: "Fishing health neutral",
      }),
    ).toBeInTheDocument();
    expect(
      within(summaries).getByRole("button", {
        name: "Cooking health good",
      }),
    ).toBeInTheDocument();
    expect(
      within(summaries).getByRole("button", {
        name: "Mining health warn",
      }),
    ).toBeInTheDocument();
  });

  it("sorts script summaries alphabetically by script name", async () => {
    renderApp();

    const summaries = screen.getByLabelText("Script summaries");
    await within(summaries).findByText("Agility");

    expect(
      within(summaries)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringContaining("Agility"),
      expect.stringContaining("Cooking"),
      expect.stringContaining("Fishing"),
      expect.stringContaining("Mining"),
    ]);
  });

  it("shows a single load error when sessions cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response("server error", { status: 500 })),
      ),
    );

    renderApp();

    expect(await screen.findByText("Unable to load sessions.")).toBeInTheDocument();
    expect(screen.queryByText("No sessions found.")).not.toBeInTheDocument();
  });

  it("shows a single loading message while sessions load", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    renderApp();

    expect(screen.getByText("Loading sessions...")).toBeInTheDocument();
    expect(screen.queryByText("No sessions found.")).not.toBeInTheDocument();
  });

  it("shows a global empty message when no scripts are found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify([]), { status: 200 })),
      ),
    );

    renderApp();

    expect(await screen.findByText("No sessions found.")).toBeInTheDocument();
  });

  it("shows a right column message when the selected script has no recent sessions", async () => {
    renderApp();

    await screen.findAllByText("Agility");
    await userEvent.click(screen.getByText("Fishing"));

    expect(
      await screen.findByText("No recent sessions found for this script."),
    ).toBeInTheDocument();
  });

  it("opens a modal with all session data and closes it", async () => {
    renderApp();

    await screen.findAllByText("Agility");
    await userEvent.click(
      screen.getByRole("button", { name: "View session 1 details" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Session #1" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getAllByText("Agility")).toHaveLength(2);
    expect(within(dialog).getByText("Missing Requirements")).toBeInTheDocument();
    expect(within(dialog).getByText("Experience gained")).toBeInTheDocument();
    expect(within(dialog).getByText("1,500")).toBeInTheDocument();
    expect(within(dialog).getByText("Xp Gained Hr")).toBeInTheDocument();
    expect(within(dialog).getByText("45000")).toBeInTheDocument();
    expect(within(dialog).getByText("Levels Gained")).toBeInTheDocument();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Close session details" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the session modal with Escape", async () => {
    renderApp();

    await screen.findAllByText("Agility");
    await userEvent.click(
      screen.getByRole("button", { name: "View session 1 details" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("paginates loaded sessions 25 per page", async () => {
    renderApp();

    const summaries = screen.getByLabelText("Script summaries");
    await within(summaries).findByText("Cooking");
    await userEvent.click(within(summaries).getByText("Cooking"));

    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /View session \d+ details/ }),
    ).toHaveLength(25);

    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /View session \d+ details/ }),
    ).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "View session 125 details" }),
    ).toBeInTheDocument();
  });
});
