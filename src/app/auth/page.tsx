"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  // State to toggle between Login and Sign Up mode
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (isLoginMode) {
        // --- LOGIN FLOW ---
        // FastAPI OAuth2 expects form data (application/x-www-form-urlencoded)
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const response = await fetch("http://localhost:8000/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        if (response.ok) {
          const data = await response.json();
          // Save the JWT token in LocalStorage for future API calls
          localStorage.setItem("token", data.access_token);
          router.push("/photographer-dashboard");
        } else {
          const errData = await response.json();
          setError(errData.detail || "Invalid email or password");
        }
      } else {
        // --- SIGN UP FLOW ---
        // FastAPI /signup expects JSON data
        const response = await fetch("http://localhost:8000/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          setSuccessMsg("Account created! You can now log in.");
          setIsLoginMode(true); // Switch to login view
          setPassword(""); // Clear password for security
        } else {
          const errData = await response.json();
          setError(errData.detail || "Failed to create account");
        }
      }
    } catch (err) {
      setError("Network error. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

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
              ? "Enter your credentials to access your studio."
              : "Sign up to start sharing AI-powered photos."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              placeholder="studio@scanme.com"
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
    </main>
  );
}