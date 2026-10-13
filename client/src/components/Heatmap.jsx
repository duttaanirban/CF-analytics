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
        const data = await fetchHeatmap(selectedPage, controller.signal);
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
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Page click map</h2>
          <p className="mt-1 text-xs text-slate-500">Explore where visitors interact with a tracked page.</p>
        </div>

        <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">
          {clicksLoading && selectedPage ? "…" : visibleClicks.length} clicks
        </span>
      </div>

      <div className="p-6">
        <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-600" htmlFor="heatmap-page">
          Tracked page
        </label>

        <select
          id="heatmap-page"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
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
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {pagesError || visibleClicksError}
          </div>
        ) : pagesLoading || (selectedPage && clicksLoading) ? (
          <div className="py-12 text-center text-sm text-slate-500" role="status">Loading click map…</div>
        ) : !selectedPage ? (
          <div className="py-12 text-center text-sm text-slate-500">Open the demo to start recording page activity.</div>
        ) : visibleClicks.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No clicks recorded for this page yet.</div>
        ) : plottedClicks.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            These clicks do not have valid document dimensions. Record new interactions using the tracker.
          </div>
        ) : (
          <>
            <div className="mt-5 flex items-center justify-between gap-3 text-[11px] text-slate-500">
              <span>Top of page · 0%</span>
              <span>{plottedClicks.length} plotted clicks</span>
            </div>

            <div
              className="relative mt-3 h-[460px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #e5eaf2 1px, transparent 1px), linear-gradient(to bottom, #e5eaf2 1px, transparent 1px)",
                backgroundSize: "10% 10%",
              }}
              role="img"
              aria-label={`${plottedClicks.length} clicks plotted by relative document position`}
            >
              <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold tracking-[0.2em] text-slate-300">DOCUMENT POSITION GRID</span>

              {plottedClicks.map((click) => {
                const left = (click.x / click.document_width) * 100;
                const top = (click.y / click.document_height) * 100;

                return (
                  <span
                    key={click._id}
                    className="absolute h-3.5 w-3.5 rounded-full bg-red-500/60 shadow-[0_0_12px_5px_rgba(249,115,22,0.18)]"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      transform: "translate(-50%, -50%)",
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

            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
              <span>Bottom of page · 100%</span>
              <span>Width: 0% → 100%</span>
            </div>
          </>
        )}

        <p className="mt-5 text-sm leading-7 text-slate-500">
          Each dot is a recorded click. Coordinates are divided by the document dimensions captured with that event. This combines relative positions across screen sizes; it does not identify the same element across different layouts.
        </p>

        {excludedClicks > 0 && (
          <p className="mt-3 text-sm leading-7 text-slate-500">
            {excludedClicks} clicks excluded because dimensions or coordinates were missing or outside the document.
          </p>
        )}
      </div>
    </section>
  );
}
