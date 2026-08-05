"use client";
import React, { useState } from "react";
import { MatchResult } from "@/types";
import { MatchStatus } from "@/hooks/useSelfieMatch";
import CameraCapture from "./CameraCapture";
import MatchedResults from "@/components/event/MatchedResults";
import Spinner from "@/components/ui/Spinner";
import SelfieUploader from "./SelfieUploader";
import { SavedFace } from "@/services/api";

interface Props {
  eventId: string;
  status: MatchStatus;
  statusLabel: string;
  results: MatchResult[];
  error: string | null;
  uploadPct: number;
  onRunMatch: (fileOrId: File | string) => void;
  onReset: () => void;
  savedFaces?: SavedFace[];
}

export default function SelfiePanel({
  status,
  statusLabel,
  results,
  error,
  uploadPct,
  onRunMatch,
  onReset,
  savedFaces = [],
}: Props) {
  const busy = ["validating", "resizing", "uploading", "matching"].includes(status);
  const [selectedFaceId, setSelectedFaceId] = useState("");

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
          {/* Saved Faces Selection */}
          {savedFaces.length > 0 && (
            <div className="space-y-2.5 p-4 bg-chalk/45 border border-border rounded-2xl">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-dim">
                Search using saved profile
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedFaceId}
                  onChange={(e) => setSelectedFaceId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-surface border border-border rounded-xl text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">-- Choose a face --</option>
                  {savedFaces.map((face) => (
                    <option key={face.id} value={face.id}>
                      {face.nickname}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (selectedFaceId) onRunMatch(selectedFaceId);
                  }}
                  disabled={!selectedFaceId}
                  className="px-4 py-2 bg-ink hover:bg-ink/80 text-chalk text-xs font-bold rounded-xl transition"
                >
                  Find
                </button>
              </div>
            </div>
          )}

          {savedFaces.length > 0 && (
            <div className="flex items-center gap-3">
              <hr className="flex-1 border-border" />
              <span className="text-[10px] text-dim font-bold uppercase tracking-wider">or new photo</span>
              <hr className="flex-1 border-border" />
            </div>
          )}

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
            🔒 Processed in memory securely.
          </p>
        </>
      )}
    </div>
  );
}