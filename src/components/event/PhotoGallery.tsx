"use client";
import React, { useState, useEffect } from "react";
import { Photo, MatchResult } from "@/types";
import PhotoCard from "./PhotoCard";
import { Sparkles, Grid } from "lucide-react";

interface Props {
  photos: Photo[];
  matchedResults?: MatchResult[];
}

export default function PhotoGallery({ photos, matchedResults }: Props) {
  const matchedIds = new Set((matchedResults ?? []).map((r) => r.photo_id));
  const hasMatches = matchedIds.size > 0;
  const [activeTab, setActiveTab] = useState<"matched" | "all">("all");

  // Automatically switch to "matched" view whenever matchedResults exist
  useEffect(() => {
    if (hasMatches) {
      setActiveTab("matched");
    }
  }, [hasMatches]);

  const displayedPhotos =
    activeTab === "matched" && hasMatches
      ? photos.filter((p) => matchedIds.has(p.id))
      : photos;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">
            {hasMatches && activeTab === "matched"
              ? `Matched Photos (${matchedIds.size})`
              : `All Photos (${photos.length})`}
          </h2>
          {hasMatches && (
            <p className="text-xs text-dim mt-0.5">
              {activeTab === "matched"
                ? `Showing ${matchedIds.size} matched ${matchedIds.size === 1 ? "photo" : "photos"} for your search.`
                : `Showing all ${photos.length} photos in this event.`}
            </p>
          )}
        </div>

        {hasMatches && (
          <div className="flex bg-chalk p-1 rounded-xl border border-border text-xs shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("matched")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === "matched"
                  ? "bg-ink text-chalk shadow-sm"
                  : "text-dim hover:text-ink"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Your Photos ({matchedIds.size})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === "all"
                  ? "bg-ink text-chalk shadow-sm"
                  : "text-dim hover:text-ink"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              All Photos ({photos.length})
            </button>
          </div>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-20 text-dim text-sm">
          No photos in this event yet.
        </div>
      ) : displayedPhotos.length === 0 ? (
        <div className="text-center py-16 text-dim text-sm border border-dashed border-border rounded-2xl bg-surface p-8">
          <p className="font-semibold">No matched photos found in this category.</p>
          <button
            onClick={() => setActiveTab("all")}
            className="mt-3 px-4 py-2 bg-chalk border border-border rounded-xl text-xs font-bold text-accent-dark hover:bg-surface transition"
          >
            View All Event Photos
          </button>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-2 xl:columns-3 gap-3">
          {displayedPhotos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              highlighted={matchedIds.has(photo.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}