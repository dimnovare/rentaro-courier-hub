"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Toast } from "@/components/ui/Toast";
import { WaitlistModal } from "@/components/ui/WaitlistModal";
import { bikeModels } from "@/data/bikeModels";
import { pricingPlans } from "@/data/pricingPlans";
import { track } from "@/services/analytics";

/** Respect prefers-reduced-motion for programmatic scrolls. */
function scrollBehavior(): ScrollBehavior {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reduce ? "auto" : "smooth";
}

type Interactions = {
  /** Start a reservation. `what` may be undefined, a model id, a plan id
   *  ("p30"...), "city:<id>" or "waitlist:<modelId>". Routes to /book with
   *  prefill, or opens the waitlist capture modal. `source` is analytics-only
   *  (the CTA location, e.g. "hero" / "nav" / "pricing") and never affects
   *  routing. `opts.modelName` is display-only — it lets the waitlist toast
   *  name API-only models that aren't in the static fallback list. */
  reserve: (
    what?: string,
    source?: string,
    opts?: { model?: string; modelName?: string },
  ) => void;
  /** Open the waitlist capture modal directly with explicit context. */
  openWaitlist: (opts: {
    cityId?: string;
    modelId?: string;
    modelName?: string;
    source: string;
  }) => void;
  /** Smooth-scroll to a section id on the landing, or route to /#id elsewhere. */
  nav: (id: string) => void;
  /** Go to the full /models page. `source` is analytics-only (the CTA location). */
  goModels: (source?: string) => void;
  /** Show a transient toast message. */
  toast: (msg: string) => void;
};

/** What the open waitlist modal should submit. `modelName` is display-only. */
type WaitlistTarget = {
  cityId?: string;
  modelId?: string;
  modelName?: string;
  source: string;
};

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

  const openWaitlist = useCallback((opts: WaitlistTarget) => {
    track("waitlist_opened", {
      source: opts.source,
      city: opts.cityId,
      model: opts.modelId,
    });
    setWaitlist(opts);
  }, []);

  const nav = useCallback(
    (id: string) => {
      if (typeof window === "undefined") return;
      if (id === "top") {
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
        return;
      }
      const el = document.getElementById(id);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: y, behavior: scrollBehavior() });
      } else {
        router.push(`/#${id}`);
      }
    },
    [router],
  );

  const goModels = useCallback(
    (source?: string) => {
      track("cta_view_all_models", { source });
      router.push("/models");
    },
    [router],
  );

  const reserve = useCallback(
    (what?: string, source?: string, opts?: { model?: string; modelName?: string }) => {
      if (!what) {
        track("cta_reserve", { source });
        router.push("/book");
        return;
      }
      if (what.startsWith("waitlist:")) {
        const id = what.split(":")[1];
        // A model with no stock routes into the waitlist instead of /book.
        track("waitlist_opened", { source: source ?? `model-${id}`, model: id });
        setWaitlist({ modelId: id, modelName: opts?.modelName, source: `model-${id}` });
        return;
      }
      if (what.startsWith("city:")) {
        const city = what.split(":")[1];
        track("cta_reserve", { source: source ?? "city", city });
        router.push(`/book?city=${city}`);
        return;
      }
      if (pricingPlans.some((p) => p.id === what)) {
        // Carry an optional chosen bike so the wizard opens with BOTH the plan and
        // the model pre-selected (bike-aware pricing section). Without a model it
        // stays the plan-only deep link the wizard already understands.
        track("cta_reserve", { source: source ?? "pricing", plan: what, model: opts?.model });
        router.push(opts?.model ? `/book?plan=${what}&model=${opts.model}` : `/book?plan=${what}`);
        return;
      }
      // Anything else is a model id. Do NOT gate it on the static bikeModels
      // list: admin-added (API-only) models aren't in the fallback, and gating
      // silently dropped their ?model= prefill. The wizard validates the id
      // against the live catalogue itself, so pass it straight through.
      track("cta_reserve", { source: source ?? "model", model: what });
      router.push(`/book?model=${encodeURIComponent(what)}`);
    },
    [router],
  );

  const value = useMemo(
    () => ({ reserve, openWaitlist, nav, goModels, toast }),
    [reserve, openWaitlist, nav, goModels, toast],
  );

  // Friendly success toast after a confirmed signup. Name the model when known:
  // prefer the caller-supplied display name (works for API-only models), then
  // the static list, then the raw id — never drop the model mention entirely.
  const onWaitlistSuccess = useCallback(() => {
    track("waitlist_submitted", {
      source: waitlist?.source,
      city: waitlist?.cityId,
      model: waitlist?.modelId,
    });
    const name =
      waitlist?.modelName ??
      (waitlist?.modelId
        ? (bikeModels.find((x) => x.id === waitlist.modelId)?.name ?? waitlist.modelId)
        : undefined);
    setMsg(name ? tw("toastModel", { model: name }) : tw("toast"));
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
