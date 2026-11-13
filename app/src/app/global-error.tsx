"use client";

import "./globals.css";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="bg-surface text-on-surface-variant">
        <title>Something went wrong · Pokémon Team Analyzer</title>
        <main role="alert" className="min-h-dvh flex flex-col items-center justify-center gap-3 p-6 text-center">
          <h2 className="title-lg">Something went wrong</h2>
          <p className="body-md max-w-md">The app failed to load. Try again, or reload the page.</p>
          <div className="flex gap-2">
            <button className="md-btn md-btn-filled" onClick={() => retry()}>
              Try again
            </button>
            <button className="md-btn md-btn-outlined" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
