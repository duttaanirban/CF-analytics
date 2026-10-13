import { useEffect, useState } from "react";
import { fetchSessions, fetchSessionEvents } from "./lib/api";
import Heatmap from "./components/Heatmap";

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function shortSessionId(value) {
  return value.length > 18 ? `${value.slice(0, 18)}…` : value;
}

function StatCard({ label, value, description }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <strong className="mt-3 mb-2 block text-3xl font-semibold tracking-tight text-slate-900">{value}</strong>
      <p className="text-sm text-slate-500">{description}</p>
    </article>
  );
}

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [events, setEvents] = useState([]);

  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [sessionsError, setSessionsError] = useState("");
  const [eventsError, setEventsError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSessions() {
      setSessionsLoading(true);
      setSessionsError("");

      try {
        const data = await fetchSessions(controller.signal);

        setSessions(data.sessions);

        setSelectedSession((current) => {
          const stillExists = data.sessions.some(
            (session) => session.session_id === current
          );

          return stillExists
            ? current
            : data.sessions[0]?.session_id || null;
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setSessionsError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSessionsLoading(false);
        }
      }
    }

    loadSessions();

    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    const controller = new AbortController();

    async function loadEvents() {
      setEventsLoading(true);
      setEventsError("");
      setEvents([]);

      try {
        const data = await fetchSessionEvents(selectedSession, controller.signal);
        setEvents(data.events);
      } catch (error) {
        if (error.name !== "AbortError") {
          setEventsError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setEventsLoading(false);
        }
      }
    }

    loadEvents();

    return () => controller.abort();
  }, [selectedSession, refreshKey]);

  const visibleEvents = selectedSession ? events : [];
  const visibleEventsLoading = selectedSession && eventsLoading;
  const visibleEventsError = selectedSession ? eventsError : "";

  const totals = sessions.reduce(
    (result, session) => ({
      events: result.events + session.total_events,
      pageViews: result.pageViews + session.page_views,
      clicks: result.clicks + session.clicks,
    }),
    { events: 0, pageViews: 0, clicks: 0 }
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1328px] items-center justify-between gap-5 px-6 py-4 md:px-8">
          <a className="flex items-center gap-3 text-xl font-extrabold no-underline" href="/">
            {/* <span className="grid h-11 w-11 place-items-center rounded-lg bg-indigo-600 text-white" aria-hidden="true">
              C
            </span> */}
            <span>
              CausalLens
              {/* <small className="mt-1 block text-[11px] font-medium text-slate-500">User behaviour analytics</small> */}
            </span>
          </a>

          <div className="flex gap-3">
            <a
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href="/demo.html"
              target="_blank"
              rel="noreferrer"
            >
              Open demo ↗
            </a>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={sessionsLoading}
            >
              {sessionsLoading ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1328px] px-6 py-9 md:px-8">
        <section className="mb-7">
          <p className="text-xs font-bold tracking-[1.8px] text-indigo-600">ANALYTICS OVERVIEW</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-900 md:text-4xl">Understand every interaction.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Explore visitor sessions and follow their journey through your website.
          </p>
        </section>

        {sessionsError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {sessionsError}. Check the backend and try refreshing.
          </div>
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Analytics totals">
          <StatCard label="Total sessions" value={sessionsLoading ? "…" : sessions.length} description="Persistent visitor identifiers" />
          <StatCard label="Total events" value={sessionsLoading ? "…" : totals.events} description="All recorded interactions" />
          <StatCard label="Page views" value={sessionsLoading ? "…" : totals.pageViews} description="Recorded page loads" />
          <StatCard label="Clicks" value={sessionsLoading ? "…" : totals.clicks} description="Interactions across tracked pages" />
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Visitor sessions</h2>
                <p className="mt-1 text-xs text-slate-500">Most recent activity first</p>
              </div>
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">{sessions.length}</span>
            </div>

            {sessionsLoading ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500" role="status">Loading sessions…</div>
            ) : sessions.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                <h3 className="mb-2 text-base font-semibold text-slate-800">No sessions yet</h3>
                <p>Open the demo and interact with the page, then refresh.</p>
              </div>
            ) : (
              <div className="max-h-[620px] overflow-y-auto p-3">
                {sessions.map((session) => (
                  <button
                    type="button"
                    key={session.session_id}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedSession === session.session_id
                        ? "border-indigo-200 bg-indigo-50"
                        : "border-transparent bg-white hover:bg-slate-50"
                    }`}
                    onClick={() => setSelectedSession(session.session_id)}
                    aria-pressed={selectedSession === session.session_id}
                    title={session.session_id}
                  >
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <strong className="font-semibold text-slate-900">{shortSessionId(session.session_id)}</strong>
                      <span className="whitespace-nowrap text-[11px] font-medium text-indigo-600">{session.total_events} events</span>
                    </div>

                    <p className="mt-2 text-[11px] text-slate-500">{formatDate(session.last_activity)}</p>

                    <div className="mt-2 flex gap-4 text-[11px] text-slate-600">
                      <span>{session.page_views} page views</span>
                      <span>{session.clicks} clicks</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-busy={eventsLoading}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Session journey</h2>
                <p className="mt-1 text-xs text-slate-500">Events ordered from first to last</p>
              </div>
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">{visibleEvents.length}</span>
            </div>

            {selectedSession && (
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <span className="mb-2 block text-[10px] font-semibold tracking-[0.15em] text-slate-500">SESSION ID</span>
                <code className="break-all text-xs text-slate-700">{selectedSession}</code>
              </div>
            )}

            {visibleEventsError ? (
              <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{visibleEventsError}</div>
            ) : visibleEventsLoading ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500" role="status">Loading journey…</div>
            ) : !selectedSession ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">Select a session to view its journey.</div>
            ) : (
              <ol className="max-h-[620px] list-none overflow-y-auto p-6">
                {visibleEvents.map((event, index) => (
                  <li key={event._id} className="flex gap-4 pb-6 last:pb-0">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">{index + 1}</span>

                    <div className="min-w-0 flex-1 border-b border-slate-200 pb-5 last:border-b-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${event.event_type === "page_view" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {event.event_type === "page_view" ? "Page view" : "Click"}
                        </span>

                        <time className="text-[11px] text-slate-500" dateTime={event.timestamp}>{formatDate(event.timestamp)}</time>
                      </div>

                      <p className="my-3 overflow-wrap-anywhere text-xs leading-6 text-slate-700">{event.page_url}</p>

                      {event.event_type === "click" && (
                        <p className="m-0 text-[11px] text-slate-500">Position: x {Math.round(event.x)}, y {Math.round(event.y)}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <Heatmap refreshKey={refreshKey} />

        <footer className="mt-7 text-center text-[11px] text-slate-400">
          CausalLens · CausalFunnel Full Stack Assignment
        </footer>
      </main>
    </div>
  );
}
