import axios, { AxiosError } from "axios";
import { EventPageData, MatchResult } from "@/types";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Single client for every backend call. There is only one account model and
// one token now — every user (event creator, collaborator, or anonymous
// instant-access guest) is a row in the same Users table and carries the
// same `token` key in localStorage.
export const api = axios.create({ baseURL, timeout: 60000 });
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type FetchError = "invalid_token" | "not_ready" | "network";

// ── Load event by token/username ─────────────────────────────
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

// ── Selfie match ──────────────────────────────────────────────
export const matchSelfie = async (
  eventId: string,
  selfieBlob?: Blob,
  savedFaceId?: string,
  onProgress?: (pct: number) => void
): Promise<MatchResult[]> => {
  let token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) {
    try {
      token = await loginAnonymous();
      if (typeof window !== "undefined") {
        localStorage.setItem("token", token);
      }
    } catch (e) {
      console.warn("Auto anonymous login failed", e);
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
    const { data } = await api.post<{ matches: MatchResult[] }>("/match/selfie", form, {
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
        const newToken = await loginAnonymous();
        if (typeof window !== "undefined") {
          localStorage.setItem("token", newToken);
        }
        return await sendRequest();
      } catch (retryErr) {
        throw err;
      }
    }
    throw err;
  }
};

// ── Unified Auth ──────────────────────────────────────────────
// Every user — event creator, collaborator, or anonymous instant-access
// guest — is a row in the same Users table and goes through these same
// endpoints, all issuing the same standard JWT.
export const signup = async (email: string, password: string, name?: string): Promise<void> => {
  await api.post("/auth/signup", { email, password, name });
};

export const login = async (email: string, password: string): Promise<string> => {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const { data } = await api.post<{ access_token: string }>("/auth/login", form.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data.access_token;
};

export const loginAnonymous = async (): Promise<string> => {
  const { data } = await api.post<{ access_token: string }>("/auth/anonymous");
  return data.access_token;
};

export const loginGoogle = async (idToken: string): Promise<string> => {
  const { data } = await api.post<{ access_token: string }>("/auth/google", { id_token: idToken });
  return data.access_token;
};

// ── Profile: reference face (Privacy-First AI Face Matching) ───
export interface ReferenceFaceStatus {
  has_reference_face: boolean;
  reference_face_url?: string | null;
}

export const fetchReferenceFace = async (): Promise<ReferenceFaceStatus> => {
  const { data } = await api.get<ReferenceFaceStatus>("/api/v1/users/me/face");
  return data;
};

export const uploadReferenceFace = async (file: File | Blob): Promise<{ message: string; reference_face_url?: string | null }> => {
  const form = new FormData();
  form.append("file", file, "reference-face.jpg");
  const { data } = await api.post<{ message: string; reference_face_url?: string | null }>(
    "/api/v1/users/me/face",
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

// ── Guest: Saved Faces ──────────────────────────────────────
export interface SavedFace {
  id: string;
  nickname: string;
  created_at: string;
  expires_at: string;
}

export const fetchSavedFaces = async (): Promise<SavedFace[]> => {
  const { data } = await api.get<SavedFace[]>("/guest/saved-faces");
  return data;
};

export const createSavedFace = async (nickname: string, file: Blob): Promise<SavedFace> => {
  const form = new FormData();
  form.append("nickname", nickname);
  form.append("file", file, "selfie.jpg");
  const { data } = await api.post<SavedFace>("/guest/saved-faces", form, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const updateSavedFace = async (id: string, nickname: string): Promise<SavedFace> => {
  const { data } = await api.patch<SavedFace>(`/guest/saved-faces/${id}`, { nickname });
  return data;
};

export const deleteSavedFace = async (id: string): Promise<void> => {
  await api.delete(`/guest/saved-faces/${id}`);
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
  const { data } = await api.get<SearchHistory[]>("/guest/history");
  return data;
};

// ── Events CRUD ──────────────────────────────────────────────
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

// ── Collaborators ────────────────────────────────────────────
export type CollaboratorPermission = "VIEW_ONLY" | "CAN_UPLOAD" | "ADMIN";

export interface SharedEventData {
  id: string;
  name: string;
  drive_url: string;
  status: string;
  username?: string;
  qr_token?: string;
  owner_name?: string;
  owner_email?: string;
  permission: CollaboratorPermission;
}

export const fetchSharedEvents = async (): Promise<SharedEventData[]> => {
  const { data } = await api.get<SharedEventData[]>("/api/v1/events/shared");
  return data;
};

export interface BulkCollaboratorResult {
  email: string;
  status: "added" | "already_collaborator" | "is_owner" | "invalid_email" | "error";
  permission?: CollaboratorPermission;
  detail?: string;
}

export interface BulkImportResponse {
  total_rows: number;
  added: number;
  skipped: number;
  results: BulkCollaboratorResult[];
}

export const bulkAddCollaborators = async (eventId: string, file: File): Promise<BulkImportResponse> => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<BulkImportResponse>(
    `/api/v1/events/${eventId}/collaborators/bulk`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export interface AddCollaboratorResponse {
  user_id: string;
  email: string;
  permission: CollaboratorPermission;
}

export const addCollaborator = async (
  eventId: string,
  email: string,
  permission: CollaboratorPermission
): Promise<AddCollaboratorResponse> => {
  const { data } = await api.post<AddCollaboratorResponse>(
    `/api/v1/events/${eventId}/collaborators`,
    { email, permission }
  );
  return data;
};

export interface Collaborator {
  user_id: string;
  email?: string | null;
  name?: string | null;
  permission: CollaboratorPermission;
}

export const fetchCollaborators = async (eventId: string): Promise<Collaborator[]> => {
  const { data } = await api.get<Collaborator[]>(`/api/v1/events/${eventId}/collaborators`);
  return data;
};

export const removeCollaborator = async (eventId: string, userId: string): Promise<void> => {
  await api.delete(`/api/v1/events/${eventId}/collaborators/${userId}`);
};

// ── Subscriptions ───────────────────────────────────────────
// user_id is intentionally not part of this payload: the backend derives the
// subscriber's identity from the caller's JWT (see `api` client above), never
// from client-supplied input.
export interface SubscriptionPayload {
  package_id: string;
}

export interface SubscriptionPackageSummary {
  id: string;
  app_id: string;
  name: string;
  price: number;
  billing_cycle: string;
  features?: string[] | null;
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
  package?: SubscriptionPackageSummary | null;
}

export interface CheckoutResponse {
  subscription: SubscriptionResponse;
  checkout_url: string;
  session_id: string;
}

export const createSubscription = async (
  payload: SubscriptionPayload
): Promise<CheckoutResponse> => {
  const { data } = await api.post<CheckoutResponse>(
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

// ── Dummy payment gateway ────────────────────────────────────
// Simulates the payment provider calling us back after the user "pays" on
// the mock checkout page (see /dummy-checkout). Public endpoint on the
// backend — the `api` client may still attach a Bearer token if one exists
// in localStorage, but the route itself doesn't require one.
export const confirmDummyPayment = async (
  sessionId: string
): Promise<SubscriptionResponse> => {
  const { data } = await api.post<SubscriptionResponse>(
    "/api/v1/webhooks/dummy",
    { session_id: sessionId }
  );
  return data;
};

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

export const fetchPackages = async (appId?: string): Promise<AdminPackage[]> => {
  const { data } = await api.get<AdminPackage[]>("/api/v1/packages", {
    params: { app_id: appId || undefined },
  });
  return data;
};
