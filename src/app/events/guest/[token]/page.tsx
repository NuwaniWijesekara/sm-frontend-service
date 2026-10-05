"use client";
import React, { use, useState, useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEventData } from "@/hooks/useEventData";
import { useSelfieMatch } from "@/hooks/useSelfieMatch";
import EventHeader from "@/components/event/EventHeader";
import SelfiePanel from "@/components/selfie/SelfiePanel";
import Spinner from "@/components/ui/Spinner";
import PhotoGallery from "@/components/event/PhotoGallery";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { ArrowLeft, AlertCircle, Lock, X } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ token: string }>;
}

export default function EventPage({ params }: Props) {
  const { token } = use(params);
  const { data, status } = useEventData(token);
  // Public galleries are browsable without an account; selfie search is not
  // (EventView prompts for sign-in). Invite-only galleries fail the fetch
  // above with `login_required` and show InviteOnlyGate instead.
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthToken(localStorage.getItem("token"));
    }
  }, []);

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

  if (status === "login_required" || status === "verification_required" || status === "not_invited") {
    return <InviteOnlyGate reason={status} />;
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-chalk">
        <Spinner size="lg" />
      </div>
    }>
      <EventView token={token} data={data} authToken={authToken} onSignedIn={setAuthToken} />
    </Suspense>
  );
}

function EventView({
  token,
  data,
  authToken,
  onSignedIn,
}: {
  token: string;
  data: NonNullable<ReturnType<typeof useEventData>["data"]>;
  authToken: string | null;
  onSignedIn: (token: string) => void;
}) {
  const searchParams = useSearchParams();
  const searchId = searchParams.get("search_id");

  const eventToken = data.event.qr_token || token;
  const { status, statusLabel, results, error, uploadPct, authRequired, runMatch, loadHistoryMatch, reset } =
    useSelfieMatch(eventToken);
  const [hasAutoMatched, setHasAutoMatched] = useState(false);

  // Selfie search always needs an account, even in a public gallery. A
  // signed-out visitor gets the sign-in modal first; the selfie they picked
  // is kept and the search runs as soon as they have signed in.
  const [showSignIn, setShowSignIn] = useState(false);
  const pendingMatch = useRef<File | string | null>(null);

  const handleRunMatch = (fileOrId: File | string) => {
    if (!authToken) {
      pendingMatch.current = fileOrId;
      setShowSignIn(true);
      return;
    }
    runMatch(fileOrId);
  };

  const handleSignedIn = (newToken: string) => {
    localStorage.setItem("token", newToken);
    onSignedIn(newToken);
    setShowSignIn(false);
    const pending = pendingMatch.current;
    pendingMatch.current = null;
    if (pending) runMatch(pending);
  };

  // The server can still reject a stored token (expired, or left over from
  // the removed anonymous sessions) — prompt for sign-in then too.
  useEffect(() => {
    if (authRequired) setShowSignIn(true);
  }, [authRequired]);
  // Signed-in users see their earlier searches on this
  // event; refreshed after each search, which adds a history entry.
  const recentSearches = useRecentSearches(authToken ? data.event.id : null, `${authToken}:${status === "done"}`);

  useEffect(() => {
    if (hasAutoMatched) return;

    if (searchId) {
      setHasAutoMatched(true);
      loadHistoryMatch(searchId);
    }
  }, [searchId, loadHistoryMatch, hasAutoMatched]);

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
                  uploadPct={uploadPct}
                  onRunMatch={handleRunMatch}
                  onReset={reset}
                  recentSearches={recentSearches}
                  onOpenSearch={loadHistoryMatch}
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

      {showSignIn && (
        <SignInModal
          onSuccess={handleSignedIn}
          onClose={() => {
            pendingMatch.current = null;
            setShowSignIn(false);
          }}
        />
      )}
    </main>
  );
}

// Shown when a signed-out visitor starts a selfie search. Browsing a public
// gallery needs no account, but searching it does (Google or email/password).
function SignInModal({ onSuccess, onClose }: { onSuccess: (token: string) => void; onClose: () => void }) {
  const pathname = usePathname();
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="selfie-sign-in-title"
        className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-xl relative text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-dim hover:text-ink hover:bg-chalk transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="mx-auto w-12 h-12 bg-ink rounded-2xl flex items-center justify-center mb-4">
          <Lock className="w-5 h-5 text-chalk" />
        </div>
        <h2 id="selfie-sign-in-title" className="font-display text-2xl font-bold text-ink mb-2">
          Sign in to find your photos
        </h2>
        <p className="text-dim text-sm leading-relaxed mb-6">
          Selfie search needs an account so your searches stay private to you and you can reopen past results.
        </p>
        <GoogleSignInButton onSuccess={onSuccess} onError={setError} onLoadingChange={setSigningIn} />
        <Link
          href={`/auth?redirect=${encodeURIComponent(pathname)}&method=password`}
          className="inline-block mt-4 text-xs font-semibold text-accent hover:text-accent-dark transition-colors"
        >
          Use email and password instead
        </Link>
        {signingIn && <p className="text-xs text-dim mt-4">Signing you in…</p>}
        {error && (
          <div className="mt-4 p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs flex gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Invite-only gallery sign-in. Google is the only option offered here:
// access needs a verified email (sm-guest-service utils/access.py), and only a
// Google sign-in provides one — email/password lives on the dashboard login.
function InviteOnlyGate({ reason }: { reason: "login_required" | "verification_required" | "not_invited" }) {
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const copy = {
    login_required: {
      title: "Invite-only Gallery",
      body: "This gallery is invite-only. Please sign in with your invited Google account to view photos.",
    },
    verification_required: {
      title: "Sign in with Google",
      body: "This gallery is invite-only. Please sign in with your invited Google account to view photos — email and password sign-in can't be used here.",
    },
    not_invited: {
      title: "Not on the Guest List",
      body: "The account you're signed in with isn't on this event's guest list. Sign in with the Google account you were invited with, or ask the event owner to invite you.",
    },
  }[reason];

  const handleSuccess = (newToken: string) => {
    localStorage.setItem("token", newToken);
    // Reload so the gallery is fetched again with the new session.
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-chalk px-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 text-center shadow-sm">
        <div className="mx-auto w-12 h-12 bg-ink rounded-2xl flex items-center justify-center mb-4">
          <Lock className="w-5 h-5 text-chalk" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink mb-2">{copy.title}</h1>
        <p className="text-dim text-sm leading-relaxed mb-6">{copy.body}</p>
        <GoogleSignInButton onSuccess={handleSuccess} onError={setError} onLoadingChange={setSigningIn} />
        {signingIn && <p className="text-xs text-dim mt-4">Signing you in…</p>}
        {error && (
          <div className="mt-4 p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs flex gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}
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