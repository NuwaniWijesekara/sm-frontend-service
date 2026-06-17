import React from "react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-chalk px-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔗</div>
        <h1 className="font-display text-2xl font-bold text-ink mb-2">
          Page not found
        </h1>
        <p className="text-dim text-sm leading-relaxed">
          This link does not exist or has expired. Check the QR code you
          received from your photographer.
        </p>
      </div>
    </main>
  );
}