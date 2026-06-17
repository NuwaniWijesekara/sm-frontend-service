"use client";
import React, { useRef, useState, useCallback, useEffect } from "react";
import Spinner from "@/components/ui/Spinner";

interface Props {
  onCapture: (file: File) => void;
  disabled?: boolean;
}

type Phase = "idle" | "starting" | "live";

export default function CameraCapture({ onCapture, disabled }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase]       = useState<Phase>("idle");
  const [camError, setCamError] = useState<string | null>(null);
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPhase("idle");
  }, []);

  // Clean up on unmount
  useEffect(() => () => { stopStream(); }, [stopStream]);

  const startCamera = async () => {
    setCamError(null);
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setPendingStream(stream);
      setPhase("live");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setCamError(
        msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")
          ? "Camera permission denied. Allow access in your browser settings."
          : "Could not open camera. Try uploading a photo instead."
      );
      setPhase("idle");
    }
  };
  
  useEffect(() => {
    if (phase === "live" && videoRef.current && pendingStream) {
      videoRef.current.srcObject = pendingStream;
      videoRef.current.play().catch(() => {});
    }
  }, [phase, pendingStream]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror the canvas to match the mirrored video preview
    const ctx = canvas.getContext("2d")!;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
        stopStream();
        onCapture(file);
      },
      "image/jpeg",
      0.92
    );
  };

  if (phase === "idle" || phase === "starting") {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={startCamera}
          disabled={disabled || phase === "starting"}
          className="w-full py-3 rounded-xl bg-ink text-chalk text-sm font-semibold
                     flex items-center justify-center gap-2
                     hover:bg-ink/80 disabled:opacity-40 transition-colors"
        >
          {phase === "starting" ? (
            <>
              <Spinner size="sm" />
              Opening camera…
            </>
          ) : (
            <>
              <span aria-hidden>📷</span>
              Take a Selfie
            </>
          )}
        </button>
        {camError && (
          <p className="text-danger text-xs text-center leading-snug">{camError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-xl overflow-hidden bg-ink aspect-4/3">
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-[-1]"
          muted
          playsInline   // required for iOS Safari — must be lowercase
          autoPlay
        />
        {/* Face guide oval */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-28 h-36 rounded-full border-2 border-chalk/60 border-dashed" />
        </div>
        <p className="absolute bottom-2 w-full text-center text-[10px] text-chalk/70">
          Position your face in the oval
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={capture}
          className="flex-1 py-3 rounded-xl bg-accent text-ink text-sm font-bold
                     hover:bg-accent-dark transition-colors"
        >
          Capture
        </button>
        <button
          onClick={stopStream}
          className="px-4 py-3 rounded-xl bg-border text-ink text-sm font-semibold
                     hover:bg-border/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}









