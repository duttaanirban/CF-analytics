import { z } from "zod";

const dimension = z.number().finite().positive().max(100000).optional();

export const eventValidator = z
  .object({
    session_id: z.string().trim().min(1).max(128),

    event_type: z.enum(["page_view", "click"]),

    page_url: z.string().url().max(2048).refine(
      (value) => ["http:", "https:"].includes(new URL(value).protocol),
      "Page URL must use HTTP or HTTPS"
    ),

    timestamp: z.string().datetime({ offset: true }),

    x: z.number().finite().min(0).optional(),
    y: z.number().finite().min(0).optional(),

    viewport_width: dimension,
    viewport_height: dimension,
    document_width: dimension,
    document_height: dimension,
  })
  .superRefine((event, context) => {
    if (event.event_type === "click") {
      for (const coordinate of ["x", "y"]) {
        if (event[coordinate] === undefined) {
          context.addIssue({
            code: "custom",
            path: [coordinate],
            message: `${coordinate} is required for click events`,
          });
        }
      }
    }
  });