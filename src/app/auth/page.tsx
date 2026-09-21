"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { login, signup, loginAnonymous, loginGoogle } from "@/services/api";

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // State to toggle between Login and Sign Up mode
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const goToRedirect = (token: string) => {
    localStorage.setItem("token", token);
    router.push(redirectTo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (isLoginMode) {
        const token = await login(email, password);
        goToRedirect(token);
      } else {
        await signup(email, password, name || undefined);
        setSuccessMsg("Account created! You can now log in.");
        setIsLoginMode(true);
        setPassword("");
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(detail || (isLoginMode ? "Invalid email or password" : "Failed to create account"));
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymous = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await loginAnonymous();
      goToRedirect(token);
    } catch (err) {
      setError("Failed to start a temporary session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    setError("");
    setLoading(true);
    try {
      if (!response.credential) {
        throw new Error("No credential returned from Google login.");
      }
      const token = await loginGoogle(response.credential);
      goToRedirect(token);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const initGoogle = () => {
    if (typeof window !== "undefined" && (window as any).google) {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
      });
      const btnContainer = document.getElementById("google-login-btn");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-chalk flex flex-col items-center justify-center p-6 font-body">
      <div className="max-w-md w-full bg-surface border border-border p-10 rounded-2xl shadow-sm transition-all">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-ink rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-ink">
            {isLoginMode ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-dim text-sm mt-2">
            {isLoginMode
              ? "Enter your credentials to access your dashboard."
              : "Sign up to start creating and sharing AI-powered event galleries."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLoginMode && (
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5 ml-1">
                Full Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-chalk border border-border rounded-xl
                           focus:bg-surface focus:ring-2 focus:ring-accent focus:border-accent
                           outline-none transition-all text-ink font-medium placeholder:text-dim"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5 ml-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 bg-chalk border border-border rounded-xl
                         focus:bg-surface focus:ring-2 focus:ring-accent focus:border-accent
                         outline-none transition-all text-ink font-medium placeholder:text-dim"
              placeholder="you@scanme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5 ml-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 bg-chalk border border-border rounded-xl
                         focus:bg-surface focus:ring-2 focus:ring-accent focus:border-accent
                         outline-none transition-all text-ink font-medium placeholder:text-dim"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-danger/10 text-danger border border-danger/20 rounded-xl text-sm font-medium text-center">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-success/10 text-success border border-success/20 rounded-xl text-sm font-medium text-center">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-chalk font-semibold text-base
                       transition-all bg-ink hover:bg-ink/80
                       disabled:opacity-40 disabled:hover:translate-y-0
                       hover:-translate-y-0.5"
          >
            {loading ? "Please wait..." : isLoginMode ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-[1px] bg-border" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-dim">Or</span>
          <div className="flex-1 h-[1px] bg-border" />
        </div>

        <div id="google-login-btn" className="w-full flex justify-center min-h-[44px] mb-4" />

        <button
          type="button"
          onClick={handleAnonymous}
          disabled={loading}
          className="w-full py-3 rounded-xl border border-border bg-chalk hover:bg-surface
                     text-ink text-sm font-semibold transition-all disabled:opacity-40"
        >
          Continue as Guest
        </button>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError("");
              setSuccessMsg("");
            }}
            className="text-sm font-semibold text-accent hover:text-accent-dark transition-colors"
          >
            {isLoginMode
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </button>
        </div>
      </div>

      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={initGoogle}
        strategy="afterInteractive"
      />
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  );
}
