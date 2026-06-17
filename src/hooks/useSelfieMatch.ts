"use client";
import { useState, useCallback } from "react";
import { validateImageFile, resizeToBlob } from "@/utils/imageUtils";
import { matchSelfie } from "@/services/api";
import { MatchResult } from "@/types";

export type MatchStatus =
  | "idle"
  | "validating"
  | "resizing"
  | "uploading"
  | "matching"
  | "done"
  | "error";

const STATUS_LABELS: Record<MatchStatus, string> = {
  idle:       "",
  validating: "Checking your photo…",
  resizing:   "Preparing image…",
  uploading:  "Sending to server…",
  matching:   "Searching through event photos…",
  done:       "",
  error:      "",
};

const BUSY: MatchStatus[] = ["validating", "resizing", "uploading", "matching"];

export const useSelfieMatch = (eventId: string) => {
  const [status,    setStatus]    = useState<MatchStatus>("idle");
  const [results,   setResults]   = useState<MatchResult[]>([]);
  const [error,     setError]     = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);

  const runMatch = useCallback(
    async (file: File) => {
      if (BUSY.includes(status)) return; // prevent double-submit

      setError(null);
      setResults([]);
      setUploadPct(0);

      // 1. Validate
      setStatus("validating");
      const validErr = validateImageFile(file);
      if (validErr) {
        setError(validErr);
        setStatus("error");
        return;
      }

      // 2. Resize in browser memory — never touches disk
      setStatus("resizing");
      let blob: Blob;
      try {
        blob = await resizeToBlob(file);
      } catch {
        setError("Could not process your image. Please try another photo.");
        setStatus("error");
        return;
      }

      // 3. Upload + match
      setStatus("uploading");
      try {
        setStatus("matching");
        const matches = await matchSelfie(eventId, blob, setUploadPct);
        setResults(matches);
        setStatus("done");
      } catch {
        setError("Matching failed. Try a well-lit, clear selfie facing the camera.");
        setStatus("error");
      }
      // blob falls out of scope here → GC collects it. Nothing persisted.
    },
    [eventId, status]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResults([]);
    setError(null);
    setUploadPct(0);
  }, []);

  return {
    status,
    statusLabel: STATUS_LABELS[status],
    results,
    error,
    uploadPct,
    runMatch,
    reset,
  };
};