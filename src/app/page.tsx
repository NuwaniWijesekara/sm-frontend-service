"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginAnonymous } from "@/services/api";
import { Camera, ArrowRight, Shield, Sparkles, AlertCircle, Search } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [collectionSearchQuery, setCollectionSearchQuery] = useState("");

  const handleCollectionSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionSearchQuery.trim()) return;
    let q = collectionSearchQuery.trim();
    if (q.startsWith("@")) q = q.substring(1);
    if (q.includes("/events/guest/")) {
      const match = q.match(/\/events\/guest\/([^/?#]+)/);
      if (match) q = match[1];
    }
    router.push(`/events/guest/${q}`);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasToken(!!localStorage.getItem("token"));
    }
  }, []);

  const handleContinueAsGuest = async () => {
    setError("");
    setLoading(true);
    try {
      const token = await loginAnonymous();
      localStorage.setItem("token", token);
      router.push("/dashboard");
    } catch (err) {
      setError("Failed to start a temporary session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-chalk text-ink flex flex-col justify-between p-6 md:p-12 font-body relative overflow-hidden">
      {/* Background blobs for premium warm accent look */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center shadow-sm">
            <Camera className="w-5 h-5 text-chalk" />
          </div>
          <span className="font-bold text-xl tracking-tight text-ink font-display">
            ScanMe AI
          </span>
        </div>

        {hasToken ? (
          <Link
            href="/dashboard"
            className="text-xs font-semibold px-4 py-2 bg-surface border border-border hover:border-accent hover:text-accent-dark rounded-lg transition shadow-sm"
          >
            Dashboard →
          </Link>
        ) : (
          <Link
            href="/auth"
            className="text-xs font-semibold text-dim hover:text-ink transition"
          >
            Login
          </Link>
        )}
      </header>

      {/* Main Grid Content */}
      <section className="max-w-6xl w-full mx-auto my-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">

        {/* Left Column - Hero Marketing */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent-dark border border-accent/25 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Premium AI Face Recognition
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-ink font-display">
            Find your photos, <br/>
            <span className="text-accent-dark">
              instantly.
            </span>
          </h1>
          <p className="text-dim text-base md:text-lg leading-relaxed max-w-xl">
            Welcome to ScanMe AI. Enter an event's collection username below or choose a saved face to search event photos.
          </p>

          {/* Quick Collection Search Bar */}
          <form onSubmit={handleCollectionSearch} className="flex gap-2 max-w-md bg-surface p-2 border border-border rounded-2xl shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-dim absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Enter Collection Username (e.g. @wedding2026)"
                value={collectionSearchQuery}
                onChange={(e) => setCollectionSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-chalk border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-accent font-medium text-ink placeholder:text-dim"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-ink text-chalk hover:bg-ink/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              Search <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-surface border border-border rounded-xl flex gap-3 shadow-sm">
              <Shield className="w-5 h-5 text-accent-dark shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-ink">Strict Face Retention</h4>
                <p className="text-xs text-dim mt-1">Temporary uploads expire in 24 hours. Saved faces stay for 30 days of activity.</p>
              </div>
            </div>
            <div className="p-4 bg-surface border border-border rounded-xl flex gap-3 shadow-sm">
              <Camera className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-ink">Face Nicknames</h4>
                <p className="text-xs text-dim mt-1">Register to save multiple family faces (e.g. Kids, Spouse) for easy searching.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Get Started Card */}
        <div className="lg:col-span-6">
          <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden text-center space-y-6">
            <div className="mx-auto w-14 h-14 bg-chalk rounded-full flex items-center justify-center border border-border">
              <Sparkles className="w-6 h-6 text-accent-dark" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink">Get Started</h3>
              <p className="text-xs text-dim leading-relaxed max-w-sm mx-auto">
                Skip registration and search event photos instantly — your search history and uploads are temporary and deleted after 24 hours. Or sign in to create your own events and keep everything permanently.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs flex gap-2 items-start text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {hasToken ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full py-3.5 rounded-xl font-bold bg-ink text-chalk hover:bg-ink/80 hover:-translate-y-0.5 active:scale-[0.99] transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleContinueAsGuest}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold bg-ink text-chalk hover:bg-ink/80 hover:-translate-y-0.5 active:scale-[0.99] transition-all text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
                >
                  {loading ? "Starting session..." : "Continue as Guest"} <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  href="/auth"
                  className="w-full py-3 rounded-xl border border-border bg-chalk hover:bg-surface text-ink text-sm font-semibold transition-all inline-flex items-center justify-center"
                >
                  Login / Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto text-center border-t border-border pt-6 mt-8 z-10 flex flex-col sm:flex-row justify-between text-xs text-dim">
        <span>© 2026 ScanMe AI. All rights reserved.</span>
        <div className="flex gap-4 justify-center mt-2 sm:mt-0">
          <span>Processed securely in memory</span>
          <span>·</span>
          <span>Privacy Focused</span>
        </div>
      </footer>
    </main>
  );
}
