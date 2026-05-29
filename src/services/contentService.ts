import { faqs } from "@/data/faq";
import { trust, steps } from "@/data/content";
import type { Faq, Step } from "@/types";
import { apiGet } from "./api";

export const contentService = {
  getFaqs: () => apiGet<Faq[]>("/api/public/faq", faqs),
  getTrust: () => apiGet<string[]>("/api/public/trust", trust),
  getSteps: () => apiGet<Step[]>("/api/public/steps", steps),
};
