import { Hero } from "@/components/sections/Hero";
import { PopularModels } from "@/components/sections/PopularModels";
import { Showcase } from "@/components/sections/Showcase";
import { Pricing } from "@/components/sections/Pricing";
import { Fleet } from "@/components/sections/Fleet";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Cities } from "@/components/sections/Cities";
import { Accessories } from "@/components/sections/Accessories";
import { Service } from "@/components/sections/Service";
import { Faq } from "@/components/sections/Faq";
import { FinalCta } from "@/components/sections/FinalCta";

export default function Home() {
  return (
    <main>
      <Hero />
      <PopularModels />
      <Showcase />
      <Pricing />
      <Fleet />
      <HowItWorks />
      <Cities />
      <Accessories />
      <Service />
      <Faq />
      <FinalCta />
    </main>
  );
}
