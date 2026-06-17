"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-chalk flex flex-col items-center justify-center p-6 font-body">
      <div className="max-w-md w-full text-center bg-surface border border-border p-10 rounded-2xl">
        <div className="w-20 h-20 bg-ink rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">📸</span>
        </div>

        <h1 className="font-display text-4xl font-bold text-ink tracking-tight mb-3">
          ScanMe AI
        </h1>

        <p className="text-dim font-medium mb-8 leading-relaxed">
          Welcome to the Premium AI-Powered Photo Delivery Platform. Seamlessly sync Google Drive, extract face embeddings, and share memories.
        </p>

        <Link
          href="/auth"
          className="w-full inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold
                     text-chalk transition-all duration-200 bg-ink border border-transparent rounded-xl
                     hover:bg-ink/80 hover:-translate-y-0.5"
        >
          Enter Studio Dashboard →
        </Link>
      </div>
    </main>
  );
}