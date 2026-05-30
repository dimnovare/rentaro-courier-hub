"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Toast } from "@/components/ui/Toast";
import { WaitlistModal } from "@/components/ui/WaitlistModal";
import { bikeModels } from "@/data/bikeModels";

type Interactions = {
  /** Start a reservation. `what` may be undefined, a model id, a plan id
   *  ("p30"...), "city:<id>" or "waitlist:<modelId>". Routes to /book with
   *  prefill, or opens the waitlist capture modal. */
  reserve: (what?: string) => void;
  /** Open the waitlist capture modal directly with explicit context. */
  openWaitlist: (opts: { cityId?: string; modelId?: string; source: string }) => void;
  /** Smooth-scroll to a section id on the landing, or route to /#id elsewhere. */
  nav: (id: string) => void;
  /** Go to the full /models page. */
  goModels: () => void;
  /** Show a transient toast message. */
  toast: (msg: string) => void;
};

/** What the open waitlist modal should submit. */
type WaitlistTarget = { cityId?: string; modelId?: string; source: string };

const InteractionContext = createContext<Interactions | null>(null);

export function useInteractions(): Interactions {
  const ctx = useContext(InteractionContext);
  if (!ctx) throw new Error("useInteractions must be used within <InteractionProvider>");
  return ctx;
}

export function InteractionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const tw = useTranslations("waitlist");
  const [msg, setMsg] = useState("");
  const [waitlist, setWaitlist] = useState<WaitlistTarget | null>(null);

  const toast = useCallback((m: string) => setMsg(m), []);

  const openWaitlist = useCallback((opts: WaitlistTarget) => setWaitlist(opts), []);

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
        const id = what.split(":")[1];
        setWaitlist({ modelId: id, source: `model-${id}` });
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

  const value = useMemo(
    () => ({ reserve, openWaitlist, nav, goModels, toast }),
    [reserve, openWaitlist, nav, goModels, toast],
  );

  // Friendly success toast after a confirmed signup. Name the model when known.
  const onWaitlistSuccess = useCallback(() => {
    const model = waitlist?.modelId
      ? bikeModels.find((x) => x.id === waitlist.modelId)
      : undefined;
    setMsg(model ? tw("toastModel", { model: model.name }) : tw("toast"));
  }, [waitlist, tw]);

  return (
    <InteractionContext.Provider value={value}>
      {children}
      <Toast msg={msg} onClose={() => setMsg("")} />
      <WaitlistModal
        open={waitlist !== null}
        onClose={() => setWaitlist(null)}
        cityId={waitlist?.cityId}
        modelId={waitlist?.modelId}
        source={waitlist?.source ?? ""}
        onSuccess={onWaitlistSuccess}
      />
    </InteractionContext.Provider>
  );
}
