"use client";
import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, Globe, Lock } from "lucide-react";
import { fetchOwnerGallery, fetchSavedFaces, OwnerGalleryData, SavedFace } from "@/services/api";
import { useSelfieMatch } from "@/hooks/useSelfieMatch";
import EventHeader from "@/components/event/EventHeader";
import PhotoGallery from "@/components/event/PhotoGallary";
import SelfiePanel from "@/components/selfie/SelfiePanel";
import Spinner from "@/components/ui/Spinner";

interface Props {
  params: Promise<{ id: string }>;
}

type LoadState = "loading" | "ready" | "forbidden" | "not_found" | "error";

// Owner view of an event's photos inside the photographer portal. Photos come
// from sm-photographer-service (owner-only), so this works for invite-only
// events without any guest-side sign-in; the selfie filter goes through
// sm-guest-service, which always lets the owner through.
export default function OwnerEventGalleryPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<OwnerGalleryData | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.replace("/auth?redirect=" + encodeURIComponent(`/dashboard/events/${id}`));
      return;
    }
    let cancelled = false;
    fetchOwnerGallery(id)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 401) {
          localStorage.removeItem("token");
          router.replace("/auth?redirect=" + encodeURIComponent(`/dashboard/events/${id}`));
          return;
        }
        setState(status === 403 ? "forbidden" : status === 404 ? "not_found" : "error");
      });
    return () => { cancelled = true; };
  }, [id, router]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chalk">
        <Spinner size="lg" />
      </div>
    );
  }

  if (state !== "ready" || !data) {
    const message = {
      forbidden: "Only the event owner can view this page. Use the guest link to view a shared event.",
      not_found: "This event doesn't exist or was deleted.",
      error: "Could not load the event. Check your connection and try again.",
    }[state as "forbidden" | "not_found" | "error"];
    return (
      <div className="min-h-screen flex items-center justify-center bg-chalk px-6">
        <div className="text-center max-w-sm">
          <p className="text-dim text-sm leading-relaxed mb-5">{message}</p>
          <Link href="/dashboard" className="px-6 py-3 bg-ink text-chalk rounded-xl text-sm font-semibold hover:bg-ink/80">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <OwnerGallery data={data} />;
}

function OwnerGallery({ data }: { data: OwnerGalleryData }) {
  const { event, photos } = data;
  const matchKey = event.qr_token || event.id;
  const { status, statusLabel, results, error, uploadPct, runMatch, reset } = useSelfieMatch(matchKey);
  const [savedFaces, setSavedFaces] = useState<SavedFace[]>([]);
  const inviteOnly = event.access_mode === "invite_only";

  useEffect(() => {
    fetchSavedFaces().then(setSavedFaces).catch(() => setSavedFaces([]));
  }, []);

  return (
    <main className="min-h-screen bg-chalk">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold text-dim hover:text-accent-dark transition-colors bg-surface hover:bg-accent/10 border border-border hover:border-accent/30 px-3.5 py-2 rounded-xl shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink bg-surface border border-border px-3 py-1.5 rounded-full">
            {inviteOnly ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
            {inviteOnly ? "Invite-only gallery" : "Public gallery"} · Owner view
          </span>
        </div>

        <EventHeader event={{ ...event, total_photos: photos.length }} />

        <div className="mt-8 flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <PhotoGallery photos={photos} matchedResults={results} />
          </div>
          <aside className="w-full lg:w-80 xl:w-96 shrink-0">
            <div className="lg:sticky lg:top-6">
              <SelfiePanel
                eventId={matchKey}
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
    </main>
  );
}
