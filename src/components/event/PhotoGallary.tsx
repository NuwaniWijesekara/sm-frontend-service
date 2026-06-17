"use client";
import React from "react";
import { Photo, MatchResult } from "@/types";
import PhotoCard from "./PhotoCard";

interface Props {
  photos: Photo[];
  matchedResults?: MatchResult[];
}

export default function PhotoGallery({ photos, matchedResults }: Props) {
  const matchedIds = new Set((matchedResults ?? []).map((r) => r.photo_id));

  // Sort: matched photos float to the top
  const sorted =
    matchedIds.size > 0
      ? [...photos].sort((a, b) => {
          const aM = matchedIds.has(a.id) ? 0 : 1;
          const bM = matchedIds.has(b.id) ? 0 : 1;
          return aM - bM;
        })
      : photos;

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl font-bold text-ink">
          {matchedIds.size > 0
            ? `Your photos (${matchedIds.size}) · All (${photos.length})`
            : `All photos · ${photos.length}`}
        </h2>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-20 text-dim text-sm">
          No photos in this event yet.
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-2 xl:columns-3 gap-3">
          {sorted.map((photo) => (
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