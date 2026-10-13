import Event from "../models/Event.js";
import { eventValidator } from "../validators/eventValidator.js";

export async function createEvent(req, res) {
  const result = eventValidator.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid event data",
      details: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const event = await Event.create(result.data);

  return res.status(201).json({
    message: "Event recorded",
    event_id: event._id,
  });
}

export async function getSessions(req, res) {
  const sessions = await Event.aggregate([
    {
      $group: {
        _id: "$session_id",
        total_events: { $sum: 1 },
        page_views: {
          $sum: {
            $cond: [{ $eq: ["$event_type", "page_view"] }, 1, 0],
          },
        },
        clicks: {
          $sum: {
            $cond: [{ $eq: ["$event_type", "click"] }, 1, 0],
          },
        },
        started_at: { $min: "$timestamp" },
        last_activity: { $max: "$timestamp" },
      },
    },
    { $sort: { last_activity: -1, _id: 1 } },
    {
      $project: {
        _id: 0,
        session_id: "$_id",
        total_events: 1,
        page_views: 1,
        clicks: 1,
        started_at: 1,
        last_activity: 1,
      },
    },
  ]);

  return res.json({
    total_sessions: sessions.length,
    sessions,
  });
}

export async function getSessionEvents(req, res) {
  const { sessionId } = req.params;

  if (!sessionId.trim() || sessionId.length > 128) {
    return res.status(400).json({
      error: "Invalid session ID",
    });
  }

  const events = await Event.find({ session_id: sessionId })
    .sort({ timestamp: 1, _id: 1 })
    .lean();

  if (events.length === 0) {
    return res.status(404).json({
      error: "Session not found",
    });
  }

  return res.json({
    session_id: sessionId,
    total_events: events.length,
    events,
  });
}

export async function getHeatmap(req, res) {
  const pageUrl = req.query.pageUrl;

  if (typeof pageUrl !== "string" || pageUrl.length > 2048) {
    return res.status(400).json({
      error: "A valid pageUrl query parameter is required",
    });
  }

  try {
    const url = new URL(pageUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Unsupported protocol");
    }
  } catch {
    return res.status(400).json({
      error: "pageUrl must be a valid HTTP or HTTPS URL",
    });
  }

  const clicks = await Event.find({
    page_url: pageUrl,
    event_type: "click",
  })
    .select(
      "session_id timestamp x y viewport_width viewport_height document_width document_height"
    )
    .sort({ timestamp: 1, _id: 1 })
    .lean();

  return res.json({
    page_url: pageUrl,
    total_clicks: clicks.length,
    clicks,
  });
}

export async function getPages(req, res) {
  const pages = await Event.aggregate([
    {
      $group: {
        _id: "$page_url",
        total_events: { $sum: 1 },
        clicks: {
          $sum: {
            $cond: [{ $eq: ["$event_type", "click"] }, 1, 0],
          },
        },
      },
    },
    { $sort: { clicks: -1, _id: 1 } },
    {
      $project: {
        _id: 0,
        page_url: "$_id",
        total_events: 1,
        clicks: 1,
      },
    },
  ]);

  return res.json({ pages });
}