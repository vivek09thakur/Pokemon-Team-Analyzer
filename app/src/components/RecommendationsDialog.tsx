"use client";

import type { Recommendation, Tone } from "@/lib/analysis";
import Dialog from "./Dialog";
import { Icon } from "./ui";

const TONE: Record<Tone, string> = {
  error: "text-error",
  warning: "text-warning",
  success: "text-success",
  neutral: "text-primary",
};

export default function RecommendationsDialog({
  open,
  onClose,
  recommendations,
}: {
  open: boolean;
  onClose: () => void;
  recommendations: Recommendation[];
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="max-w-lg"
      title={
        <span className="flex items-center gap-2">
          <Icon name="lightbulb" className="text-primary" />
          Recommendations
        </span>
      }
      bodyClassName="overflow-y-auto overscroll-contain px-6 pb-5"
    >
      <ul className="divide-y divide-outline-variant">
        {recommendations.map((rec, i) => (
          <li key={i} className="flex items-start gap-3 py-3">
            <Icon name={rec.icon} className={TONE[rec.tone]} style={{ marginTop: 2 }} />
            <div className="min-w-0">
              <div className="title-sm">{rec.title}</div>
              <div className="body-md">{rec.body}</div>
            </div>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
