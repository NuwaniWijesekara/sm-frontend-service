"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CreditCard,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { confirmDummyPayment } from "@/services/api";

export default function DummyCheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-chalk flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-ink border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <DummyCheckoutView />
    </Suspense>
  );
}

function DummyCheckoutView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("session_id");
  const planName = searchParams.get("plan") || "Subscription";
  const price = searchParams.get("price") || "";
  const period = searchParams.get("period") || "";

  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!sessionId) return;
    setStatus("processing");
    setError("");
    try {
      await confirmDummyPayment(sessionId);
      setStatus("success");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || "Payment confirmation failed. Please try again."
      );
      setStatus("error");
    }
  };

  if (!sessionId) {
    return (
      <main className="min-h-screen bg-chalk flex items-center justify-center p-6 font-body">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl shadow-sm p-10 text-center space-y-5">
          <div className="w-14 h-14 bg-danger/10 border border-danger/20 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-danger" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Invalid Checkout Link</h1>
            <p className="text-dim text-sm mt-2">
              This checkout session is missing or malformed. Please start again from the
              pricing page.
            </p>
          </div>
          <Link
            href="/subscription-plans"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl text-chalk font-semibold bg-ink hover:bg-ink/80 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Plans
          </Link>
        </div>
      </main>
    );
  }

  if (status === "success") {
    return (
      <main className="min-h-screen bg-chalk flex items-center justify-center p-6 font-body">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl shadow-sm p-10 text-center space-y-5 animate-fade-up">
          <div className="w-16 h-16 bg-success/10 border border-success/20 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Payment Successful!</h1>
            <p className="text-dim text-sm mt-2">
              Your {planName} subscription is now active. Welcome aboard!
            </p>
          </div>
          <button
            onClick={() => router.push("/photographer-dashboard")}
            className="w-full py-3.5 rounded-xl text-chalk font-semibold bg-ink hover:bg-ink/80 transition-all cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-chalk flex items-center justify-center p-6 font-body">
      <div className="max-w-md w-full bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-ink text-chalk px-8 py-7 text-center">
          <div className="w-12 h-12 bg-chalk/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6 text-accent" />
          </div>
          <h1 className="font-display text-xl font-bold">Mock Payment Gateway</h1>
          <p className="text-chalk/60 text-xs mt-1">
            Simulated checkout for local testing — no real payment provider is involved.
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Order summary */}
          <div className="bg-chalk/50 border border-border rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dim">Plan</span>
              <span className="font-semibold text-ink">{planName}</span>
            </div>
            {price && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-dim">Amount</span>
                <span className="font-semibold text-ink">
                  {price}
                  {period}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border/60">
              <span className="text-dim">Session ID</span>
              <span className="font-mono text-[11px] text-dim truncate max-w-[180px]" title={sessionId}>
                {sessionId}
              </span>
            </div>
          </div>

          {status === "error" && error && (
            <div className="p-3 bg-danger/10 text-danger border border-danger/20 rounded-xl text-sm font-medium text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={status === "processing"}
            className="w-full py-3.5 rounded-xl text-chalk font-semibold bg-ink hover:bg-ink/80
                       disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {status === "processing" ? (
              <>
                <span className="w-4 h-4 border-2 border-chalk border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Confirm Payment
              </>
            )}
          </button>

          <p className="text-[11px] text-dim text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            No real money moves here — this stands in for a real gateway during development.
          </p>
        </div>
      </div>
    </main>
  );
}
