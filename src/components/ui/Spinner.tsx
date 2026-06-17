import React from "react";
import clsx from "clsx";

interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export default function Spinner({ size = "md", className }: Props) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={clsx(
        "inline-block rounded-full border-ink/20 border-t-ink animate-spin",
        sizes[size],
        className
      )}
    />
  );
}