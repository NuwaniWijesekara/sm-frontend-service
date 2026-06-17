"use client";
import React, { useEffect, useState } from "react";
import clsx from "clsx";

interface Props {
  message: string;
  type?: "error" | "success" | "info";
  onDismiss?: () => void;
}

export default function Toast({ message, type = "info", onDismiss }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className={clsx(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "px-5 py-3 rounded-2xl text-sm font-medium shadow-lg",
        "animate-fade-up max-w-sm w-[90vw] text-center",
        type === "error"   && "bg-danger text-white",
        type === "success" && "bg-success text-white",
        type === "info"    && "bg-ink text-chalk"
      )}
    >
      {message}
    </div>
  );
}