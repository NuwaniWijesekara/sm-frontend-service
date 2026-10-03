"use client";
import { useEffect, useRef } from "react";
import Script from "next/script";
import { loginGoogle } from "@/services/api";

interface Props {
  /** Called with our own access token once the backend accepts the Google credential. */
  onSuccess: (token: string) => void;
  onError: (message: string) => void;
  /** Toggled around the backend call so the caller can show a busy state. */
  onLoadingChange?: (loading: boolean) => void;
  width?: number;
}

/**
 * Google Identity Services button → POST /auth/google → our JWT.
 *
 * Renders into its own ref'd container (not a fixed element id), so it can be
 * used on any page — the dashboard login and the guest gallery's Google-only
 * sign-in both use this.
 */
export default function GoogleSignInButton({ onSuccess, onError, onLoadingChange, width = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // GSI keeps the callback from initialize(); route it through a ref so it
  // always reaches the latest props.
  const handlers = useRef({ onSuccess, onError, onLoadingChange });
  handlers.current = { onSuccess, onError, onLoadingChange };

  const handleCredential = async (response: { credential?: string }) => {
    const { onSuccess, onError, onLoadingChange } = handlers.current;
    if (!response?.credential) {
      onError("Google sign-in didn't complete. Please try again.");
      return;
    }
    onLoadingChange?.(true);
    try {
      onSuccess(await loginGoogle(response.credential));
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      onError(typeof detail === "string" ? detail : "Google sign-in failed. Please try again.");
    } finally {
      onLoadingChange?.(false);
    }
  };

  const render = () => {
    const google = (window as any).google;
    if (!google?.accounts?.id || !containerRef.current) return;
    google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      callback: handleCredential,
    });
    google.accounts.id.renderButton(containerRef.current, {
      theme: "outline",
      size: "large",
      width,
      shape: "rectangular",
      text: "signin_with",
    });
  };

  // Covers the script having already loaded (e.g. client-side navigation);
  // otherwise <Script onLoad> below renders it once the script arrives.
  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div ref={containerRef} className="w-full flex justify-center min-h-[44px]" />
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={render} />
    </>
  );
}
