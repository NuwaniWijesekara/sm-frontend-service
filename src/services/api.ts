import axios, { AxiosError } from "axios";
import { EventPageData, MatchResult } from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout: 60000,
});

// Auth token injector
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type FetchError = "invalid_token" | "not_ready" | "network";

// ── Guest: load event by ID ─────────────────────────────────
export const fetchEventByToken = async (token: string): Promise<EventPageData> => {
  try {
    const { data } = await api.get<EventPageData>(`/guest/${token}`);
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
  selfieBlob: Blob,
  onProgress?: (pct: number) => void
): Promise<MatchResult[]> => {
  const form = new FormData();
  form.append("selfie", selfieBlob, "selfie.jpg");
  form.append("event_id", eventId);
  const { data } = await api.post<{ matches: MatchResult[] }>("/match/selfie", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
  return data.matches;
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
  const { data } = await api.get("/events");
  return data;
};

export const createEvent = async (name: string, drive_url: string) => {
  const { data } = await api.post("/events/", { name, drive_url });
  return data;
};

export const updateEvent = async (id: string, name: string, drive_url: string) => {
  const { data } = await api.put(`/events/${id}`, { name, drive_url });
  return data;
};

export const deleteEvent = async (id: string) => {
  await api.delete(`/events/${id}`);
};