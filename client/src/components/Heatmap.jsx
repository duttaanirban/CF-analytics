import { useEffect, useState } from "react";
import { fetchPages, fetchHeatmap } from "../lib/api";

export default function Heatmap({ refreshKey }) {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [clicks, setClicks] = useState([]);

  const [pagesLoading, setPagesLoading] = useState(true);
  const [clicksLoading, setClicksLoading] = useState(false);

  const [pagesError, setPagesError] = useState("");
  const [clicksError, setClicksError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPages() {
      setPagesLoading(true);
      setPagesError("");

      try {
        const data = await fetchPages(controller.signal);

        setPages(data.pages);

        setSelectedPage((current) =>
          data.pages.some((page) => page.page_url === current)
            ? current
            : data.pages[0]?.page_url || ""
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          setPagesError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setPagesLoading(false);
        }
      }
    }

    loadPages();

    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    if (!selectedPage) {
      return;
    }

    const controller = new AbortController();

    async function loadClicks() {
      setClicksLoading(true);
      setClicksError("");
      setClicks([]);

      try {
        const data = await fetchHeatmap(
          selectedPage,
          controller.signal
        );

        setClicks(data.clicks);
      } catch (error) {
        if (error.name !== "AbortError") {
          setClicksError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setClicksLoading(false);
        }
      }
    }

    loadClicks();

    return () => controller.abort();
  }, [selectedPage, refreshKey]);

  const visibleClicks = selectedPage ? clicks : [];
  const visibleClicksError = selectedPage ? clicksError : "";

  const plottedClicks = visibleClicks.filter(
    (click) =>
      Number.isFinite(click.x) &&
      Number.isFinite(click.y) &&
      click.document_width > 0 &&
      click.document_height > 0 &&
      click.x >= 0 &&
      click.y >= 0 &&
      click.x <= click.document_width &&
      click.y <= click.document_height
  );

  const excludedClicks = visibleClicks.length - plottedClicks.length;

  return (
    <section className="panel heatmap-panel">
      <div className="panel-heading">
        <div>
          <h2>Page click map</h2>
          <p className="muted">
            Explore where visitors interact with a tracked page.
          </p>
        </div>

        <span className="count-badge">
          {clicksLoading && selectedPage ? "…" : visibleClicks.length} clicks
        </span>
      </div>

      <div className="heatmap-body">
        <label className="field-label" htmlFor="heatmap-page">
          Tracked page
        </label>

        <select
          id="heatmap-page"
          className="page-select"
          value={selectedPage}
          onChange={(event) => setSelectedPage(event.target.value)}
          disabled={pagesLoading || pages.length === 0}
        >
          {pages.length === 0 && (
            <option value="">
              {pagesLoading ? "Loading pages…" : "No tracked pages"}
            </option>
          )}

          {pages.map((page) => (
            <option key={page.page_url} value={page.page_url}>
              {page.page_url} · {page.clicks} clicks
            </option>
          ))}
        </select>

        {pagesError || visibleClicksError ? (
          <div className="error-message" role="alert">
            {pagesError || visibleClicksError}
          </div>
        ) : pagesLoading || (selectedPage && clicksLoading) ? (
          <div className="empty-state" role="status">
            Loading click map…
          </div>
        ) : !selectedPage ? (
          <div className="empty-state">
            Open the demo to start recording page activity.
          </div>
        ) : visibleClicks.length === 0 ? (
          <div className="empty-state">
            No clicks recorded for this page yet.
          </div>
        ) : plottedClicks.length === 0 ? (
          <div className="empty-state">
            These clicks do not have valid document dimensions.
            Record new interactions using the tracker.
          </div>
        ) : (
          <>
            <div className="map-caption">
              <span>Top of page · 0%</span>
              <span>{plottedClicks.length} plotted clicks</span>
            </div>

            <div
              className="click-map"
              role="img"
              aria-label={`${plottedClicks.length} clicks plotted by relative document position`}
            >
              <span className="map-watermark">
                DOCUMENT POSITION GRID
              </span>

              {plottedClicks.map((click) => {
                const left =
                  (click.x / click.document_width) * 100;
                const top =
                  (click.y / click.document_height) * 100;

                return (
                  <span
                    key={click._id}
                    className="click-dot"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                    }}
                    title={[
                      `Position: (${Math.round(click.x)}, ${Math.round(click.y)})`,
                      `Document: ${click.document_width} × ${click.document_height}`,
                      `Session: ${click.session_id}`,
                      new Date(click.timestamp).toLocaleString(),
                    ].join("\n")}
                  />
                );
              })}
            </div>

            <div className="map-caption">
              <span>Bottom of page · 100%</span>
              <span>Width: 0% → 100%</span>
            </div>
          </>
        )}

        <p className="heatmap-note">
          Each dot is a recorded click. Coordinates are divided by the
          document dimensions captured with that event. This combines
          relative positions across screen sizes; it does not identify
          the same element across different layouts.
        </p>

        {excludedClicks > 0 && (
          <p className="heatmap-note">
            {excludedClicks} clicks excluded because dimensions or
            coordinates were missing or outside the document.
          </p>
        )}
      </div>
    </section>
  );
}