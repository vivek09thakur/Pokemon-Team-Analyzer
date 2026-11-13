"use client";

import { useEffect } from "react";
import { Icon } from "@/common/components/Icon";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main role="alert" className="min-h-dvh flex flex-col items-center justify-center gap-3 p-6 text-center">
      <Icon name="error" size={40} className="text-error" />
      <h2 className="title-lg">Something went wrong</h2>
      <p className="body-md max-w-md">The team analyzer hit an unexpected error. Try again, or reload the page.</p>
      <div className="flex gap-2">
        <button className="md-btn md-btn-filled" onClick={() => retry()}>
          <Icon name="refresh" />
          <span>Try again</span>
        </button>
        <button className="md-btn md-btn-outlined" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    </main>
  );
}
