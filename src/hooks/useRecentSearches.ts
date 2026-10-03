"use client";
import { useEffect, useState } from "react";
import { fetchGuestHistory, SearchHistory } from "@/services/api";

/**
 * The signed-in user's past selfie searches on one event (GET /guest/history),
 * newest first. Pass `eventId: null` to skip fetching (e.g. not signed in yet).
 * Re-fetches whenever `refreshKey` changes — e.g. after a new search finishes,
 * since every search writes a new history entry.
 */
export const useRecentSearches = (eventId: string | null, refreshKey: unknown = 0, limit = 5) => {
  const [searches, setSearches] = useState<SearchHistory[]>([]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetchGuestHistory()
      .then((all) => {
        if (!cancelled) setSearches(all.filter((h) => h.event?.id === eventId).slice(0, limit));
      })
      .catch(() => {
        if (!cancelled) setSearches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, refreshKey, limit]);

  // Derived rather than reset in the effect: nothing to show without an event.
  return eventId ? searches : [];
};
