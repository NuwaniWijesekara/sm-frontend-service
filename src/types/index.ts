// export type EventStatus = "pending" | "uploading" | "indexing" | "ready";

// export interface Event {
//   id: string;
//   name: string;
//   date: string;           // ISO string
//   cover_photo_url: string | null;
//   total_photos: number;
//   status: EventStatus;
// }

// export interface Photo {
//   id: string;
//   s3_url: string;
//   thumbnail_url: string;
// }

// export interface MatchResult {
//   photo_id: string;
//   s3_url: string;
//   thumbnail_url: string;
//   similarity_score: number;
// }

// export interface EventPageData {
//   event: Event;
//   photos: Photo[];
// }

// export interface MatchResponse {
//   matches: MatchResult[];
// }



export type EventStatus = "pending" | "processing" | "ready" | "failed";

export interface Event {
  id: string;
  name: string;
  date: string;
  cover_photo_url: string | null;
  total_photos: number;
  status: EventStatus;
}

export interface Photo {
  id: string;
  s3_url: string;
  thumbnail_url: string;
}

export interface MatchResult {
  photo_id: string;
  s3_url: string;
  thumbnail_url: string;
  similarity_score: number;
}

export interface EventPageData {
  event: Event;
  photos: Photo[];
}