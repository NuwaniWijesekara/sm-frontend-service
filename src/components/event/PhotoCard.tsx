"use client";
import React, { useState } from "react";
import { Photo } from "@/types";

interface Props {
  photo: Photo;
  highlighted?: boolean;
}

export default function PhotoCard({ photo, highlighted }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={[
        "relative group break-inside-avoid mb-3 rounded-xl overflow-hidden",
        "ring-2 transition-all duration-300",
        highlighted
          ? "ring-accent shadow-lg shadow-accent/20"
          : "ring-transparent",
      ].join(" ")}
    >
      {!loaded && (
        <div
          className="absolute inset-0 bg-linear-to-r from-border via-chalk to-border animate-shimmer"
          style={{ minHeight: 120 }}
        />
      )}

      <img
        src={photo.thumbnail_url}
        alt="Event photo"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={[
          "w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      <div
        className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100
                   transition-opacity duration-200 flex items-end p-3"
      >
        <a
          href={photo.s3_url}
          download
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-full text-center text-xs font-semibold text-chalk
                     bg-ink/70 backdrop-blur-sm rounded-lg py-2
                     hover:bg-accent hover:text-ink transition-colors"
        >
          Download
        </a>
      </div>

      {highlighted && (
        <div
          className="absolute top-2 right-2 bg-accent text-ink text-[10px]
                     font-bold px-2 py-0.5 rounded-full pointer-events-none"
        >
          Match
        </div>
      )}
    </div>
  );
}



