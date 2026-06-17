"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { fetchEvents, createEvent, updateEvent, deleteEvent } from "@/services/api";

interface EventData {
  id: string;
  name: string;
  drive_url: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const getToken = () => localStorage.getItem("token");

  const loadEvents = async () => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }
    try {
      const data = await fetchEvents();
      console.log("Events data from API:", data);
      console.log("First event status:", data[0]?.status);
      setEvents(data);
    } catch (error: any) {
      console.error("Failed to fetch events:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/auth");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }
    loadEvents();
    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  const getGuestLink = (eventId: string) => {
    return `http://localhost:3000/events/guest/${eventId}`;
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openCreateModal = () => {
    setModalMode("CREATE");
    setEventName("");
    driveUrl && setDriveUrl("");
    setFormError("");
    setIsFormModalOpen(true);
  };

  const openEditModal = (event: EventData) => {
    setModalMode("EDIT");
    setEditingEventId(event.id);
    setEventName(event.name);
    setDriveUrl(event.drive_url);
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    try {
      if (modalMode === "CREATE") {
        await createEvent(eventName, driveUrl);
      } else {
        await updateEvent(editingEventId!, eventName, driveUrl);
      }
      setIsFormModalOpen(false);
      loadEvents();
    } catch (error) {
      setFormError(`Failed to ${modalMode.toLowerCase()} event.`);
      console.error(error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, name: string) => {
    const token = getToken();
    if (!token) {
      router.push("/auth");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${name}"? This will also remove all processed photos.`)) {
      return;
    }

    try {
      await deleteEvent(eventId);
      loadEvents();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete the event.");
    }
  };

  return (
    <main className="min-h-screen bg-chalk p-8 font-body">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4 border-b border-border pb-6">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-1">
              Studio Dashboard
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-ink tracking-tight">
              Photographer Studio
            </h1>
            <p className="text-dim text-sm mt-1">
              Manage your events and guest links seamlessly.
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
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold
                         text-chalk bg-ink border border-transparent rounded-xl
                         hover:bg-ink/80 transition-all hover:-translate-y-0.5"
            >
              <span className="mr-2 text-base">+</span> Create Event
            </button>
          </div>
        </div>

        {loading ? (
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
                    onClick={() => openEditModal(ev)}
                    className="w-8 h-8 flex items-center justify-center bg-chalk border border-border
                               rounded-lg text-dim hover:text-accent-dark transition-colors"
                    title="Edit Event"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(ev.id, ev.name)}
                    className="w-8 h-8 flex items-center justify-center bg-chalk border border-border
                               rounded-lg text-dim hover:text-danger transition-colors"
                    title="Delete Event"
                  >
                    🗑️
                  </button>
                </div>

                <div className="relative z-10 pr-12">
                  <h2 className="font-display text-xl font-bold text-ink mb-1 truncate" title={ev.name}>
                    {ev.name}
                  </h2>
                  <p className="text-xs text-dim mb-5 font-mono truncate bg-chalk border border-border inline-block px-2 py-1 rounded-md">
                    ID: {ev.id.split("-")[0]}...
                  </p>

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
                  ? "Link your Google Drive folder"
                  : "Modify event details below"}
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5 ml-1">
                  Event Name
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
                  Google Drive Folder URL
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
                disabled={formLoading}
                className="w-full py-3.5 rounded-xl text-chalk font-semibold text-base
                           transition-all bg-ink hover:bg-ink/80 hover:-translate-y-0.5
                           disabled:opacity-40 disabled:hover:translate-y-0"
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
              <p className="text-sm text-dim mt-1">Scan or share this link with guests</p>
            </div>

            <div className="flex justify-center mb-8">
              <div className="bg-surface p-4 rounded-2xl border border-border">
                <QRCodeSVG
                  value={getGuestLink(selectedEvent.id)}
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
                value={getGuestLink(selectedEvent.id)}
                className="bg-transparent text-sm text-dim w-full outline-none px-3 font-mono"
              />
              <button
                onClick={() => handleCopyLink(getGuestLink(selectedEvent.id))}
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
    </main>
  );
}