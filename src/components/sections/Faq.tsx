import { FaqView } from "./FaqView";
import { contentService } from "@/services/contentService";
import { cityService } from "@/services/cityService";
import { defaultOpenFaq } from "@/data/faq";

export async function Faq() {
  const [faqs, cities] = await Promise.all([
    contentService.getFaqs(),
    cityService.getCities(),
  ]);
  // Live/soon city split fed to the pickup answer so it derives from real
  // status (FaqView localizes via cities.names.*, falling back to the API name
  // for admin-added cities with no message key). A city is live once it is no
  // longer "soon".
  const liveCities = cities
    .filter((c) => c.status !== "soon")
    .map((c) => ({ id: c.id, name: c.name }));
  const soonCities = cities
    .filter((c) => c.status === "soon")
    .map((c) => ({ id: c.id, name: c.name }));
  return (
    <FaqView
      count={faqs.length}
      defaultOpen={defaultOpenFaq}
      liveCities={liveCities}
      soonCities={soonCities}
    />
  );
}
