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

export const useSelfieMatch = (eventId: string) => {
  const [status,             setStatus]             = useState<MatchStatus>("idle");
  const [results,            setResults]             = useState<MatchResult[]>([]);
  const [error,              setError]               = useState<string | null>(null);
  const [uploadPct,          setUploadPct]           = useState(0);
  const [needsReferenceFace, setNeedsReferenceFace]  = useState(false);

  const runMatch = useCallback(
    async (fileOrId: File | string) => {
      if (BUSY.includes(status)) return; // prevent double-submit

      setError(null);
      setNeedsReferenceFace(false);
      setResults([]);
      setUploadPct(0);

      if (typeof fileOrId === "string") {
        setStatus("matching");
        try {
          const matches = await matchSelfie(eventId, undefined, fileOrId, setUploadPct);
          setResults(matches);
          setStatus("done");
        } catch (err: any) {
          setError(err.response?.data?.detail || "Matching failed. Please try again.");
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
          setError(err.response?.data?.detail || "Matching failed. Try a well-lit, clear selfie facing the camera.");
          setStatus("error");
        }
      }
      // blob falls out of scope here → GC collects it. Nothing persisted.
    },
    [eventId, status]
  );

  // Privacy-First AI Face Matching: search using the account's saved
  // reference face instead of uploading a fresh selfie. Requires the
  // caller be an owner/collaborator on this event (enforced server-side);
  // the 400 case below means they haven't saved a reference face yet.
  const runReferenceMatch = useCallback(async () => {
    if (BUSY.includes(status)) return;

    setError(null);
    setNeedsReferenceFace(false);
    setResults([]);
    setUploadPct(0);
    setStatus("matching");
    try {
      const matches = await matchSelfie(eventId, undefined, undefined, setUploadPct);
      setResults(matches);
      setStatus("done");
    } catch (err: any) {
      if (err.response?.status === 400) {
        setNeedsReferenceFace(true);
        setError(err.response?.data?.detail || "Please upload a reference face to your profile first.");
      } else if (err.response?.status === 403) {
        setError(err.response?.data?.detail || "You don't have access to search this event.");
      } else {
        setError(err.response?.data?.detail || "Matching failed. Please try again.");
      }
      setStatus("error");
    }
  }, [eventId, status]);

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
            s3_url: p.s3_url,
            thumbnail_url: p.thumbnail_url || p.s3_url,
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
    setNeedsReferenceFace(false);
    setUploadPct(0);
  }, []);

  return {
    status,
    statusLabel: STATUS_LABELS[status],
    results,
    error,
    needsReferenceFace,
    uploadPct,
    runMatch,
    runReferenceMatch,
    loadHistoryMatch,
    reset,
  };
};