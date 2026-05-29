"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Bulletproof scroll-reveal (ported from the locked design).
 * Content is visible by default. We only hide-then-reveal elements that are
 * BELOW the fold on mount. A safety timer + IntersectionObserver guarantee the
 * element always becomes visible, even if the observer never fires.
 */
type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  id?: string;
};

export function Reveal({ children, delay = 0, className = "", style = {}, id }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vh = window.innerHeight || 800;
    const rect = el.getBoundingClientRect();
    const belowFold = rect.top > vh - 40;
    if (!belowFold) return; // visible region — never hide

    setHidden(true);
    let done = false;
    const reveal = () => {
      if (!done) {
        done = true;
        setHidden(false);
      }
    };
    const fallback = setTimeout(reveal, 1300 + delay);

    let obs: IntersectionObserver | undefined;
    try {
      obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              setTimeout(reveal, delay);
              obs?.disconnect();
              clearTimeout(fallback);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -10% 0px" },
      );
      obs.observe(el);
    } catch {
      reveal();
    }

    return () => {
      obs?.disconnect();
      clearTimeout(fallback);
    };
  }, [delay]);

  const animStyle: CSSProperties = hidden
    ? { opacity: 0, transform: "translateY(26px)", transition: "none", ...style }
    : {
        opacity: 1,
        transform: "none",
        transition:
          "opacity .7s cubic-bezier(0.22,1,0.36,1), transform .7s cubic-bezier(0.22,1,0.36,1)",
        ...style,
      };

  return (
    <div ref={ref} className={className} style={animStyle} id={id}>
      {children}
    </div>
  );
}
