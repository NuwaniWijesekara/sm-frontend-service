"use client";
import { useState, useCallback } from "react";
import { validateImageFile, resizeToBlob } from "@/utils/imageUtils";
import { matchSelfie, fetchGuestHistory } from "@/services/api";
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

// API errors carry `detail` as a string, or as {code, message} for
// access-control denials (sm-guest-service utils/access.py).
const errorMessage = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail.message === "string") return detail.message;
  return fallback;
};

// Selfie search always needs an account (sm-guest-service match.py uses
// get_current_user), even in public galleries: a missing, expired or
// leftover anonymous token comes back as 401 (or FastAPI's 403 "Not
// authenticated" when no token was sent at all).
const isAuthError = (err: any): boolean => {
  const res = err?.response;
  return res?.status === 401 || (res?.status === 403 && res?.data?.detail === "Not authenticated");
};

export const useSelfieMatch = (eventId: string) => {
  const [status,    setStatus]    = useState<MatchStatus>("idle");
  const [results,   setResults]   = useState<MatchResult[]>([]);
  const [error,     setError]     = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  // Set when the server rejected the search for lack of a valid session, so
  // the page can prompt for sign-in instead of only showing an error.
  const [authRequired, setAuthRequired] = useState(false);

  const runMatch = useCallback(
    async (fileOrId: File | string) => {
      if (BUSY.includes(status)) return; // prevent double-submit

      setError(null);
      setResults([]);
      setUploadPct(0);
      setAuthRequired(false);

      if (typeof fileOrId === "string") {
        setStatus("matching");
        try {
          const matches = await matchSelfie(eventId, undefined, fileOrId, setUploadPct);
          setResults(matches);
          setStatus("done");
        } catch (err: any) {
          setAuthRequired(isAuthError(err));
          setError(errorMessage(err, "Matching failed. Please try again."));
          setStatus("error");
        }
      } else {
        // 1. Validate
        setStatus("validating");
        const validErr = validateImageFile(fileOrId);
        if (validErr) {
          setError(validErr);
          setStatus("error");
          return;
        }

        // 2. Resize in browser memory — never touches disk
        setStatus("resizing");
        let blob: Blob;
        try {
          blob = await resizeToBlob(fileOrId);
        } catch {
          setError("Could not process your image. Please try another photo.");
          setStatus("error");
          return;
        }

        // 3. Upload + match
        setStatus("uploading");
        try {
          setStatus("matching");
          const matches = await matchSelfie(eventId, blob, undefined, setUploadPct);
          setResults(matches);
          setStatus("done");
        } catch (err: any) {
          setAuthRequired(isAuthError(err));
          setError(errorMessage(err, "Matching failed. Try a well-lit, clear selfie facing the camera."));
          setStatus("error");
        }
      }
      // blob falls out of scope here → GC collects it. Nothing persisted.
    },
    [eventId, status]
  );

  const loadHistoryMatch = useCallback(
    async (searchId: string) => {
      setStatus("matching");
      setError(null);
      setResults([]);
      try {
        const history = await fetchGuestHistory();
        const matchRecord = history.find((h) => h.id === searchId);
        if (matchRecord && matchRecord.photos) {
          const matches: MatchResult[] = matchRecord.photos.map((p) => ({
            photo_id: p.id,
            display_url: p.display_url,
            thumbnail_url: p.thumbnail_url || p.display_url,
            similarity_score: 100,
          }));
          setResults(matches);
          setStatus("done");
        } else {
          setStatus("idle");
        }
      } catch (err: any) {
        console.error("Failed to load search history:", err);
        setError("Could not load previous search results.");
        setStatus("error");
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResults([]);
    setError(null);
    setUploadPct(0);
    setAuthRequired(false);
  }, []);

  return {
    status,
    statusLabel: STATUS_LABELS[status],
    results,
    error,
    uploadPct,
    authRequired,
    runMatch,
    loadHistoryMatch,
    reset,
  };
};