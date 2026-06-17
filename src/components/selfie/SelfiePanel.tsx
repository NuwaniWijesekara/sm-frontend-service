"use client";
import React from "react";
import { MatchResult } from "@/types";
import { MatchStatus } from "@/hooks/useSelfieMatch";
import CameraCapture from "./CameraCapture";
import MatchedResults from "@/components/event/MatchedResults";
import Spinner from "@/components/ui/Spinner";
import SelfieUploader from "./SelfieUploader";

interface Props {
  eventId: string;
  status: MatchStatus;
  statusLabel: string;
  results: MatchResult[];
  error: string | null;
  uploadPct: number;
  onRunMatch: (file: File) => void;
  onReset: () => void;
}

export default function SelfiePanel({
  status,
  statusLabel,
  results,
  error,
  uploadPct,
  onRunMatch,
  onReset,
}: Props) {
  const busy = ["validating", "resizing", "uploading", "matching"].includes(status);

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-5">

      {/* Header — always visible */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-1">
          Find Yourself
        </p>
        <h2 className="font-display text-xl font-bold text-ink leading-tight">
          Your photos, instantly
        </h2>
        <p className="text-dim text-xs mt-1 leading-relaxed">
          Take or upload a selfie — we surface every photo you appear in.
          Your selfie is never stored.
        </p>
      </div>

      {/* ── Processing ── */}
      {busy ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <Spinner size="lg" />
          <p className="text-sm text-dim text-center">{statusLabel}</p>
          {status === "uploading" && uploadPct > 0 && (
            <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-200 rounded-full"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          )}
        </div>

      ) : status === "done" ? (
        /* ── Results ── */
        <MatchedResults results={results} onReset={onReset} />

      ) : (
        /* ── Idle / error ── */
        <>
          <CameraCapture onCapture={onRunMatch} disabled={busy} />

          <div className="flex items-center gap-3">
            <hr className="flex-1 border-border" />
            <span className="text-xs text-dim font-medium">or</span>
            <hr className="flex-1 border-border" />
          </div>

          <SelfieUploader onSelect={onRunMatch} disabled={busy} />

          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
              <p className="text-danger text-xs leading-snug">{error}</p>
            </div>
          )}

          <p className="text-[10px] text-dim text-center leading-relaxed">
            🔒 Processed in memory only — immediately discarded after matching.
          </p>
        </>
      )}
    </div>
  );
}