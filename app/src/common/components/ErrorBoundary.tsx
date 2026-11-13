"use client";

import { catchError, type ErrorInfo } from "next/error";
import { Icon } from "./Icon";

function SectionError({ title }: { title: string }, { error, retry }: ErrorInfo) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div role="alert" className="md-card-filled p-4 flex flex-col items-center gap-2 text-center">
      <Icon name="error" className="text-error" />
      <p className="title-sm">{title}</p>
      <p className="body-sm max-w-full break-words">{message}</p>
      <button className="md-btn md-btn-tonal !h-9" onClick={() => retry()}>
        <Icon name="refresh" />
        <span>Try again</span>
      </button>
    </div>
  );
}

export const ErrorBoundary = catchError(SectionError);
