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
  let guestToken = typeof window !== "undefined" ? localStorage.getItem("guest_token") : null;
  if (!guestToken) {
    try {
      guestToken = await guestLoginAnonymous();
      if (typeof window !== "undefined") {
        localStorage.setItem("guest_token", guestToken);
      }
    } catch (e) {
      console.warn("Auto anonymous guest login failed", e);
    }
  }

  const sendRequest = async () => {
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

  try {
    return await sendRequest();
  } catch (err: any) {
    if (err.response?.status === 401 || err.response?.data?.detail === "Invalid token") {
      try {
        const newToken = await guestLoginAnonymous();
        if (typeof window !== "undefined") {
          localStorage.setItem("guest_token", newToken);
        }
        return await sendRequest();
      } catch (retryErr) {
        throw err;
      }
    }
    throw err;
  }
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

// ── Subscriptions ───────────────────────────────────────────
export interface SubscriptionPayload {
  user_id: string;
  package_id: string;
}

export interface SubscriptionResponse {
  id: string;
  user_id: string;
  package_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export const createSubscription = async (
  payload: SubscriptionPayload
): Promise<SubscriptionResponse> => {
  const { data } = await api.post<SubscriptionResponse>(
    "/api/v1/subscriptions",
    payload
  );
  return data;
};

export const fetchSubscriptions = async (
  userId: string
): Promise<SubscriptionResponse[]> => {
  const { data } = await api.get<SubscriptionResponse[]>(
    `/api/v1/subscriptions/${userId}`
  );
  return data;
};

// ── Admin Subscriptions & Packages (Port 8003 Direct) ──────────
const ADMIN_SUB_URL =
  process.env.NEXT_PUBLIC_SUBSCRIPTION_SERVICE_URL || "http://localhost:8003";

export const adminSubApi = axios.create({
  baseURL: ADMIN_SUB_URL,
  timeout: 15000,
});

export interface AdminPackage {
  id: string;
  app_id: string;
  name: string;
  price: number;
  billing_cycle: string;
  features?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminSubscription {
  id: string;
  user_id: string;
  package_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
  package?: AdminPackage | null;
}

export const fetchAdminPackages = async (appId?: string): Promise<AdminPackage[]> => {
  const { data } = await adminSubApi.get<AdminPackage[]>("/api/v1/admin/packages", {
    params: { app_id: appId || undefined },
  });
  return data;
};

export const fetchPackages = fetchAdminPackages;

export const fetchAdminSubscriptions = async (): Promise<AdminSubscription[]> => {
  const { data } = await adminSubApi.get<AdminSubscription[]>("/api/v1/admin/subscriptions");
  return data;
};

export const updateAdminSubscriptionStatus = async (
  subscriptionId: string,
  status: string
): Promise<AdminSubscription> => {
  const { data } = await adminSubApi.patch<AdminSubscription>(
    `/api/v1/admin/subscriptions/${subscriptionId}/status`,
    { status }
  );
  return data;
};

export interface AdminPackageCreatePayload {
  app_id: string;
  name: string;
  price: number;
  billing_cycle: string;
  features?: string[] | null;
}

export const createAdminPackage = async (
  payload: AdminPackageCreatePayload
): Promise<AdminPackage> => {
  const { data } = await adminSubApi.post<AdminPackage>(
    "/api/v1/admin/packages",
    payload
  );
  return data;
};

export const updateAdminPackage = async (
  packageId: string,
  payload: Partial<AdminPackageCreatePayload>
): Promise<AdminPackage> => {
  const { data } = await adminSubApi.put<AdminPackage>(
    `/api/v1/admin/packages/${packageId}`,
    payload
  );
  return data;
};

export const deleteAdminPackage = async (
  packageId: string
): Promise<{ message: string }> => {
  const { data } = await adminSubApi.delete<{ message: string }>(
    `/api/v1/admin/packages/${packageId}`
  );
  return data;
};

// ── Admin Applications / Tenants ──────────────────────────────
export interface AdminApplication {
  id: string;
  app_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
}

export const fetchAdminApplications = async (): Promise<AdminApplication[]> => {
  const { data } = await adminSubApi.get<AdminApplication[]>("/api/v1/admin/applications");
  return data;
};

export interface AdminApplicationCreatePayload {
  app_id: string;
  name: string;
  description?: string;
}

export const createAdminApplication = async (
  payload: AdminApplicationCreatePayload
): Promise<AdminApplication> => {
  const { data } = await adminSubApi.post<AdminApplication>(
    "/api/v1/admin/applications",
    payload
  );
  return data;
};