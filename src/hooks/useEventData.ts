"use client";
import { useEffect, useState } from "react";
import { FetchError, fetchEventByToken } from "@/services/api";
import { EventPageData } from "@/types";

export type LoadStatus =
  | "loading"
  | "ready"
  | "invalid_token"
  | "not_ready"
  | "network_error";

export const useEventData = (token: string) => {
  const [data,   setData]   = useState<EventPageData | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    console.log("token in hook: ", token);
    if (!token) {
      setStatus("invalid_token");
      return;
    }

    let cancelled = false;

    fetchEventByToken(token)
      .then((result) => {
        if (cancelled) return;
        if (result.event.status !== "ready") {
          setStatus("not_ready");
        } else {
          setData(result);
          setStatus("ready");
        }
      })
      .catch((err: Error & { reason?: FetchError }) => {
        if (cancelled) return;
        switch (err.reason) {
          case "invalid_token": setStatus("invalid_token"); break;
          case "not_ready":     setStatus("not_ready");     break;
          default:              setStatus("network_error"); break;
        }
      });

    return () => { cancelled = true; };
  }, [token]);

  return { data, status };
};