"use client";
import React, { useRef } from "react";

interface Props {
  onSelect: (file: File) => void;
  disabled?: boolean;
}

export default function SelfieUploader({ onSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelect(file);
      e.target.value = ""; // allow re-selecting same file
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
        aria-label="Upload a photo from your device"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="w-full py-3 rounded-xl border-2 border-border text-ink text-sm font-semibold
                   flex items-center justify-center gap-2
                   hover:border-accent hover:text-accent disabled:opacity-40 transition-colors"
      >
        <span aria-hidden>🖼️</span>
        Upload a Photo
      </button>
    </>
  );
}