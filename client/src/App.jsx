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
    <article className="stat-card">
      <p className="stat-label">{label}</p>
      <strong className="stat-value">{value}</strong>
      <p className="muted">{description}</p>
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
        const data = await fetchSessionEvents(
          selectedSession,
          controller.signal
        );

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
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            C
          </span>
          <span>
            CausalLens
            <small>User behaviour analytics</small>
          </span>
        </a>

        <div className="header-actions">
          <a
            className="button secondary"
            href="/demo.html"
            target="_blank"
            rel="noreferrer"
          >
            Open demo ↗
          </a>

          <button
            className="button primary"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={sessionsLoading}
          >
            {sessionsLoading ? "Refreshing…" : "Refresh data"}
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="page-heading">
          <p className="eyebrow">ANALYTICS OVERVIEW</p>
          <h1>Understand every interaction.</h1>
          <p className="muted">
            Explore visitor sessions and follow their journey through your
            website.
          </p>
        </section>

        {sessionsError && (
          <div className="error-message" role="alert">
            {sessionsError}. Check the backend and try refreshing.
          </div>
        )}

        <section className="stats-grid" aria-label="Analytics totals">
          <StatCard
            label="Total sessions"
            value={sessionsLoading ? "…" : sessions.length}
            description="Persistent visitor identifiers"
          />
          <StatCard
            label="Total events"
            value={sessionsLoading ? "…" : totals.events}
            description="All recorded interactions"
          />
          <StatCard
            label="Page views"
            value={sessionsLoading ? "…" : totals.pageViews}
            description="Recorded page loads"
          />
          <StatCard
            label="Clicks"
            value={sessionsLoading ? "…" : totals.clicks}
            description="Interactions across tracked pages"
          />
        </section>

        <div className="workspace-grid">
          <section className="panel sessions-panel">
            <div className="panel-heading">
              <div>
                <h2>Visitor sessions</h2>
                <p className="muted">Most recent activity first</p>
              </div>
              <span className="count-badge">{sessions.length}</span>
            </div>

            {sessionsLoading ? (
              <div className="empty-state" role="status">
                Loading sessions…
              </div>
            ) : sessions.length === 0 ? (
              <div className="empty-state">
                <h3>No sessions yet</h3>
                <p>Open the demo and interact with the page, then refresh.</p>
              </div>
            ) : (
              <div className="session-list">
                {sessions.map((session) => (
                  <button
                    key={session.session_id}
                    className={`session-item ${
                      selectedSession === session.session_id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => setSelectedSession(session.session_id)}
                    aria-pressed={selectedSession === session.session_id}
                    title={session.session_id}
                  >
                    <div className="session-item-top">
                      <strong>
                        {shortSessionId(session.session_id)}
                      </strong>
                      <span className="event-count">
                        {session.total_events} events
                      </span>
                    </div>

                    <p className="session-time">
                      {formatDate(session.last_activity)}
                    </p>

                    <div className="session-metrics">
                      <span>{session.page_views} page views</span>
                      <span>{session.clicks} clicks</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section
            className="panel journey-panel"
            aria-busy={eventsLoading}
          >
            <div className="panel-heading">
              <div>
                <h2>Session journey</h2>
                <p className="muted">
                  Events ordered from first to last
                </p>
              </div>
              <span className="count-badge">{visibleEvents.length}</span>
            </div>

            {selectedSession && (
              <div className="session-identifier">
                <span>SESSION ID</span>
                <code>{selectedSession}</code>
              </div>
            )}

            {visibleEventsError ? (
              <div className="error-message" role="alert">
                {visibleEventsError}
              </div>
            ) : visibleEventsLoading ? (
              <div className="empty-state" role="status">
                Loading journey…
              </div>
            ) : !selectedSession ? (
              <div className="empty-state">
                Select a session to view its journey.
              </div>
            ) : (
              <ol className="timeline">
                {visibleEvents.map((event, index) => (
                  <li key={event._id} className="timeline-item">
                    <span className="timeline-number">{index + 1}</span>

                    <div className="timeline-content">
                      <div className="event-heading">
                        <span
                          className={`event-badge ${event.event_type}`}
                        >
                          {event.event_type === "page_view"
                            ? "Page view"
                            : "Click"}
                        </span>

                        <time dateTime={event.timestamp}>
                          {formatDate(event.timestamp)}
                        </time>
                      </div>

                      <p className="event-url">{event.page_url}</p>

                      {event.event_type === "click" && (
                        <p className="coordinate-label">
                          Position: x {Math.round(event.x)}, y{" "}
                          {Math.round(event.y)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
        <Heatmap refreshKey={refreshKey} />
        <footer className="dashboard-footer">
          CausalLens · CausalFunnel Full Stack Assignment
        </footer>
      </main>
    </div>
  );
}