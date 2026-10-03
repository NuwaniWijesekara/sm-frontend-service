export type EventStatus = "pending" | "processing" | "ready" | "failed";

export interface Event {
  id: string;
  name: string;
  date: string;
  cover_photo_url: string | null;
  total_photos: number;
  status: EventStatus;
  qr_token?: string;
  username?: string;
}

export interface Photo {
  id: string;
  // Display version (watermarked for watermarked events); the guest API
  // falls back to the original when no display copy exists.
  display_url: string;
  thumbnail_url: string;
}

export interface MatchResult {
  photo_id: string;
  display_url: string;
  thumbnail_url: string;
  similarity_score: number;
}

export interface EventPageData {
  event: Event;
  photos: Photo[];
}