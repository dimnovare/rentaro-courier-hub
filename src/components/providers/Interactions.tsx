"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/Toast";
import { bikeModels } from "@/data/bikeModels";

type Interactions = {
  /** Start a reservation. `what` may be undefined, a model id, a plan id
   *  ("p30"...), "city:<id>" or "waitlist:<modelId>". Routes to /book with
   *  prefill, or shows a toast for waitlist. */
  reserve: (what?: string) => void;
  /** Smooth-scroll to a section id on the landing, or route to /#id elsewhere. */
  nav: (id: string) => void;
  /** Go to the full /models page. */
  goModels: () => void;
  /** Show a transient toast message. */
  toast: (msg: string) => void;
};

const InteractionContext = createContext<Interactions | null>(null);

export function useInteractions(): Interactions {
  const ctx = useContext(InteractionContext);
  if (!ctx) throw new Error("useInteractions must be used within <InteractionProvider>");
  return ctx;
}

export function InteractionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  const toast = useCallback((m: string) => setMsg(m), []);

  const nav = useCallback(
    (id: string) => {
      if (typeof window === "undefined") return;
      if (id === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const el = document.getElementById(id);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: y, behavior: "smooth" });
      } else {
        router.push(`/#${id}`);
      }
    },
    [router],
  );

  const goModels = useCallback(() => router.push("/models"), [router]);

  const reserve = useCallback(
    (what?: string) => {
      if (!what) {
        router.push("/book");
        return;
      }
      if (what.startsWith("waitlist:")) {
        const m = bikeModels.find((x) => x.id === what.split(":")[1]);
        setMsg(`Added you to the ${m ? m.name : "model"} waitlist — we'll be in touch.`);
        return;
      }
      if (what.startsWith("city:")) {
        router.push(`/book?city=${what.split(":")[1]}`);
        return;
      }
      if (what.startsWith("p")) {
        router.push(`/book?plan=${what}`);
        return;
      }
      const m = bikeModels.find((x) => x.id === what);
      router.push(m ? `/book?model=${m.id}` : "/book");
    },
    [router],
  );

  return (
    <InteractionContext.Provider value={{ reserve, nav, goModels, toast }}>
      {children}
      <Toast msg={msg} onClose={() => setMsg("")} />
    </InteractionContext.Provider>
  );
}
