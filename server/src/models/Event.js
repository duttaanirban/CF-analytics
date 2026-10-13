import mongoose from "mongoose";

const positiveNumber = {
  type: Number,
  min: 1,
};

const eventSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },

    event_type: {
      type: String,
      required: true,
      enum: ["page_view", "click"],
    },

    page_url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },

    timestamp: {
      type: Date,
      required: true,
    },

    x: {
      type: Number,
      min: 0,
      required: function () {
        return this.event_type === "click";
      },
    },

    y: {
      type: Number,
      min: 0,
      required: function () {
        return this.event_type === "click";
      },
    },

    viewport_width: positiveNumber,
    viewport_height: positiveNumber,
    document_width: positiveNumber,
    document_height: positiveNumber,
  },
  {
    timestamps: {
      createdAt: "received_at",
      updatedAt: false,
    },
    versionKey: false,
  }
);

// Supports fetching a session's events in chronological order.
eventSchema.index({ session_id: 1, timestamp: 1 });

// Supports retrieving clicks for a selected page.
eventSchema.index({ page_url: 1, event_type: 1, timestamp: 1 });

const Event = mongoose.model("Event", eventSchema);

export default Event;