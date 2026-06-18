import { FaqView } from "./FaqView";
import { contentService } from "@/services/contentService";
import { cityService } from "@/services/cityService";
import { defaultOpenFaq } from "@/data/faq";

export async function Faq() {
  const [faqs, cities] = await Promise.all([
    contentService.getFaqs(),
    cityService.getCities(),
  ]);
  // Live/soon city-id split fed to the pickup answer so it derives from real
  // status (FaqView localizes the ids via cities.names.*). A city is live once
  // it is no longer "soon".
  const liveCityIds = cities.filter((c) => c.status !== "soon").map((c) => c.id);
  const soonCityIds = cities.filter((c) => c.status === "soon").map((c) => c.id);
  return (
    <FaqView
      count={faqs.length}
      defaultOpen={defaultOpenFaq}
      liveCityIds={liveCityIds}
      soonCityIds={soonCityIds}
    />
  );
}
