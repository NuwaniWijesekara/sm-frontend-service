"use client";
import React, { use, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEventData } from "@/hooks/useEventData";
import { useSelfieMatch } from "@/hooks/useSelfieMatch";
import EventHeader from "@/components/event/EventHeader";
import SelfiePanel from "@/components/selfie/SelfiePanel";
import Spinner from "@/components/ui/Spinner";
import PhotoGallery from "@/components/event/PhotoGallary";
import { fetchSavedFaces, loginAnonymous, SavedFace } from "@/services/api";
import { Camera, Sparkles, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ token: string }>;
}

export default function EventPage({ params }: Props) {
  const { token } = use(params);
  const { data, status } = useEventData(token);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem("token");
      if (!t) {
        setShowAuthModal(true);
      } else {
        setAuthToken(t);
      }
    }
  }, []);

  const handleAuthSuccess = (t: string) => {
    localStorage.setItem("token", t);
    setAuthToken(t);
    setShowAuthModal(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chalk">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-dim text-sm mt-4">Loading your event…</p>
        </div>
      </div>
    );
  }

  if (status === "invalid_token") {
    return (
      <EmptyState
        icon="🔗"
        title="Invalid QR Code"
        body="This link is invalid or has expired. Contact your event photographer for a new link."
      />
    );
  }

  if (status === "not_ready") {
    return (
      <EmptyState
        icon="⏳"
        title="Photos Being Processed"
        body="The photographer is still uploading and indexing photos. Please check back in a few minutes."
      />
    );
  }

  if (status === "network_error" || !data) {
    return (
      <EmptyState
        icon="📡"
        title="Connection Error"
        body="Could not load the event. Check your connection and try again."
        action={{ label: "Retry", onClick: () => window.location.reload() }}
      />
    );
  }

  return (
    <>
      {showAuthModal && (
        <AuthGate token={token} onAuthSuccess={handleAuthSuccess} />
      )}
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-chalk">
          <Spinner size="lg" />
        </div>
      }>
        <EventView token={token} data={data} authToken={authToken} />
      </Suspense>
    </>
  );
}

function EventView({
  token,
  data,
  authToken,
}: {
  token: string;
  data: NonNullable<ReturnType<typeof useEventData>["data"]>;
  authToken: string | null;
}) {
  const searchParams = useSearchParams();
  const searchId = searchParams.get("search_id");
  const faceId = searchParams.get("face_id") || searchParams.get("saved_face_id");

  const eventToken = data.event.qr_token || token;
  const { status, statusLabel, results, error, needsReferenceFace, uploadPct, runMatch, runReferenceMatch, loadHistoryMatch, reset } =
    useSelfieMatch(eventToken);
  const [savedFaces, setSavedFaces] = useState<SavedFace[]>([]);
  const [hasAutoMatched, setHasAutoMatched] = useState(false);

  useEffect(() => {
    if (hasAutoMatched) return;

    if (searchId) {
      setHasAutoMatched(true);
      loadHistoryMatch(searchId);
    } else if (faceId) {
      setHasAutoMatched(true);
      runMatch(faceId);
    }
  }, [searchId, faceId, loadHistoryMatch, runMatch, hasAutoMatched]);

  useEffect(() => {
    if (authToken) {
      try {
        const parts = authToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (!payload.is_anonymous) {
            fetchSavedFaces().then(setSavedFaces).catch(console.error);
          }
        }
      } catch (e) {
        console.error("Failed to decode token/fetch saved faces", e);
      }
    }
  }, [authToken]);

  return (
    <main className="min-h-screen bg-chalk">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-between min-h-screen">
        <div>
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-dim hover:text-accent-dark transition-colors bg-surface hover:bg-accent/10 border border-border hover:border-accent/30 px-3.5 py-2 rounded-xl shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          </div>

          <EventHeader event={data.event} />

          <div className="mt-8 flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              <PhotoGallery photos={data.photos} matchedResults={results} />
            </div>

            <aside className="w-full lg:w-80 xl:w-96 shrink-0">
              <div className="lg:sticky lg:top-6">
                <SelfiePanel
                  eventId={eventToken}
                  status={status}
                  statusLabel={statusLabel}
                  results={results}
                  error={error}
                  needsReferenceFace={needsReferenceFace}
                  uploadPct={uploadPct}
                  onRunMatch={runMatch}
                  onFindMe={runReferenceMatch}
                  onReset={reset}
                  savedFaces={savedFaces}
                />
              </div>
            </aside>
          </div>
        </div>

        <footer className="mt-16 pb-8 text-center text-[11px] text-dim flex justify-between border-t border-border pt-4">
          <span>Powered by ScanMe AI</span>
          <div className="flex gap-4">
            <Link href="/dashboard" className="hover:underline font-bold text-accent">
              Go to Dashboard
            </Link>
            <span>·</span>
            <span>Processed securely in memory</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function AuthGate({ token, onAuthSuccess }: { token: string; onAuthSuccess: (token: string) => void }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinueAsGuest = async () => {
    setError("");
    setLoading(true);
    try {
      const newToken = await loginAnonymous();
      onAuthSuccess(newToken);
    } catch (err: any) {
      setError("Failed to start a temporary session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative text-ink">
        <div className="text-center space-y-1">
          <div className="mx-auto w-10 h-10 bg-ink rounded-xl flex items-center justify-center shadow-sm">
            <Camera className="w-5 h-5 text-chalk" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight mt-3 text-ink font-display">Welcome</h2>
          <p className="text-xs text-dim">Continue as a guest to search this event's photos, or sign in to your account.</p>
        </div>

        {error && (
          <div className="p-3.5 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <div className="space-y-4 text-center">
          <p className="text-xs text-dim leading-relaxed max-w-sm mx-auto">
            Continuing as a guest is instant — your search history and uploads are temporary and automatically deleted in 24 hours.
          </p>
          <button
            onClick={handleContinueAsGuest}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold bg-ink text-chalk hover:bg-ink/80 hover:-translate-y-0.5 active:scale-[0.99] transition-all text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
          >
            {loading ? "Starting session..." : "Continue as Guest"} <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <Link
            href={"/auth?redirect=" + encodeURIComponent("/events/guest/" + token)}
            className="block w-full py-3 rounded-xl border border-border bg-chalk hover:bg-surface text-ink text-xs font-semibold transition-all"
          >
            Already have an account? Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-chalk px-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">{icon}</div>
        <h1 className="font-display text-2xl font-bold text-ink mb-2">{title}</h1>
        <p className="text-dim text-sm leading-relaxed mb-5">{body}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="px-6 py-3 bg-ink text-chalk rounded-xl text-sm font-semibold
                       hover:bg-ink/80 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}