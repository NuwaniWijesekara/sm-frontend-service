"use client";
import React from "react";
import { MatchResult } from "@/types";

interface Props {
  results: MatchResult[];
  onReset: () => void;
}

export default function MatchedResults({ results, onReset }: Props) {
  if (results.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">🔍</div>
        <p className="font-semibold text-ink text-sm mb-1">No matches found</p>
        <p className="text-dim text-xs mb-5 leading-relaxed">
          Try a clearer selfie with good lighting and your face fully visible.
        </p>
        <button
          onClick={onReset}
          className="w-full py-3 rounded-xl bg-ink text-chalk text-sm font-semibold
                     hover:bg-ink/80 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-ink text-lg">
            {results.length} photo{results.length !== 1 ? "s" : ""} found
          </p>
          <p className="text-dim text-xs">
            Your photos are highlighted in the gallery
          </p>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-accent font-semibold hover:underline shrink-0 ml-3"
        >
          Search again
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {results.map((r) => (
          <div
            key={r.photo_id}
            className="relative group rounded-xl overflow-hidden aspect-square bg-border"
          >
            <img
              src={r.thumbnail_url}
              alt="Matched photo"
              className="w-full h-full object-cover"
            />
            <a
              href={r.s3_url}
              download
              target="_blank"
              rel="noreferrer"
              className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100
                         transition-opacity flex items-center justify-center"
            >
              <span className="text-[10px] text-chalk font-bold bg-ink/60 px-2 py-1 rounded-full">
                Download
              </span>
            </a>
            <div
              className="absolute bottom-1 left-1 bg-accent text-ink text-[9px]
                         font-bold px-1.5 py-0.5 rounded-full pointer-events-none"
            >
              {Math.round(r.similarity_score * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
