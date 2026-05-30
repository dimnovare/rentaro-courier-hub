import { CitiesView } from "./CitiesView";
import { cityService } from "@/services/cityService";

export async function Cities() {
  const cities = await cityService.getCities();
  return <CitiesView cities={cities} />;
}
