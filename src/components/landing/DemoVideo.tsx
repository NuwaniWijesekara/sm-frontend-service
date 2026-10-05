"use client";
import React, { useState } from "react";
import { Play, Camera, ScanFace, Images } from "lucide-react";

// The demo is set via env: either a YouTube link (watch, youtu.be, shorts or
// embed URL — played through YouTube's embed player) or a direct video file
// (e.g. an .mp4 on S3/CloudFront, or one dropped into public/demo/).
const DEMO_VIDEO_SRC = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL || "/demo/scanme-demo.mp4";

// The 11-character video id from any common YouTube URL shape, else null.
const youTubeId = (url: string): string | null => {
  const m = url.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/
  );
  return m ? m[1] : null;
};

const DEMO_YOUTUBE_ID = youTubeId(DEMO_VIDEO_SRC);
// An explicit cover wins; YouTube videos otherwise use their own thumbnail.
const DEMO_POSTER_SRC =
  process.env.NEXT_PUBLIC_DEMO_VIDEO_POSTER_URL ||
  (DEMO_YOUTUBE_ID ? `https://i.ytimg.com/vi/${DEMO_YOUTUBE_ID}/hqdefault.jpg` : undefined);

const STEPS = [
  { icon: Camera, label: "Scan the event QR" },
  { icon: ScanFace, label: "Take a quick selfie" },
  { icon: Images, label: "Get every photo you're in" },
];

export default function DemoVideo() {
  const [playing, setPlaying] = useState(false);

  return (
    <section id="demo" className="relative max-w-6xl w-full mx-auto mb-12 z-10 scroll-mt-6 md:scroll-mt-12">
      <div className="text-center max-w-2xl mx-auto mb-8 space-y-3">
        <span className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent-dark border border-accent/25 rounded-full text-xs font-semibold">
          <Play className="w-3 h-3 fill-current" /> Demo
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-ink font-display">
          See how ScanMe works in action.
        </h2>
        <p className="text-dim text-sm md:text-base leading-relaxed">
          Watch a guest go from scanning an event QR code to finding every photo they&apos;re in, in under a minute.
        </p>
      </div>

      <div className="relative aspect-video w-full max-w-4xl mx-auto rounded-3xl overflow-clip border border-border bg-ink shadow-sm">
        {playing && DEMO_YOUTUBE_ID ? (
          <iframe
            className="absolute inset-0 w-full h-full"
            // Privacy-enhanced embed; autoplay is allowed because it follows
            // the visitor's click on the cover.
            src={`https://www.youtube-nocookie.com/embed/${DEMO_YOUTUBE_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title="ScanMe demo video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : playing ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src={DEMO_VIDEO_SRC}
            poster={DEMO_POSTER_SRC}
            controls
            autoPlay
            playsInline
          >
            Your browser doesn&apos;t support embedded video.
          </video>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Play the ScanMe demo video"
            className="group absolute inset-0 w-full h-full text-left"
          >
            {DEMO_POSTER_SRC ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={DEMO_POSTER_SRC} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <DemoCover />
            )}
            <div className="absolute inset-0 bg-ink/30 group-hover:bg-ink/20 transition-colors" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-chalk text-ink shadow-xl transition-transform group-hover:scale-105 group-active:scale-95">
                <span className="absolute inset-0 rounded-full bg-chalk/40 animate-ping" />
                <Play className="relative w-6 h-6 md:w-8 md:h-8 ml-1 fill-current" />
              </span>
            </span>
            <span className="absolute bottom-4 left-4 px-2.5 py-1 rounded-md bg-ink/70 text-chalk text-[11px] font-semibold">
              Watch the demo
            </span>
          </button>
        )}
      </div>

      <ol className="mt-6 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEPS.map(({ icon: Icon, label }, i) => (
          <li key={label} className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl shadow-sm">
            <span className="w-8 h-8 shrink-0 rounded-lg bg-chalk border border-border flex items-center justify-center">
              <Icon className="w-4 h-4 text-accent-dark" />
            </span>
            <span className="text-xs font-semibold text-ink">
              <span className="text-dim mr-1">{i + 1}.</span>{label}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Image-free cover shown until a real poster is configured: a stylised
// gallery with a few "matched" photos highlighted.
function DemoCover() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-accent-dark/60 p-6 md:p-10">
      <div className="absolute top-[-30%] right-[-10%] w-2/3 h-2/3 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative h-full grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-3 opacity-80">
        {Array.from({ length: 12 }).map((_, i) => {
          const matched = i === 1 || i === 4 || i === 9;
          return (
            <div
              key={i}
              className={`rounded-lg md:rounded-xl ${
                matched ? "bg-accent/70 ring-2 ring-accent" : "bg-chalk/10"
              } ${i >= 8 ? "hidden md:block" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}
