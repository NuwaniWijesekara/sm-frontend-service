"use client";
import React, { use, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEventData } from "@/hooks/useEventData";
import { useSelfieMatch } from "@/hooks/useSelfieMatch";
import EventHeader from "@/components/event/EventHeader";
import SelfiePanel from "@/components/selfie/SelfiePanel";
import Spinner from "@/components/ui/Spinner";
import PhotoGallery from "@/components/event/PhotoGallary";
import { fetchSavedFaces, guestLogin, guestRegister, guestLoginAnonymous, guestLoginGoogle, SavedFace } from "@/services/api";
import { Camera, Lock, User, Sparkles, ArrowRight, ArrowLeft, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

interface Props {
  params: Promise<{ token: string }>;
}

export default function EventPage({ params }: Props) {
  const { token } = use(params);
  const { data, status } = useEventData(token);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem("guest_token");
      if (!t) {
        setShowAuthModal(true);
      } else {
        setGuestToken(t);
      }
    }
  }, []);

  const handleAuthSuccess = (t: string) => {
    localStorage.setItem("guest_token", t);
    setGuestToken(t);
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
        <GuestAuthOverlay onAuthSuccess={handleAuthSuccess} />
      )}
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-chalk">
          <Spinner size="lg" />
        </div>
      }>
        <EventView token={token} data={data} guestToken={guestToken} />
      </Suspense>
    </>
  );
}

function EventView({
  token,
  data,
  guestToken,
}: {
  token: string;
  data: NonNullable<ReturnType<typeof useEventData>["data"]>;
  guestToken: string | null;
}) {
  const searchParams = useSearchParams();
  const searchId = searchParams.get("search_id");
  const faceId = searchParams.get("face_id") || searchParams.get("saved_face_id");

  const eventToken = data.event.qr_token || token;
  const { status, statusLabel, results, error, uploadPct, runMatch, loadHistoryMatch, reset } =
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
    if (guestToken) {
      try {
        const parts = guestToken.split(".");
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
  }, [guestToken]);

  return (
    <main className="min-h-screen bg-chalk">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-between min-h-screen">
        <div>
          <div className="mb-6">
            <Link
              href="/guest-dashboard"
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
                  onRunMatch={runMatch}
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
            <Link href="/guest-dashboard" className="hover:underline font-bold text-accent">
              Go to Guest Dashboard
            </Link>
            <span>·</span>
            <span>Processed securely in memory</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function GuestAuthOverlay({ onAuthSuccess }: { onAuthSuccess: (token: string) => void }) {
  const [activeTab, setActiveTab] = useState<"anonymous" | "login" | "register">("anonymous");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const validateForm = (isRegister: boolean) => {
    const errs: typeof fieldErrors = {};
    if (isRegister && !name.trim()) {
      errs.name = "Full Name is required";
    }
    if (!email) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address";
    }
    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 8) {
      errs.password = "Password must be at least 8 characters long";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validateForm(false)) return;
    setLoading(true);
    try {
      const token = await guestLogin(email, password);
      setSuccess("Successfully logged in!");
      setTimeout(() => onAuthSuccess(token), 500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validateForm(true)) return;
    setLoading(true);
    try {
      await guestRegister(name, email, password);
      setSuccess("Account created successfully! You can now log in.");
      setActiveTab("login");
      setError("");
      setName("");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousGuest = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const token = await guestLoginAnonymous();
      onAuthSuccess(token);
    } catch (err: any) {
      setError("Failed to create temporary session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    console.log("Google response received in overlay:", response);
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (!response.credential) {
        throw new Error("No credential returned from Google login.");
      }
      const token = await guestLoginGoogle(response.credential);
      setSuccess("Successfully logged in with Google!");
      setTimeout(() => onAuthSuccess(token), 500);
    } catch (err: any) {
      console.error("Google overlay login error:", err);
      const apiError = err.response?.data?.detail;
      setError(apiError || "Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const initGoogle = () => {
    if (typeof window !== "undefined" && (window as any).google) {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
      console.log("Initializing Google OAuth in overlay with client_id:", clientId);
      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
      });
      const btnContainer = document.getElementById("google-overlay-btn");
      if (btnContainer) {
        (window as any).google.accounts.id.renderButton(
          btnContainer,
          { theme: "outline", size: "large", width: 350, shape: "rectangular" }
        );
      }
    }
  };

  useEffect(() => {
    initGoogle();
  }, [activeTab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative text-ink">
        <div className="text-center space-y-1">
          <div className="mx-auto w-10 h-10 bg-ink rounded-xl flex items-center justify-center shadow-sm">
            <Camera className="w-5 h-5 text-chalk" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight mt-3 text-ink font-display">Guest Authentication</h2>
          <p className="text-xs text-dim">Unlock event search features to scan photos.</p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-chalk p-1 rounded-xl border border-border text-xs">
          <button
            type="button"
            onClick={() => { setActiveTab("anonymous"); setError(""); setSuccess(""); setFieldErrors({}); }}
            className={`flex-1 text-center py-2 rounded-lg font-bold transition ${activeTab === "anonymous" ? "bg-surface text-ink shadow-sm" : "text-dim hover:text-ink"}`}
          >
            Continue as Guest
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("login"); setError(""); setSuccess(""); setFieldErrors({}); }}
            className={`flex-1 text-center py-2 rounded-lg font-bold transition ${activeTab === "login" ? "bg-surface text-ink shadow-sm" : "text-dim hover:text-ink"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("register"); setError(""); setSuccess(""); setFieldErrors({}); }}
            className={`flex-1 text-center py-2 rounded-lg font-bold transition ${activeTab === "register" ? "bg-surface text-ink shadow-sm" : "text-dim hover:text-ink"}`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3.5 bg-success/10 border border-success/20 text-success rounded-xl text-xs flex gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {activeTab === "anonymous" ? (
          <div className="space-y-4 text-center">
            <p className="text-xs text-dim leading-relaxed max-w-sm mx-auto">
              Continue anonymously to search photos. Your search history and uploads are temporary and automatically deleted in 24 hours.
            </p>
            <button
              onClick={handleAnonymousGuest}
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold bg-ink text-chalk hover:bg-ink/80 hover:-translate-y-0.5 active:scale-[0.99] transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? "Starting session..." : "Continue as Guest"} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : activeTab === "login" ? (
          <form onSubmit={handleGuestLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-ink tracking-wider mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative">
                <User className="absolute left-4 top-2.5 w-4 h-4 text-dim" />
                <input
                  type="email"
                  required
                  placeholder="guest@mail.com"
                  className={`w-full pl-12 pr-4 py-2.5 bg-chalk border ${fieldErrors.email ? "border-danger focus:ring-danger" : "border-border focus:ring-accent"} rounded-xl outline-none text-xs transition text-ink font-semibold placeholder:text-dim`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                  }}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-danger text-[10px] mt-1 ml-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-ink tracking-wider mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-2.5 w-4 h-4 text-dim" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-4 py-2.5 bg-chalk border ${fieldErrors.password ? "border-danger focus:ring-danger" : "border-border focus:ring-accent"} rounded-xl outline-none text-xs transition text-ink font-semibold placeholder:text-dim`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                />
              </div>
              {fieldErrors.password && (
                <p className="text-danger text-[10px] mt-1 ml-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold bg-ink text-chalk hover:bg-ink/80 hover:-translate-y-0.5 active:scale-[0.99] transition-all text-xs shadow-sm"
            >
              {loading ? "Logging in..." : "Login to Guest Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleGuestRegister} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-ink tracking-wider mb-1.5 ml-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-2.5 w-4 h-4 text-dim" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className={`w-full pl-12 pr-4 py-2.5 bg-chalk border ${fieldErrors.name ? "border-danger focus:ring-danger" : "border-border focus:ring-accent"} rounded-xl outline-none text-xs transition text-ink font-semibold placeholder:text-dim`}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                  }}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-danger text-[10px] mt-1 ml-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-ink tracking-wider mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative">
                <User className="absolute left-4 top-2.5 w-4 h-4 text-dim" />
                <input
                  type="email"
                  required
                  placeholder="guest@mail.com"
                  className={`w-full pl-12 pr-4 py-2.5 bg-chalk border ${fieldErrors.email ? "border-danger focus:ring-danger" : "border-border focus:ring-accent"} rounded-xl outline-none text-xs transition text-ink font-semibold placeholder:text-dim`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                  }}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-danger text-[10px] mt-1 ml-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-ink tracking-wider mb-1.5 ml-1">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-2.5 w-4 h-4 text-dim" />
                <input
                  type="password"
                  required
                  placeholder="Min. 8 characters"
                  className={`w-full pl-12 pr-4 py-2.5 bg-chalk border ${fieldErrors.password ? "border-danger focus:ring-danger" : "border-border focus:ring-accent"} rounded-xl outline-none text-xs transition text-ink font-semibold placeholder:text-dim`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                />
              </div>
              {fieldErrors.password && (
                <p className="text-danger text-[10px] mt-1 ml-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold bg-ink text-chalk hover:bg-ink/80 hover:-translate-y-0.5 active:scale-[0.99] transition-all text-xs shadow-sm flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? "Creating account..." : "Register Guest Account"}
            </button>
          </form>
        )}

        {/* Google OAuth Section */}
        {activeTab !== "anonymous" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-[1px] bg-border" />
              <span className="text-[9px] uppercase font-bold tracking-wider text-dim">Or continue with</span>
              <div className="flex-1 h-[1px] bg-border" />
            </div>

            <div id="google-overlay-btn" className="w-full flex justify-center min-h-[40px]" />
          </div>
        )}
      </div>

      {/* Load Google Client Script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={initGoogle}
        strategy="afterInteractive"
      />
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