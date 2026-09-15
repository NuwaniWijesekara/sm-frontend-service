"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSubscription, fetchPackages, AdminPackage } from "@/services/api";
import Toast from "@/components/ui/Toast";
import { Crown, Zap, Sparkles, Check, ArrowLeft, Package as PackageIcon } from "lucide-react";

/* ── Plan interface ────────────────────────────────────────── */
export interface Plan {
  id: string; // package UUID
  package_id: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  icon: React.ReactNode;
  features: string[];
  popular?: boolean;
  cta: string | null; // null = no upgrade button (free plan)
}

/* ── Package Mapper Helper ──────────────────────────────────── */
const mapPackageToPlan = (pkg: AdminPackage): Plan => {
  const nameLower = pkg.name.toLowerCase();
  const isFree = pkg.price === 0 || nameLower === "free" || nameLower === "basic";

  let tagline = "Flexible plan tailored for your needs";
  let icon = <Zap className="w-6 h-6" />;
  let popular = false;

  if (nameLower.includes("pro")) {
    tagline = "For professional photographers";
    icon = <Crown className="w-6 h-6" />;
    popular = true;
  } else if (nameLower.includes("enterprise")) {
    tagline = "For studios & agencies";
    icon = <Sparkles className="w-6 h-6" />;
  } else if (isFree) {
    tagline = "Perfect for trying out ScanMe";
    icon = <Zap className="w-6 h-6" />;
  } else {
    icon = <PackageIcon className="w-6 h-6" />;
  }

  return {
    id: pkg.id,
    package_id: pkg.id,
    name: pkg.name,
    price: isFree ? "Free" : `$${pkg.price.toFixed(pkg.price % 1 === 0 ? 0 : 2)}`,
    period: isFree ? "" : `/${pkg.billing_cycle === "monthly" ? "mo" : "yr"}`,
    tagline,
    icon,
    features: pkg.features && pkg.features.length > 0 ? pkg.features : ["Standard features"],
    popular,
    cta: isFree ? null : `Upgrade to ${pkg.name}`,
  };
};

/* ── Page component ────────────────────────────────────────── */
export default function SubscriptionPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [fetchingPlans, setFetchingPlans] = useState<boolean>(true);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  useEffect(() => {
    const loadPackages = async () => {
      setFetchingPlans(true);
      try {
        const pkgs = await fetchPackages("scanme");
        const sorted = [...pkgs].sort((a, b) => a.price - b.price);
        const mapped = sorted.map(mapPackageToPlan);
        setPlans(mapped);
      } catch (err: any) {
        console.error("Failed to fetch packages for pricing page", err);
        setToast({
          message: "Unable to load subscription plans from server.",
          type: "error",
        });
      } finally {
        setFetchingPlans(false);
      }
    };

    loadPackages();
  }, []);

  const handleUpgrade = async (plan: Plan) => {
    setLoadingPlanId(plan.id);
    setToast(null);

    try {
      // The subscriber's identity now comes from the caller's JWT (attached
      // automatically by the `api` client) — the backend rejects the request
      // with 401 if the user isn't logged in, rather than silently attaching
      // it to a placeholder account.
      const res = await createSubscription({
        package_id: plan.package_id,
      });

      // Carry plan details along in the query string purely for display on
      // the mock checkout page — the backend's checkout_url only knows the
      // session id, not what to show the user.
      const displayParams = new URLSearchParams({
        plan: plan.name,
        price: plan.price,
        period: plan.period,
      });
      const separator = res.checkout_url.includes("?") ? "&" : "?";
      router.push(`${res.checkout_url}${separator}${displayParams.toString()}`);
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || "Something went wrong. Please try again.";
      setToast({ message: detail, type: "error" });
      setLoadingPlanId(null);
    }
  };

  return (
    <main className="min-h-screen bg-chalk font-body text-ink">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-dim hover:text-ink
                     transition-colors mb-8 group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-2">
            Pricing
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink tracking-tight mb-3">
            Choose Your Plan
          </h1>
          <p className="text-dim max-w-lg mx-auto leading-relaxed">
            Unlock the full potential of ScanMe. Upgrade anytime — downgrade
            whenever you need.
          </p>
        </div>
      </div>

      {/* ── Cards / Loading State ────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        {fetchingPlans ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-ink border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-dim">Loading available plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-2xl border border-border p-8 max-w-md mx-auto">
            <PackageIcon className="w-10 h-10 text-dim/60 mx-auto mb-3" />
            <h3 className="font-display text-lg font-bold">No Plans Available</h3>
            <p className="text-sm text-dim mt-1">
              There are currently no active subscription packages found.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan, idx) => {
              const isLoading = loadingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`
                    relative flex flex-col rounded-2xl border p-8
                    transition-all duration-300 hover:-translate-y-1
                    ${
                      plan.popular
                        ? "bg-ink text-chalk border-ink shadow-xl shadow-ink/10 scale-[1.03] z-10"
                        : "bg-surface text-ink border-border hover:shadow-sm"
                    }
                  `}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <span
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2
                                 bg-accent text-ink text-[11px] font-bold uppercase tracking-wider
                                 px-4 py-1 rounded-full shadow-sm"
                    >
                      Most Popular
                    </span>
                  )}

                  {/* Icon + Name */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className={`
                        w-11 h-11 rounded-xl flex items-center justify-center
                        ${
                          plan.popular
                            ? "bg-chalk/10 text-accent"
                            : "bg-chalk border border-border text-accent-dark"
                        }
                      `}
                    >
                      {plan.icon}
                    </div>
                    <h2 className="font-display text-xl font-bold">{plan.name}</h2>
                  </div>

                  {/* Price */}
                  <div className="mb-1">
                    <span className="font-display text-4xl font-bold tracking-tight">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span
                        className={`text-sm ml-1 ${
                          plan.popular ? "text-chalk/60" : "text-dim"
                        }`}
                      >
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm mb-7 ${
                      plan.popular ? "text-chalk/60" : "text-dim"
                    }`}
                  >
                    {plan.tagline}
                  </p>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            plan.popular ? "text-accent" : "text-success"
                          }`}
                        />
                        <span
                          className={
                            plan.popular ? "text-chalk/90" : "text-ink/80"
                          }
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {plan.cta ? (
                    <button
                      id={`upgrade-${plan.name.toLowerCase()}-btn`}
                      disabled={isLoading}
                      onClick={() => handleUpgrade(plan)}
                      className={`
                        w-full py-3.5 rounded-xl text-sm font-semibold
                        transition-all duration-200 cursor-pointer
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2
                        ${
                          plan.popular
                            ? "bg-accent text-ink hover:bg-accent-dark hover:-translate-y-0.5 shadow-sm"
                            : "bg-ink text-chalk hover:bg-ink/80 hover:-translate-y-0.5"
                        }
                      `}
                    >
                      {isLoading ? (
                        <>
                          <span
                            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                            aria-hidden
                          />
                          Processing…
                        </>
                      ) : (
                        plan.cta
                      )}
                    </button>
                  ) : (
                    <div
                      className="w-full py-3.5 rounded-xl text-sm font-semibold text-center
                                 bg-chalk border border-border text-dim cursor-default"
                    >
                      Current Plan
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Toast notification ─────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </main>
  );
}
