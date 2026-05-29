"use client";

import { useEffect, useRef } from "react";

/** Fixed moving-grid background with subtle cursor parallax (ported). */
export function Background() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 16;
      const y = (e.clientY / window.innerHeight - 0.5) * 16;
      ref.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="bg-layer" aria-hidden="true">
      <div ref={ref} style={{ position: "absolute", inset: "-3%", transition: "transform .4s ease-out" }}>
        <div className="bg-grid" />
        <div className="bg-grid fine" />
      </div>
      <div className="bg-scan" />
    </div>
  );
}
