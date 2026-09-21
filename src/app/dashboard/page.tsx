"use client";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  checkUsernameAvailability,
  fetchSubscriptions,
  fetchSharedEvents,
  bulkAddCollaborators,
  addCollaborator,
  fetchCollaborators,
  removeCollaborator,
  updateCollaboratorPermission,
  SubscriptionResponse,
  SharedEventData,
  BulkImportResponse,
  CollaboratorPermission,
  Collaborator,
} from "@/services/api";

interface EventData {
  id: string;
  name: string;
  drive_url: string;
  status: string;
  username?: string;
  qr_token?: string;
  owner_id?: string;
}

type DashboardTab = "my-events" | "shared";

const PERMISSION_LABELS: Record<string, string> = {
  VIEW_ONLY: "View Only",
  CAN_UPLOAD: "Can Upload",
  ADMIN: "Admin",
};

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>("my-events");
  const [events, setEvents] = useState<EventData[]>([]);
  const [sharedEvents, setSharedEvents] = useState<SharedEventData[]>([]);
  const [sharedLoading, setSharedLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventUsername, setEventUsername] = useState("");
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTargetEvent, setDeleteTargetEvent] = useState<EventData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [activeSubscription, setActiveSubscription] = useState<SubscriptionResponse | null>(null);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [collaboratorsTargetEvent, setCollaboratorsTargetEvent] = useState<EventData | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkImportResponse | null>(null);
  const [bulkError, setBulkError] = useState("");
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const [manualEmail, setManualEmail] = useState("");
  const [manualPermission, setManualPermission] = useState<CollaboratorPermission>("VIEW_ONLY");
  const [manualAdding, setManualAdding] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");
  const [collaboratorsList, setCollaboratorsList] = useState<Collaborator[]>([]);
  const [collaboratorsListLoading, setCollaboratorsListLoading] = useState(false);
  const [collaboratorsListError, setCollaboratorsListError] = useState("");
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [roleUpdatedUserId, setRoleUpdatedUserId] = useState<string | null>(null);
  const getToken = () => localStorage.getItem("token");

  // Best-effort: decode the caller's own user id out of their JWT — used to
  // tell whether the person viewing "Manage Collaborators" is the event
  // owner (full control) or just an ADMIN collaborator (read-only list).
  const getCurrentUserId = (): string | null => {
    const token = getToken();
    if (!token) return null;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      return payload.sub || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!eventUsername.trim()) {
      setUsernameCheckStatus("idle");
      setUsernameMessage("");
      return;
    }
    setUsernameCheckStatus("checking");
    setUsernameMessage("Checking availability...");

    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(
          eventUsername,
          modalMode === "EDIT" ? editingEventId || undefined : undefined
        );
        if (res.available) {
          setUsernameCheckStatus("available");
          setUsernameMessage("Username is available!");
        } else {
          setUsernameCheckStatus("taken");
          setUsernameMessage("Username is already taken");
        }
      } catch (e) {
        setUsernameCheckStatus("idle");
        setUsernameMessage("");
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [eventUsername, modalMode, editingEventId]);

  const loadEvents = async () => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (error: any) {
      console.warn("Failed to sync events:", error?.message || error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/auth");
      }
    } finally {
      setLoading(false);
    }
  };

  // Best-effort: decode the user's own user id out of their JWT so we
  // can ask the subscription-service (via the gateway) whether they have an
  // active plan. No signature verification here — this only drives what
  // badge/banner to show; the backend independently enforces real access.
  const loadSubscription = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      const userId = payload.sub;
      if (!userId) return;

      // subscription-service always resolves to an active subscription now —
      // real if the user bought one, otherwise a virtual one against
      // whatever package is configured as the Free tier — so `active` here
      // is effectively "the user's current plan," not "whether they paid."
      const subs = await fetchSubscriptions(userId);
      const active = subs.find((s) => s.status.toLowerCase() === "active") || null;
      setActiveSubscription(active);
    } catch (err: any) {
      // A 404 here now only means the backend has no Free package configured
      // at all (a config error, not a normal free-user case) — anything
      // else, just fall back to "no active subscription" for display purposes.
      setActiveSubscription(null);
    } finally {
      setSubscriptionChecked(true);
    }
  };

  const loadSharedEvents = async () => {
    try {
      const data = await fetchSharedEvents();
      setSharedEvents(data);
    } catch (error: any) {
      console.warn("Failed to load shared events:", error?.message || error);
    } finally {
      setSharedLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }
    loadEvents();
    loadSubscription();
    loadSharedEvents();
    if (isFormModalOpen) return;
    const interval = setInterval(loadEvents, 8000);
    return () => clearInterval(interval);
  }, [router, isFormModalOpen]);

  const loadCollaboratorsList = async (eventId: string) => {
    setCollaboratorsListLoading(true);
    setCollaboratorsListError("");
    try {
      const list = await fetchCollaborators(eventId);
      setCollaboratorsList(list);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setCollaboratorsListError(typeof detail === "string" ? detail : "Failed to load collaborators.");
    } finally {
      setCollaboratorsListLoading(false);
    }
  };

  const openCollaboratorsModal = (event: EventData) => {
    setCollaboratorsTargetEvent(event);
    setBulkResult(null);
    setBulkError("");
    setManualEmail("");
    setManualPermission("VIEW_ONLY");
    setManualError("");
    setManualSuccess("");
    setCollaboratorsList([]);
    setCollaboratorsListError("");
    loadCollaboratorsList(event.id);
  };

  const closeCollaboratorsModal = () => {
    if (bulkUploading || manualAdding) return;
    setCollaboratorsTargetEvent(null);
    setBulkResult(null);
    setBulkError("");
    setManualError("");
    setManualSuccess("");
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaboratorsTargetEvent || !manualEmail.trim()) return;

    setManualAdding(true);
    setManualError("");
    setManualSuccess("");
    try {
      const result = await addCollaborator(collaboratorsTargetEvent.id, manualEmail.trim(), manualPermission);
      setManualSuccess(`${result.email} added as ${PERMISSION_LABELS[result.permission] || result.permission}.`);
      setManualEmail("");
      loadCollaboratorsList(collaboratorsTargetEvent.id);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setManualError(
        typeof detail === "string" ? detail : "Failed to add collaborator. Please check the email and try again."
      );
    } finally {
      setManualAdding(false);
    }
  };

  const handleRemoveCollaborator = async (targetUserId: string) => {
    if (!collaboratorsTargetEvent) return;
    setRemovingUserId(targetUserId);
    setCollaboratorsListError("");
    try {
      await removeCollaborator(collaboratorsTargetEvent.id, targetUserId);
      setCollaboratorsList((prev) => prev.filter((c) => c.user_id !== targetUserId));
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setCollaboratorsListError(typeof detail === "string" ? detail : "Failed to remove collaborator.");
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleUpdateCollaboratorPermission = async (targetUserId: string, permission: CollaboratorPermission) => {
    if (!collaboratorsTargetEvent) return;
    setUpdatingUserId(targetUserId);
    setCollaboratorsListError("");
    setRoleUpdatedUserId(null);
    try {
      const updated = await updateCollaboratorPermission(collaboratorsTargetEvent.id, targetUserId, permission);
      setCollaboratorsList((prev) =>
        prev.map((c) => (c.user_id === targetUserId ? { ...c, permission: updated.permission } : c))
      );
      setRoleUpdatedUserId(targetUserId);
      setTimeout(() => setRoleUpdatedUserId((cur) => (cur === targetUserId ? null : cur)), 2000);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setCollaboratorsListError(typeof detail === "string" ? detail : "Failed to update role.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleBulkFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file || !collaboratorsTargetEvent) return;

    setBulkUploading(true);
    setBulkError("");
    setBulkResult(null);
    try {
      const result = await bulkAddCollaborators(collaboratorsTargetEvent.id, file);
      setBulkResult(result);
      loadCollaboratorsList(collaboratorsTargetEvent.id);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setBulkError(detail || "Failed to import collaborators. Please check the file and try again.");
    } finally {
      setBulkUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const getGuestLink = (event: EventData) => {
    const key = event.qr_token || event.id;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return `${origin}/events/guest/${key}`;
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openCreateModal = () => {
    setModalMode("CREATE");
    setEventName("");
    setEventUsername("");
    setUsernameCheckStatus("idle");
    setUsernameMessage("");
    driveUrl && setDriveUrl("");
    setFormError("");
    setIsFormModalOpen(true);
  };

  const openEditModal = (event: EventData) => {
    setModalMode("EDIT");
    setEditingEventId(event.id);
    setEventName(event.name);
    setEventUsername(event.username || "");
    setUsernameCheckStatus("idle");
    setUsernameMessage("");
    setDriveUrl(event.drive_url);
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventUsername.trim()) {
      setFormError("Collection username is required.");
      return;
    }
    if (usernameCheckStatus === "taken") {
      setFormError("Collection username is already taken. Please choose another.");
      return;
    }

    setFormLoading(true);
    setFormError("");

    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    try {
      if (modalMode === "CREATE") {
        await createEvent(eventName, driveUrl, eventUsername);
      } else {
        await updateEvent(editingEventId!, eventName, driveUrl, eventUsername);
      }
      setIsFormModalOpen(false);
      loadEvents();
    } catch (error) {
      // Log a plain string, never the raw Error/AxiosError instance — Next's
      // dev overlay hooks console.error and surfaces any Error object passed
      // to it as an "Issue" even though it's already fully handled here, which
      // is what made this look like an unhandled rejection. The inline
      // formError below (rendered right above the submit button) is the only
      // UI surface this failure should ever reach — a bottom-of-screen toast
      // reads as disconnected from the modal the user is actually looking at.
      const isForbidden = axios.isAxiosError(error) && error.response?.status === 403;
      console.warn(
        `[handleFormSubmit] ${modalMode} event failed (${isForbidden ? 403 : "error"}):`,
        axios.isAxiosError(error) ? error.message : String(error)
      );

      // A 403 here means the backend's plan-limit check rejected the create
      // (see sm-photographer-service's max_events enforcement) — a normal,
      // expected outcome, not a bug, so it gets its own friendly message
      // instead of falling into the generic failure message below.
      if (isForbidden) {
        const detail = error.response?.data?.detail;
        setFormError(detail || "Event limit reached. Please upgrade your package.");
      } else {
        setFormError(modalMode === "CREATE" ? "Failed to create event." : "Failed to update event.");
      }
      setFormLoading(false);
      return;
    }
    setFormLoading(false);
  };

  const openDeleteModal = (event: EventData) => {
    setDeleteTargetEvent(event);
    setDeleteError("");
  };

  const confirmDeleteEvent = async () => {
    if (!deleteTargetEvent) return;
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      await deleteEvent(deleteTargetEvent.id);
      setDeleteTargetEvent(null);
      loadEvents();
    } catch (error: any) {
      console.error("Delete error:", error);
      const detail = error?.response?.data?.detail;
      setDeleteError(detail || "Failed to delete the event.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-chalk p-8 font-body">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-border pb-6">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-1">
              Event Dashboard
            </p>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-ink tracking-tight">
                Dashboard
              </h1>
              {activeSubscription && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px]
                             font-bold uppercase tracking-wider bg-accent/15 text-accent-dark
                             border border-accent/30 shadow-xs shrink-0"
                  title={`Active subscription: ${activeSubscription.package?.name || "Pro"}`}
                >
                  ✦ {activeSubscription.package?.name || "Pro"}
                </span>
              )}
            </div>
            <p className="text-dim text-sm mt-1">
              Manage the events you created, and see what's been shared with you.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 text-sm font-semibold text-dim hover:text-danger
                         bg-surface hover:bg-danger/10 border border-border hover:border-danger/30
                         rounded-xl transition-colors"
            >
              Logout
            </button>
            {subscriptionChecked &&
              (!activeSubscription ||
                activeSubscription.package?.price === 0 ||
                activeSubscription.package?.name?.toLowerCase() === "free") && (
              <Link
                href="/subscription-plans"
                className="px-5 py-2.5 text-sm font-semibold text-accent-dark
                           bg-accent/10 hover:bg-accent/20 border border-accent/30 hover:border-accent/50
                           rounded-xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-1.5"
              >
                ✦ Upgrade to Pro
              </Link>
            )}
            {activeTab === "my-events" && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold
                           text-chalk bg-ink border border-transparent rounded-xl
                           hover:bg-ink/80 transition-all hover:-translate-y-0.5"
              >
                <span className="mr-2 text-base">+</span> Create Event
              </button>
            )}
          </div>
        </div>

        <div className="flex bg-surface p-1 rounded-xl mb-8 border border-border max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab("my-events")}
            className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition ${
              activeTab === "my-events" ? "bg-ink text-chalk shadow-sm" : "text-dim hover:text-ink"
            }`}
          >
            My Events
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shared")}
            className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition ${
              activeTab === "shared" ? "bg-ink text-chalk shadow-sm" : "text-dim hover:text-ink"
            }`}
          >
            Shared with Me
          </button>
        </div>

        {activeTab === "my-events" ? (
          loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-10 h-10 border-4 border-border border-t-accent rounded-full animate-spin" />
              <p className="text-dim font-medium animate-pulse-soft">Syncing your events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-12 text-center">
              <div className="w-20 h-20 bg-chalk border border-border rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📸</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-ink mb-2">No Events Yet</h2>
              <p className="text-dim max-w-md mx-auto">
                Click the button above to start your first AI photo sync.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-surface border border-border p-6 rounded-2xl
                             hover:-translate-y-1 hover:shadow-sm transition-all duration-300
                             flex flex-col group relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                      onClick={() => openCollaboratorsModal(ev)}
                      className="w-8 h-8 flex items-center justify-center bg-chalk border border-border
                                 rounded-lg text-dim hover:text-accent-dark transition-colors"
                      title="Manage Collaborators"
                    >
                      👥
                    </button>
                    <button
                      onClick={() => openEditModal(ev)}
                      className="w-8 h-8 flex items-center justify-center bg-chalk border border-border
                                 rounded-lg text-dim hover:text-accent-dark transition-colors"
                      title="Edit Event"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => openDeleteModal(ev)}
                      className="w-8 h-8 flex items-center justify-center bg-chalk border border-border
                                 rounded-lg text-dim hover:text-danger transition-colors"
                      title="Delete Event"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="relative z-10 pr-20">
                    <h2 className="font-display text-xl font-bold text-ink mb-1 truncate" title={ev.name}>
                      {ev.name}
                    </h2>
                    <div className="flex items-center gap-2 mb-5">
                      {ev.username && (
                        <span className="text-xs font-bold text-accent-dark bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-md">
                          @{ev.username}
                        </span>
                      )}
                      <span className="text-xs text-dim font-mono truncate bg-chalk border border-border px-2 py-0.5 rounded-md">
                        ID: {ev.id.split("-")[0]}...
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <span
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
                          ev.status === "ready"
                            ? "bg-success/10 text-success border-success/20"
                            : ev.status === "failed"
                            ? "bg-danger/10 text-danger border-danger/20"
                            : "bg-accent/10 text-accent-dark border-accent/20 animate-pulse-soft"
                        }`}
                      >
                        {ev.status === "ready"
                          ? "✨ READY"
                          : ev.status === "failed"
                          ? "❌ FAILED"
                          : "⏳ PROCESSING"}
                      </span>

                      <a
                        href={ev.drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent-dark text-sm font-medium hover:underline flex items-center transition-colors"
                      >
                        Drive ↗
                      </a>
                    </div>
                  </div>

                  <div className="flex-grow" />

                  {ev.status === "ready" ? (
                    <button
                      onClick={() => setSelectedEvent(ev)}
                      className="w-full relative z-10 mt-4 bg-chalk hover:bg-accent/10
                                 text-ink hover:text-accent-dark border border-border hover:border-accent/30
                                 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
                    >
                      Share with Guests
                    </button>
                  ) : (
                    <div className="w-full mt-4 bg-chalk border border-border py-3 rounded-xl text-sm font-medium text-dim text-center cursor-not-allowed">
                      Processing faces...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : sharedLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-10 h-10 border-4 border-border border-t-accent rounded-full animate-spin" />
            <p className="text-dim font-medium animate-pulse-soft">Loading shared events...</p>
          </div>
        ) : sharedEvents.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-chalk border border-border rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🤝</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-ink mb-2">Nothing Shared Yet</h2>
            <p className="text-dim max-w-md mx-auto">
              Events that other users add you to as a collaborator (with View, Upload, or Admin access) will show up here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sharedEvents.map((ev) => (
              <div
                key={ev.id}
                className="bg-surface border border-border p-6 rounded-2xl flex flex-col relative overflow-hidden"
              >
                <div className="relative z-10">
                  <h2 className="font-display text-xl font-bold text-ink mb-1 truncate" title={ev.name}>
                    {ev.name}
                  </h2>
                  <div className="flex items-center gap-2 mb-5 flex-wrap">
                    {ev.owner_name && (
                      <span className="text-xs text-dim">by {ev.owner_name}</span>
                    )}
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                        ev.permission === "VIEW_ONLY"
                          ? "text-dim bg-chalk border-border"
                          : "text-accent-dark bg-accent/10 border-accent/20"
                      }`}
                    >
                      {PERMISSION_LABELS[ev.permission] || ev.permission}
                    </span>
                  </div>
                </div>
                <div className="flex-grow" />
                <button
                  onClick={() => router.push(`/events/guest/${ev.qr_token || ev.id}`)}
                  className="w-full relative z-10 mt-4 bg-chalk hover:bg-accent/10
                             text-ink hover:text-accent-dark border border-border hover:border-accent/30
                             py-3 rounded-xl text-sm font-semibold transition-all duration-300"
                >
                  Open Event
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isFormModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-surface rounded-2xl shadow-xl max-w-md w-full p-8 relative border border-border transform transition-all">
            <button
              onClick={() => setIsFormModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center
                         bg-chalk text-dim hover:bg-danger/10 hover:text-danger rounded-full transition-colors"
            >
              &times;
            </button>

            <div className="mb-6 text-center">
              <span className="inline-block p-3 bg-chalk border border-border rounded-2xl mb-3">
                <span className="text-2xl">{modalMode === "CREATE" ? "✨" : "✏️"}</span>
              </span>
              <h3 className="font-display text-2xl font-bold text-ink">
                {modalMode === "CREATE" ? "New AI Event" : "Edit Event Details"}
              </h3>
              <p className="text-sm text-dim mt-1">
                {modalMode === "CREATE"
                  ? "Link your Google Drive folder & set a username"
                  : "Modify event details below"}
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5 ml-1">
                  Event Name <span className="text-danger font-semibold text-xs">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-chalk border border-border rounded-xl
                             focus:bg-surface focus:ring-2 focus:ring-accent focus:border-accent
                             outline-none transition-all text-ink font-medium placeholder:text-dim"
                  placeholder="e.g. Nimal's Birthday"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5 ml-1">
                  Collection Username / Handle <span className="text-danger font-semibold text-xs">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-dim text-sm font-bold">@</span>
                  <input
                    type="text"
                    required
                    className={`w-full pl-9 pr-4 py-3 bg-chalk border ${
                      usernameCheckStatus === "available"
                        ? "border-success focus:ring-success"
                        : usernameCheckStatus === "taken"
                        ? "border-danger focus:ring-danger"
                        : "border-border focus:ring-accent"
                    } rounded-xl outline-none transition-all text-ink font-medium placeholder:text-dim text-sm`}
                    placeholder="e.g. nimals-birthday"
                    value={eventUsername}
                    onChange={(e) => setEventUsername(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  />
                </div>
                {usernameMessage ? (
                  <p
                    className={`text-xs mt-1 ml-1 font-bold flex items-center gap-1 ${
                      usernameCheckStatus === "available"
                        ? "text-success"
                        : usernameCheckStatus === "taken"
                        ? "text-danger"
                        : "text-dim animate-pulse"
                    }`}
                  >
                    {usernameMessage}
                  </p>
                ) : (
                  <p className="text-[11px] text-dim mt-1 ml-1">Guests can search by this username instead of using links.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5 ml-1">
                  Google Drive Folder URL <span className="text-danger font-semibold text-xs">*</span>
                </label>
                <input
                  type="url"
                  required
                  className="w-full px-4 py-3 bg-chalk border border-border rounded-xl
                             focus:bg-surface focus:ring-2 focus:ring-accent focus:border-accent
                             outline-none transition-all text-ink font-medium placeholder:text-dim"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                />
              </div>

              {formError && (
                <div className="p-3 bg-danger/10 text-danger border border-danger/20 rounded-xl text-sm font-medium text-center">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={formLoading || usernameCheckStatus === "taken"}
                className="w-full py-3.5 rounded-xl text-chalk font-semibold text-base
                           transition-all bg-ink hover:bg-ink/80 hover:-translate-y-0.5
                           disabled:opacity-40 disabled:hover:translate-y-0 cursor-pointer disabled:cursor-not-allowed"
              >
                {formLoading ? "Saving..." : modalMode === "CREATE" ? "Create Event" : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-surface rounded-2xl shadow-xl max-w-sm w-full p-8 text-center relative border border-border transform transition-all">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center
                         bg-chalk text-dim hover:bg-danger/10 hover:text-danger rounded-full transition-colors"
            >
              &times;
            </button>

            <div className="mb-6">
              <span className="inline-block p-3 bg-chalk border border-border rounded-2xl mb-3">
                <span className="text-2xl">🪄</span>
              </span>
              <h3 className="font-display text-xl font-bold text-ink truncate px-4">
                {selectedEvent.name}
              </h3>
              {selectedEvent.username && (
                <p className="text-xs font-bold text-accent-dark mt-1">@{selectedEvent.username}</p>
              )}
              <p className="text-sm text-dim mt-1">Scan or share this link with guests</p>
            </div>

            <div className="flex justify-center mb-8">
              <div className="bg-surface p-4 rounded-2xl border border-border">
                <QRCodeSVG
                  value={getGuestLink(selectedEvent)}
                  size={180}
                  level="H"
                  className="rounded-lg"
                />
              </div>
            </div>

            <div className="group relative bg-chalk hover:bg-accent/5 rounded-xl p-1.5 flex items-center border border-border hover:border-accent/30 transition-colors">
              <input
                type="text"
                readOnly
                value={getGuestLink(selectedEvent)}
                className="bg-transparent text-sm text-dim w-full outline-none px-3 font-mono"
              />
              <button
                onClick={() => handleCopyLink(getGuestLink(selectedEvent))}
                className={`ml-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  copied ? "bg-success text-chalk" : "bg-surface text-ink border border-border"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetEvent && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl shadow-xl max-w-md w-full p-6 md:p-8 relative border border-border transform transition-all text-center">
            <button
              onClick={() => {
                if (!isDeleting) {
                  setDeleteTargetEvent(null);
                  setDeleteError("");
                }
              }}
              disabled={isDeleting}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center
                         bg-chalk text-dim hover:bg-danger/10 hover:text-danger rounded-full transition-colors disabled:opacity-50"
            >
              &times;
            </button>

            <div className="mb-5 flex justify-center">
              <div className="w-16 h-16 bg-danger/10 border border-danger/20 rounded-full flex items-center justify-center text-danger text-2xl">
                🗑️
              </div>
            </div>

            <h3 className="font-display text-xl font-bold text-ink mb-2">
              Delete Event?
            </h3>

            <p className="text-sm text-dim leading-relaxed mb-6">
              Are you sure you want to delete <span className="font-bold text-ink">"{deleteTargetEvent.name}"</span>? This will also remove all processed photos.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-danger/10 text-danger border border-danger/20 rounded-xl text-xs font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetEvent(null);
                  setDeleteError("");
                }}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl border border-border bg-chalk hover:bg-surface text-ink text-sm font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteEvent}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl bg-danger hover:bg-danger/90 text-chalk text-sm font-semibold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-chalk border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Event"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {collaboratorsTargetEvent && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-surface rounded-2xl shadow-xl max-w-lg w-full p-6 md:p-8 relative border border-border transform transition-all">
            <button
              onClick={closeCollaboratorsModal}
              disabled={bulkUploading}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center
                         bg-chalk text-dim hover:bg-danger/10 hover:text-danger rounded-full transition-colors disabled:opacity-50"
            >
              &times;
            </button>

            <div className="mb-6">
              <span className="inline-block p-3 bg-chalk border border-border rounded-2xl mb-3">
                <span className="text-2xl">👥</span>
              </span>
              <h3 className="font-display text-2xl font-bold text-ink">Manage Collaborators</h3>
              <p className="text-sm text-dim mt-1 truncate">{collaboratorsTargetEvent.name}</p>
            </div>

            {/* Manual Add — one collaborator at a time, like sharing a Drive doc */}
            <form onSubmit={handleManualAdd} className="mb-6">
              <label className="block text-xs font-semibold text-ink mb-1.5 ml-1">
                Add a Collaborator
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  disabled={manualAdding}
                  className="flex-1 px-4 py-3 bg-chalk border border-border rounded-xl
                             focus:bg-surface focus:ring-2 focus:ring-accent focus:border-accent
                             outline-none transition-all text-ink text-sm font-medium placeholder:text-dim
                             disabled:opacity-60"
                />
                <select
                  value={manualPermission}
                  onChange={(e) => setManualPermission(e.target.value as CollaboratorPermission)}
                  disabled={manualAdding}
                  className="px-3 py-3 bg-chalk border border-border rounded-xl text-sm text-ink
                             focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
                >
                  <option value="VIEW_ONLY">View Only</option>
                  <option value="CAN_UPLOAD">Can Upload</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={manualAdding || !manualEmail.trim()}
                  className="px-5 py-3 rounded-xl text-chalk font-semibold text-sm
                             transition-all bg-ink hover:bg-ink/80
                             disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {manualAdding ? "Adding..." : "Add"}
                </button>
              </div>
              {manualError && (
                <p className="text-danger text-xs mt-2 ml-1 font-semibold">{manualError}</p>
              )}
              {manualSuccess && (
                <p className="text-success text-xs mt-2 ml-1 font-semibold">✓ {manualSuccess}</p>
              )}
            </form>

            <div className="flex items-center gap-3 mb-6">
              <hr className="flex-1 border-border" />
              <span className="text-[10px] text-dim font-bold uppercase tracking-wider">or in bulk</span>
              <hr className="flex-1 border-border" />
            </div>

            <div className="bg-chalk border border-border rounded-xl p-4 mb-5">
              <p className="text-xs text-dim leading-relaxed">
                Upload a CSV with an <span className="font-mono font-bold text-ink">email</span> column
                (required) and an optional <span className="font-mono font-bold text-ink">permission</span> column
                (<span className="font-mono">VIEW_ONLY</span>, <span className="font-mono">CAN_UPLOAD</span>, or{" "}
                <span className="font-mono">ADMIN</span> — defaults to View Only). Emails that don't have an
                account yet will get one waiting for them.
              </p>
            </div>

            <input
              ref={bulkFileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleBulkFileSelected}
            />

            <button
              type="button"
              onClick={() => bulkFileInputRef.current?.click()}
              disabled={bulkUploading}
              className="w-full py-3.5 rounded-xl text-chalk font-semibold text-sm
                         transition-all bg-ink hover:bg-ink/80 hover:-translate-y-0.5
                         disabled:opacity-40 disabled:hover:translate-y-0 cursor-pointer disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {bulkUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-chalk border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>📄 Bulk Add Collaborators (CSV)</>
              )}
            </button>

            {bulkError && (
              <div className="mt-4 p-3 bg-danger/10 text-danger border border-danger/20 rounded-xl text-sm font-medium text-center">
                {bulkError}
              </div>
            )}

            {bulkResult && (
              <div className="mt-5">
                <div className="p-3.5 bg-success/10 border border-success/20 rounded-xl text-sm font-semibold text-success text-center mb-3">
                  {bulkResult.added} added, {bulkResult.skipped} skipped out of {bulkResult.total_rows} row
                  {bulkResult.total_rows === 1 ? "" : "s"}.
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {bulkResult.results.map((r, i) => (
                    <div
                      key={`${r.email}-${i}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 bg-chalk border border-border rounded-lg text-xs"
                    >
                      <span className="text-ink font-medium truncate">{r.email}</span>
                      <span
                        className={`shrink-0 font-bold px-2 py-0.5 rounded-md ${
                          r.status === "added"
                            ? "text-success bg-success/10"
                            : r.status === "already_collaborator"
                            ? "text-accent-dark bg-accent/10"
                            : "text-dim bg-surface border border-border"
                        }`}
                      >
                        {r.status === "added"
                          ? PERMISSION_LABELS[r.permission || "VIEW_ONLY"]
                          : r.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-6 mb-4">
              <hr className="flex-1 border-border" />
              <span className="text-[10px] text-dim font-bold uppercase tracking-wider">Current Collaborators</span>
              <hr className="flex-1 border-border" />
            </div>

            {collaboratorsListError && (
              <div className="mb-3 p-3 bg-danger/10 text-danger border border-danger/20 rounded-xl text-xs font-medium text-center">
                {collaboratorsListError}
              </div>
            )}

            {collaboratorsListLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
              </div>
            ) : collaboratorsList.length === 0 ? (
              <p className="text-xs text-dim text-center py-4">No collaborators yet.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {(() => {
                  const isOwner = getCurrentUserId() === collaboratorsTargetEvent.owner_id;
                  return collaboratorsList.map((c) => (
                    <div
                      key={c.user_id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 bg-chalk border border-border rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{c.name || c.email || c.user_id}</p>
                        {c.name && c.email && (
                          <p className="text-[11px] text-dim truncate">{c.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {roleUpdatedUserId === c.user_id && (
                          <span className="text-[10px] text-success font-bold">✓ Updated</span>
                        )}
                        {isOwner ? (
                          <>
                            <select
                              value={c.permission}
                              onChange={(e) =>
                                handleUpdateCollaboratorPermission(c.user_id, e.target.value as CollaboratorPermission)
                              }
                              disabled={updatingUserId === c.user_id}
                              className="text-[11px] font-bold px-2 py-1 rounded-md text-accent-dark bg-accent/10
                                         border border-accent/20 focus:outline-none focus:ring-1 focus:ring-accent
                                         disabled:opacity-50"
                            >
                              <option value="VIEW_ONLY">View Only</option>
                              <option value="CAN_UPLOAD">Can Upload</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                            <button
                              onClick={() => handleRemoveCollaborator(c.user_id)}
                              disabled={removingUserId === c.user_id}
                              title="Remove collaborator"
                              className="w-7 h-7 flex items-center justify-center text-dim hover:text-danger
                                         hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {removingUserId === c.user_id ? (
                                <span className="w-3.5 h-3.5 border-2 border-dim border-t-transparent rounded-full animate-spin" />
                              ) : (
                                "🗑️"
                              )}
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-accent-dark bg-accent/10 border border-accent/20">
                            {PERMISSION_LABELS[c.permission] || c.permission}
                          </span>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
