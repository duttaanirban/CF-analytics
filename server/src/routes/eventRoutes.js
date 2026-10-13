import { Router } from "express";
import {
  createEvent,
  getSessions,
  getSessionEvents,
  getHeatmap,
  getPages,
} from "../controllers/eventController.js";

const router = Router();

// Pass rejected promises to Express error handling.
const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.post("/events", asyncHandler(createEvent));
router.get("/sessions", asyncHandler(getSessions));
router.get("/sessions/:sessionId/events", asyncHandler(getSessionEvents));
router.get("/heatmap", asyncHandler(getHeatmap));
router.get("/pages", asyncHandler(getPages));

export default router;