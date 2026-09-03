"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchSavedFaces,
  createSavedFace,
  updateSavedFace,
  deleteSavedFace,
  fetchGuestHistory,
  SavedFace,
  SearchHistory
} from "@/services/api";
import {
  Camera,
  Trash2,
  Edit2,
  LogOut,
  Calendar,
  Image as ImageIcon,
  Plus,
  Compass,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle,
  AlertCircle,
  X
} from "lucide-react";

export default function GuestDashboard() {
  const router = useRouter();
  const [faces, setFaces] = useState<SavedFace[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Event search shortcut state
  const [eventTokenInput, setEventTokenInput] = useState("");



  // Edit face state
  const [editingFaceId, setEditingFaceId] = useState<string | null>(null);
  const [editingFaceName, setEditingFaceName] = useState("");
  const [deletingFaceTarget, setDeletingFaceTarget] = useState<SavedFace | null>(null);
  const [isDeletingFace, setIsDeletingFace] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("guest_token");
    if (!token) {
      router.push("/");
      return;
    }

    // Decode JWT token
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        setIsAnonymous(payload.is_anonymous);
        setEmail(payload.email || "Anonymous Guest");
        setName(payload.name || "Guest");
      }
    } catch (e) {
      router.push("/");
      return;
    }

    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    setLoading(true);
    setHistoryLoading(true);

    try {
      const facesList = await fetchSavedFaces();
      setFaces(facesList);
    } catch (e) {
      console.error("Failed to load saved faces", e);
    } finally {
      setLoading(false);
    }

    try {
      const historyList = await fetchGuestHistory();
      setHistory(historyList);
    } catch (e) {
      console.error("Failed to load search history", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("guest_token");
    router.push("/");
  };



  const handleStartRename = (face: SavedFace) => {
    setEditingFaceId(face.id);
    setEditingFaceName(face.nickname);
  };

  const handleSaveRename = async (id: string) => {
    if (!editingFaceName.trim()) return;
    try {
      await updateSavedFace(id, editingFaceName.trim());
      setEditingFaceId(null);
      // Reload faces
      const facesList = await fetchSavedFaces();
      setFaces(facesList);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteFace = async () => {
    if (!deletingFaceTarget) return;
    setIsDeletingFace(true);
    try {
      await deleteSavedFace(deletingFaceTarget.id);
      setFaces(faces.filter((f) => f.id !== deletingFaceTarget.id));
      setDeletingFaceTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingFace(false);
    }
  };

  const handleNavigateToEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTokenInput.trim()) return;
    
    let token = eventTokenInput.trim();
    if (token.includes("/events/guest/")) {
      const match = token.match(/\/events\/guest\/([^/?#]+)/);
      if (match) token = match[1];
    }
    router.push(`/events/guest/${token}`);
  };

  return (
    <main className="min-h-screen bg-chalk text-ink p-6 md:p-12 relative overflow-hidden font-body">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-10 z-10 relative">
        {/* Top Header Card */}
        <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm backdrop-blur-xl">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-dark">Guest Dashboard</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink font-display">
              Welcome back, <span className="text-accent-dark">{isAnonymous ? "Guest" : name}</span>
            </h1>
            <p className="text-xs text-dim">
              {isAnonymous
                ? "You are logged in via a temporary guest session. Sign up to save faces permanently."
                : "Manage your saved face profiles and view history of your matched event photos."}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:border-danger hover:text-danger rounded-xl text-xs font-semibold transition duration-200 shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* Shortcut Quick Search Bar */}
        <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-accent-dark" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink">Search Collection or Event</h3>
              <p className="text-xs text-dim">Enter a photographer's Collection Username, Token, or Link.</p>
            </div>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!eventTokenInput.trim()) return;
            let token = eventTokenInput.trim();
            if (token.startsWith("@")) token = token.substring(1);
            if (token.includes("/events/guest/")) {
              const match = token.match(/\/events\/guest\/([^/?#]+)/);
              if (match) token = match[1];
            }
            router.push(`/events/guest/${token}`);
          }} className="w-full md:w-auto flex flex-1 max-w-xl gap-2">
            <input
              type="text"
              placeholder="Enter Collection Username (e.g. @wedding2026) or Link..."
              className="flex-1 px-4 py-2.5 bg-chalk border border-border rounded-xl focus:bg-surface focus:border-accent outline-none text-xs text-ink transition placeholder:text-dim"
              value={eventTokenInput}
              onChange={(e) => setEventTokenInput(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-ink hover:bg-ink/80 active:scale-95 text-chalk text-xs font-bold rounded-xl flex items-center gap-1.5 transition shrink-0"
            >
              Go <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Dashboard Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: Saved faces list */}
          <div className="lg:col-span-5 bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-ink font-display">Saved Faces</h2>
                <p className="text-xs text-dim">Select these on event search screens.</p>
              </div>

            </div>

            {isAnonymous && (
              <div className="p-3.5 bg-accent/10 border border-accent/20 rounded-xl text-xs flex gap-2 items-start text-accent-dark font-medium leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Temporary Session:</span> Saved faces will be deleted after 24 hours of inactivity.
                  <Link href="/" className="ml-1 underline font-bold hover:text-accent-dark/80 block sm:inline mt-1 sm:mt-0">
                    Register to keep faces permanently.
                  </Link>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            ) : faces.length === 0 ? (
              <div className="p-8 text-center text-dim border border-dashed border-border rounded-2xl">
                <Camera className="w-8 h-8 mx-auto mb-2 text-dim/60" />
                <p className="text-xs">No saved face profiles yet. Add one to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {faces.map((face) => (
                  <div
                    key={face.id}
                    className="p-4 bg-chalk/35 hover:bg-chalk border border-border rounded-2xl flex items-center justify-between gap-3 group transition"
                  >
                    <div className="flex-1 min-w-0">
                      {editingFaceId === face.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="bg-surface border border-border rounded px-2 py-1 text-xs text-ink focus:outline-none flex-1 font-semibold"
                            value={editingFaceName}
                            onChange={(e) => setEditingFaceName(e.target.value)}
                          />
                          <button
                            onClick={() => handleSaveRename(face.id)}
                            className="p-1 bg-success/15 text-success rounded text-xs font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingFaceId(null)}
                            className="p-1 bg-surface border border-border text-dim rounded text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div>
                          <h4 className="font-bold text-sm text-ink truncate">{face.nickname}</h4>
                          <p className="text-[10px] text-dim mt-1">
                            Expires: {new Date(face.expires_at).toLocaleDateString()} (Inactivity)
                          </p>
                        </div>
                      )}
                    </div>

                    {editingFaceId !== face.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartRename(face)}
                          className="p-1.5 hover:bg-surface text-dim hover:text-accent-dark rounded border border-transparent hover:border-border transition"
                          title="Rename profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingFaceTarget(face)}
                          className="p-1.5 hover:bg-danger/10 text-dim hover:text-danger rounded border border-transparent hover:border-danger/25 transition"
                          title="Delete profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel: History feed */}
          <div className="lg:col-span-7 bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-ink font-display">Your Search History</h2>
              <p className="text-xs text-dim">Quick links to previous events you searched and matching photos.</p>
            </div>

            {isAnonymous && history.length > 0 && (
              <div className="p-3.5 bg-accent/10 border border-accent/20 rounded-xl text-xs flex gap-2 items-start text-accent-dark font-medium leading-relaxed mb-4">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Temporary History:</span> Your search logs will be cleared after 24 hours of inactivity.
                  <Link href="/" className="ml-1 underline font-bold hover:text-accent-dark/80 block sm:inline mt-1 sm:mt-0">
                    Register to keep history permanently.
                  </Link>
                </div>
              </div>
            )}

            {historyLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-dim border border-dashed border-border rounded-2xl">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-dim/60" />
                <p className="text-xs">No searches executed yet. Scan a QR code or paste an event token!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="p-5 bg-chalk/35 border border-border rounded-2xl space-y-4 hover:border-accent/40 transition"
                  >
                    {/* Event Info Card */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-extrabold text-sm text-ink">{record.event.name}</h4>
                        <div className="flex items-center gap-4 mt-1 text-[11px] text-dim">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(record.event.date).toLocaleDateString()}
                          </span>
                          <span>·</span>
                          <span>Searched: {new Date(record.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Link
                        href={`/events/guest/${record.event.id}`}
                        className="px-3 py-1.5 bg-surface hover:bg-chalk border border-border rounded-lg text-[10px] font-bold text-accent-dark transition shadow-sm"
                      >
                        Re-search Event →
                      </Link>
                    </div>

                    {/* Image Previews */}
                    {record.photos.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-dim">
                          Matched Photos ({record.photos.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {record.photos.slice(0, 8).map((photo) => (
                            <a
                              key={photo.id}
                              href={photo.s3_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-12 h-12 rounded-lg border border-border overflow-hidden relative bg-chalk hover:border-accent transition shrink-0 block"
                            >
                              <img
                                src={photo.thumbnail_url || photo.s3_url}
                                alt="Matched face preview"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ))}
                          {record.photos.length > 8 && (
                            <div className="w-12 h-12 rounded-lg bg-surface border border-border flex items-center justify-center text-[10px] font-bold text-dim shadow-sm">
                              +{record.photos.length - 8}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-dim italic">No matching photos were surfaced in this search.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {deletingFaceTarget && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl shadow-xl max-w-md w-full p-6 md:p-8 relative border border-border transform transition-all text-center">
            <button
              onClick={() => {
                if (!isDeletingFace) setDeletingFaceTarget(null);
              }}
              disabled={isDeletingFace}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center
                         bg-chalk text-dim hover:bg-danger/10 hover:text-danger rounded-full transition-colors disabled:opacity-50"
            >
              &times;
            </button>

            <div className="mb-5 flex justify-center">
              <div className="w-16 h-16 bg-danger/10 border border-danger/20 rounded-full flex items-center justify-center text-danger">
                <Trash2 className="w-8 h-8 text-danger" />
              </div>
            </div>

            <h3 className="font-display text-xl font-bold text-ink mb-2">
              Delete Saved Profile?
            </h3>
            
            <p className="text-sm text-dim leading-relaxed mb-6">
              Are you sure you want to delete <span className="font-bold text-ink font-mono">"{deletingFaceTarget.nickname}"</span>?
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingFaceTarget(null)}
                disabled={isDeletingFace}
                className="flex-1 py-3 px-4 rounded-xl border border-border bg-chalk hover:bg-surface text-ink text-sm font-semibold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteFace}
                disabled={isDeletingFace}
                className="flex-1 py-3 px-4 rounded-xl bg-danger hover:bg-danger/90 text-chalk text-sm font-semibold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingFace ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-chalk" />
                    Deleting...
                  </>
                ) : (
                  "Delete Profile"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
