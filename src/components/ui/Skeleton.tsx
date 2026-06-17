import React from "react";
import clsx from "clsx";

interface Props {
  className?: string;
}

export default function Skeleton({ className }: Props) {
  return (
    <div
      aria-hidden
      className={clsx(
        "rounded-xl bg-linear-to-r from-border via-chalk to-border bg-size-[400px_100%]",
        "animate-shimmer",
        className
      )}
    />
  );
}