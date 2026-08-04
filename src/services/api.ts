import axios, { AxiosError } from "axios";
import { EventPageData, MatchResult } from "@/types";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Photographer-facing client
export const api = axios.create({ baseURL, timeout: 60000 });
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Guest-facing client
export const guestApi = axios.create({ baseURL, timeout: 60000 });
guestApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("guest_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth token injector
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("guest_token") || localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type FetchError = "invalid_token" | "not_ready" | "network";

// ── Guest: load event by ID ─────────────────────────────────
export const fetchEventByToken = async (token: string): Promise<EventPageData> => {
  try {
    const { data } = await guestApi.get<EventPageData>(`/guest/${token}`);
    return data;
  } catch (err) {
    const e = err as AxiosError;
    if (e.response?.status === 404 || e.response?.status === 401)
      throw Object.assign(new Error("invalid_token"), { reason: "invalid_token" as FetchError });
    if (e.response?.status === 409)
      throw Object.assign(new Error("not_ready"), { reason: "not_ready" as FetchError });
    throw Object.assign(new Error("network"), { reason: "network" as FetchError });
  }
};

// ── Guest: selfie match ─────────────────────────────────────
export const matchSelfie = async (
  eventId: string,
  selfieBlob?: Blob,
  savedFaceId?: string,
  onProgress?: (pct: number) => void
): Promise<MatchResult[]> => {
  const form = new FormData();
  if (selfieBlob) {
    form.append("selfie", selfieBlob, "selfie.jpg");
  }
  if (savedFaceId) {
    form.append("saved_face_id", savedFaceId);
  }
  form.append("event_id", eventId);
  const { data } = await guestApi.post<{ matches: MatchResult[] }>("/match/selfie", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
  return data.matches;
};

// ── Guest: Auth ─────────────────────────────────────────────
export const guestRegister = async (name: string, email: string, password: string): Promise<void> => {
  await guestApi.post("/guest/auth/register", { name, email, password });
};

export const guestLogin = async (email: string, password: string): Promise<string> => {
  const { data } = await guestApi.post<{ access_token: string }>("/guest/auth/login", { email, password });
  return data.access_token;
};

export const guestLoginAnonymous = async (): Promise<string> => {
  const { data } = await guestApi.post<{ access_token: string }>("/guest/auth/anonymous");
  return data.access_token;
};

export const guestLoginGoogle = async (idToken: string): Promise<string> => {
  const { data } = await guestApi.post<{ access_token: string }>("/guest/auth/google", { id_token: idToken });
  return data.access_token;
};

// ── Guest: Saved Faces ──────────────────────────────────────
export interface SavedFace {
  id: string;
  nickname: string;
  created_at: string;
  expires_at: string;
}

export const fetchSavedFaces = async (): Promise<SavedFace[]> => {
  const { data } = await guestApi.get<SavedFace[]>("/guest/saved-faces");
  return data;
};

export const createSavedFace = async (nickname: string, file: Blob): Promise<SavedFace> => {
  const form = new FormData();
  form.append("nickname", nickname);
  form.append("file", file, "selfie.jpg");
  const { data } = await guestApi.post<SavedFace>("/guest/saved-faces", form, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const updateSavedFace = async (id: string, nickname: string): Promise<SavedFace> => {
  const { data } = await guestApi.patch<SavedFace>(`/guest/saved-faces/${id}`, { nickname });
  return data;
};

export const deleteSavedFace = async (id: string): Promise<void> => {
  await guestApi.delete(`/guest/saved-faces/${id}`);
};

// ── Guest: History ──────────────────────────────────────────
export interface SearchHistory {
  id: string;
  created_at: string;
  event: {
    id: string;
    name: string;
    date: string;
    cover_photo_url?: string;
    qr_token: string;
  };
  photos: {
    id: string;
    s3_url: string;
    thumbnail_url?: string;
  }[];
}

export const fetchGuestHistory = async (): Promise<SearchHistory[]> => {
  const { data } = await guestApi.get<SearchHistory[]>("/guest/history");
  return data;
};

// ── Photographer: auth ──────────────────────────────────────
export const login = async (email: string, password: string): Promise<string> => {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const { data } = await api.post<{ access_token: string }>("/auth/login", form.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data.access_token;
};

export const signup = async (email: string, password: string): Promise<void> => {
  await api.post("/auth/signup", { email, password });
};

// ── Photographer: events CRUD ───────────────────────────────
export const fetchEvents = async () => {
  const { data } = await api.get("/events/");
  return data;
};

export const checkUsernameAvailability = async (username: string, excludeEventId?: string): Promise<{ available: boolean; message: string }> => {
  const { data } = await api.get<{ available: boolean; message: string }>("/events/check-username", {
    params: { username, exclude_event_id: excludeEventId || undefined }
  });
  return data;
};

export const createEvent = async (name: string, drive_url: string, username?: string) => {
  const { data } = await api.post("/events/", { name, drive_url, username: username || undefined });
  return data;
};

export const updateEvent = async (id: string, name: string, drive_url: string, username?: string) => {
  const { data } = await api.put(`/events/${id}`, { name, drive_url, username: username || undefined });
  return data;
};

export const deleteEvent = async (id: string) => {
  await api.delete(`/events/${id}`);
};