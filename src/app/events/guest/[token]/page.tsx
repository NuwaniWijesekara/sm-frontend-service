"use client";
import React, { use } from "react";
import { useEventData } from "@/hooks/useEventData";
import { useSelfieMatch } from "@/hooks/useSelfieMatch";
import EventHeader from "@/components/event/EventHeader";
import SelfiePanel from "@/components/selfie/SelfiePanel";
import Spinner from "@/components/ui/Spinner";
import PhotoGallery from "@/components/event/PhotoGallary";

interface Props {
  params: Promise<{ token: string }>;
}

export default function EventPage({ params }: Props) {
  const { token } = use(params);
  const { data, status } = useEventData(token);

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

  return <EventView token={token} data={data} />;
}

function EventView({
  token,
  data,
}: {
  token: string;
  data: NonNullable<ReturnType<typeof useEventData>["data"]>;
}) {
  const { status, statusLabel, results, error, uploadPct, runMatch, reset } =
    useSelfieMatch(data.event.id);

  return (
    <main className="min-h-screen bg-chalk">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        <EventHeader event={data.event} />

        <div className="mt-8 flex flex-col lg:flex-row gap-8">

          <div className="flex-1 min-w-0">
            <PhotoGallery photos={data.photos} matchedResults={results} />
          </div>

          <aside className="w-full lg:w-80 xl:w-96 shrink-0">
            <div className="lg:sticky lg:top-6">
              <SelfiePanel
                eventId={data.event.id}
                status={status}
                statusLabel={statusLabel}
                results={results}
                error={error}
                uploadPct={uploadPct}
                onRunMatch={runMatch}
                onReset={reset}
              />
            </div>
          </aside>

        </div>

        <footer className="mt-16 pb-8 text-center text-[11px] text-dim">
          Powered by Scan Me · Your selfie is never stored
        </footer>
      </div>
    </main>
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