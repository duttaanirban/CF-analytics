(function () {
  "use strict";

  // Prevent duplicate listeners if the script is included twice.
  if (window.__causalTrackerLoaded) return;

  const script = document.currentScript;
  const endpoint =
  script?.dataset.endpoint ||
  window.CAUSAL_TRACKER_CONFIG?.endpoint;

  if (!endpoint) {
    console.warn("Analytics tracker: endpoint configuration is required.");
    return;
  }

  window.__causalTrackerLoaded = true;

  const storageKey = "causalfunnel_session_id";
  let sessionId;

  function createSessionId() {
    return crypto.randomUUID();
  }

  try {
    sessionId = localStorage.getItem(storageKey);

    if (!sessionId || sessionId.length > 128) {
      sessionId = createSessionId();
      localStorage.setItem(storageKey, sessionId);
    }
  } catch {
    // Tracking can still work when browser storage is unavailable.
    sessionId = createSessionId();
  }

  function getDimensions() {
    const root = document.documentElement;
    const body = document.body;

    return {
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      document_width: Math.max(
        root.scrollWidth,
        body?.scrollWidth || 0,
        window.innerWidth
      ),
      document_height: Math.max(
        root.scrollHeight,
        body?.scrollHeight || 0,
        window.innerHeight
      ),
    };
  }

  function sendEvent(eventType, extra = {}) {
    const event = {
      session_id: sessionId,
      event_type: eventType,
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      ...getDimensions(),
      ...extra,
    };

    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) {
          console.warn(
            `Analytics tracker: event rejected (${response.status}).`
          );
        }
      })
      .catch(() => {
        // Analytics failures should not interrupt the webpage.
        console.warn("Analytics tracker: unable to send event.");
      });
  }

  function startTracking() {
    sendEvent("page_view");

    document.addEventListener(
      "click",
      (event) => {
        sendEvent("click", {
          x: event.pageX,
          y: event.pageY,
        });
      },
      { capture: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startTracking, {
      once: true,
    });
  } else {
    startTracking();
  }
})();