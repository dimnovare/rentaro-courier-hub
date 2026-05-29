"use client";

import { useEffect } from "react";

export function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(onClose, 3400);
    return () => clearTimeout(id);
  }, [msg, onClose]);

  if (!msg) return null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 28,
        transform: "translateX(-50%)",
        zIndex: 200,
        padding: "15px 22px",
        borderRadius: 999,
        background: "rgba(16,19,26,0.94)",
        border: "1px solid var(--border-strong)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        color: "var(--text)",
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        letterSpacing: "0.03em",
        display: "flex",
        alignItems: "center",
        gap: 11,
        boxShadow: "0 16px 48px rgba(0,0,0,0.55), 0 0 36px -6px var(--lime-glow)",
        animation: "toast-in .3s cubic-bezier(0.34,1.4,0.5,1)",
        maxWidth: "calc(100vw - 36px)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--lime)",
          boxShadow: "0 0 12px var(--lime-glow)",
          flexShrink: 0,
        }}
      />
      {msg}
    </div>
  );
}
