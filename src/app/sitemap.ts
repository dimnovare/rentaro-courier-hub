import type { MetadataRoute } from "next";
import { bikeModels } from "@/data/bikeModels";
import { cities } from "@/data/cities";

const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://rentaro-courier-hub.vercel.app").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/models",
    "/pricing",
    "/how-it-works",
    "/accessories",
    "/faq",
    "/rules",
    "/privacy",
    "/terms",
    "/book",
    "/monthly-ebike-rental",
    "/delivery-ebike-rental",
    "/ebike-rental-for-couriers",
  ];
  const modelRoutes = bikeModels.map((m) => `/models/${m.slug}`);
  const cityRoutes = cities.map((c) => `/cities/${c.id}`);
  const now = new Date();

  return [...staticRoutes, ...modelRoutes, ...cityRoutes].map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
  }));
}
