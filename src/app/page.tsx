"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { guestLogin, guestRegister, guestLoginAnonymous, guestLoginGoogle } from "@/services/api";
import { Camera, User, Lock, ArrowRight, UserPlus, Shield, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"anonymous" | "login" | "register">("anonymous");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGuestToken, setHasGuestToken] = useState(false);
  const [hasPhotoToken, setHasPhotoToken] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasGuestToken(!!localStorage.getItem("guest_token"));
      setHasPhotoToken(!!localStorage.getItem("token"));
    }
  }, []);

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
      localStorage.setItem("guest_token", token);
      setSuccess("Successfully logged in!");
      router.push("/guest-dashboard");
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
      localStorage.setItem("guest_token", token);
      router.push("/guest-dashboard");
    } catch (err: any) {
      setError("Failed to create temporary session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    console.log("Google response received:", response);
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (!response.credential) {
        throw new Error("No credential returned from Google login.");
      }
      const token = await guestLoginGoogle(response.credential);
      localStorage.setItem("guest_token", token);
      setSuccess("Successfully logged in with Google!");
      router.push("/guest-dashboard");
    } catch (err: any) {
      console.error("Google OAuth error:", err);
      const apiError = err.response?.data?.detail;
      setError(apiError || "Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const initGoogle = () => {
    if (typeof window !== "undefined" && (window as any).google) {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
      console.log("Initializing Google OAuth with client_id:", clientId);
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
  }, [activeTab]);

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

        {hasPhotoToken ? (
          <Link
            href="/photographer-dashboard"
            className="text-xs font-semibold px-4 py-2 bg-surface border border-border hover:border-accent hover:text-accent-dark rounded-lg transition shadow-sm"
          >
            Studio Dashboard →
          </Link>
        ) : (
          <Link
            href="/auth"
            className="text-xs font-semibold text-dim hover:text-ink transition"
          >
            Photographer Portal
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
            Welcome to ScanMe AI. Choose a saved face or upload a new selfie to search through event photos in seconds.
          </p>

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

        {/* Right Column - Tabs Portal */}
        <div className="lg:col-span-6">
          <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
            
            {/* Header Tabs */}
            <div className="flex bg-chalk p-1 rounded-xl mb-6 border border-border">
              <button
                type="button"
                onClick={() => { setActiveTab("anonymous"); setError(""); setSuccess(""); setFieldErrors({}); }}
                className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition ${activeTab === "anonymous" ? "bg-surface text-ink shadow-sm" : "text-dim hover:text-ink"}`}
              >
                Instant Access
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("login"); setError(""); setSuccess(""); setFieldErrors({}); }}
                className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition ${activeTab === "login" ? "bg-surface text-ink shadow-sm" : "text-dim hover:text-ink"}`}
              >
                Guest Login
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("register"); setError(""); setSuccess(""); setFieldErrors({}); }}
                className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold transition ${activeTab === "register" ? "bg-surface text-ink shadow-sm" : "text-dim hover:text-ink"}`}
              >
                Register
              </button>
            </div>

            {/* Error / Success Banners */}
            {error && (
              <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs flex gap-2 items-start mb-6">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            {success && (
              <div className="p-4 bg-success/10 border border-success/20 text-success rounded-xl text-xs flex gap-2 items-start mb-6">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{success}</span>
              </div>
            )}

            {/* Tab contents */}
            {activeTab === "anonymous" ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto w-14 h-14 bg-chalk rounded-full flex items-center justify-center border border-border">
                  <Sparkles className="w-6 h-6 text-accent-dark" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-ink">Quick Access Mode</h3>
                  <p className="text-xs text-dim leading-relaxed max-w-sm mx-auto">
                    Skip registration and search photo events instantly. Note: Your search history and uploads are temporary and will be deleted in 24 hours.
                  </p>
                </div>

                <div className="pt-2">
                  {hasGuestToken ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => router.push("/guest-dashboard")}
                        className="w-full py-3.5 rounded-xl font-bold bg-ink text-chalk hover:bg-ink/80 hover:-translate-y-0.5 active:scale-[0.99] transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
                      >
                        Enter Guest Dashboard <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleAnonymousGuest}
                        className="w-full py-3 text-xs font-semibold text-dim hover:text-ink transition"
                      >
                        Create another temporary session
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleAnonymousGuest}
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl font-bold bg-ink text-chalk hover:bg-ink/80 hover:-translate-y-0.5 active:scale-[0.99] transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
                    >
                      {loading ? "Starting session..." : "Continue as Guest"} <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ) : activeTab === "login" ? (
              <form onSubmit={handleGuestLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-ink tracking-wider mb-2 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-4 h-4 text-dim" />
                    <input
                      type="email"
                      required
                      placeholder="guest@mail.com"
                      className={`w-full pl-12 pr-4 py-3 bg-chalk border ${fieldErrors.email ? "border-danger focus:ring-danger" : "border-border focus:ring-accent"} rounded-xl outline-none text-sm transition text-ink font-medium placeholder:text-dim`}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                      }}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-danger text-xs mt-1.5 ml-1 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink tracking-wider mb-2 ml-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-4 h-4 text-dim" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className={`w-full pl-12 pr-4 py-3 bg-chalk border ${fieldErrors.password ? "border-danger focus:ring-danger" : "border-border focus:ring-accent"} rounded-xl outline-none text-sm transition text-ink font-medium placeholder:text-dim`}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                      }}
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="text-danger text-xs mt-1.5 ml-1 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 mt-2 rounded-xl font-semibold bg-ink text-chalk hover:bg-ink/80 hover:-translate-y-0.5 transition-all text-sm shadow-sm"
                >
                  {loading ? "Logging in..." : "Login to Guest Account"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleGuestRegister} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-ink tracking-wider mb-2 ml-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-4 h-4 text-dim" />
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      className={`w-full pl-12 pr-4 py-3 bg-chalk border ${fieldErrors.name ? "border-danger focus:ring-danger" : "border-border focus:ring-accent"} rounded-xl outline-none text-sm transition text-ink font-medium placeholder:text-dim`}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                      }}
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-danger text-xs mt-1.5 ml-1 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink tracking-wider mb-2 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-4 h-4 text-dim" />
                    <input
                      type="email"
                      required
                      placeholder="guest@mail.com"
                      className={`w-full pl-12 pr-4 py-3 bg-chalk border ${fieldErrors.email ? "border-danger focus:ring-danger" : "border-border focus:ring-accent"} rounded-xl outline-none text-sm transition text-ink font-medium placeholder:text-dim`}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                      }}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-danger text-xs mt-1.5 ml-1 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink tracking-wider mb-2 ml-1">
                    Create Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-4 h-4 text-dim" />
                    <input
                      type="password"
                      required
                      placeholder="Min. 8 characters"
                      className={`w-full pl-12 pr-4 py-3 bg-chalk border ${fieldErrors.password ? "border-danger focus:ring-danger" : "border-border focus:ring-accent"} rounded-xl outline-none text-sm transition text-ink font-medium placeholder:text-dim`}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                      }}
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="text-danger text-xs mt-1.5 ml-1 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 mt-2 rounded-xl font-semibold bg-ink text-chalk hover:bg-ink/80 hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  {loading ? "Creating account..." : "Register Guest Account"}
                </button>
              </form>
            )}

            {/* Google OAuth Section */}
            {activeTab !== "anonymous" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-[1px] bg-border" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-dim">Or continue with</span>
                  <div className="flex-1 h-[1px] bg-border" />
                </div>

                <div id="google-login-btn" className="w-full flex justify-center min-h-[44px]" />
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

      {/* Load Google Client Script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={initGoogle}
        strategy="afterInteractive"
      />
    </main>
  );
}