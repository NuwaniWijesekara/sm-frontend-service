
"use client";
import React, { useState } from "react";
import { Event } from "@/types";
import { Calendar, Camera, Image as ImageIcon } from "lucide-react";

interface Props {
  event: Event;
}

export default function EventHeader({ event }: Props) {
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [coverError, setCoverError] = useState(false);
  
  const formatted = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="relative rounded-2xl overflow-hidden shadow-xl mb-8">
      {event.cover_photo_url && !coverError ? (
        <>
          {!coverLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" />
          )}
          
          <div className="relative h-48 md:h-64 w-full">
            <img
              src={event.cover_photo_url}
              alt={`${event.name} cover`}
              className={`
                w-full h-full object-cover transition-all duration-700
                ${coverLoaded ? "scale-100 blur-0" : "scale-105 blur-sm"}
              `}
              onLoad={() => setCoverLoaded(true)}
              onError={() => setCoverError(true)}
              loading="eager"
            />
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </>
      ) : (
        <div className="h-48 md:h-64 w-full bg-gradient-to-r from-violet-600 to-indigo-600" />
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-white/70 mb-1 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Event Gallery
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight drop-shadow-lg font-display">
              {event.name}
            </h1>
            <p className="text-white/80 text-sm mt-2 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatted}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="backdrop-blur-md bg-white/20 rounded-full px-4 py-2 border border-white/30">
              <span className="flex items-center gap-2 text-white text-sm font-medium">
                <Camera className="w-4 h-4" />
                {event.total_photos.toLocaleString()} photos
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}