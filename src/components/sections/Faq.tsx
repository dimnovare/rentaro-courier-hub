import { FaqView } from "./FaqView";
import { contentService } from "@/services/contentService";
import { defaultOpenFaq } from "@/data/faq";

export async function Faq() {
  const faqs = await contentService.getFaqs();
  return <FaqView count={faqs.length} defaultOpen={defaultOpenFaq} />;
}
