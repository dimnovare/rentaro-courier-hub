"use client";

import { useInteractions } from "@/components/providers/Interactions";
import { Ic } from "@/components/ui/Icon";

export function ReserveButton({
  what,
  label,
  lg = false,
  ghost = false,
}: {
  what?: string;
  label: string;
  lg?: boolean;
  ghost?: boolean;
}) {
  const { reserve } = useInteractions();
  return (
    <button
      className={`btn ${ghost ? "btn-ghost" : "btn-primary"} ${lg ? "btn-lg" : ""}`}
      onClick={() => reserve(what)}
    >
      {label}
      {!ghost && (
        <span className="arrow">
          <Ic.arrow />
        </span>
      )}
    </button>
  );
}
