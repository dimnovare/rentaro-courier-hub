import type { Metadata } from "next";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Accessories } from "@/components/sections/Accessories";

export const metadata: Metadata = {
  title: "Accessories & add-ons for delivery couriers | rentaro",
  description:
    "Kit out your shift with rentaro add-ons — extra batteries, delivery bags, phone holders, heavy-duty locks and more. Built for couriers, available with any plan.",
};

export default function AccessoriesPage() {
  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal className="section-head">
            <Kicker>Add-ons</Kicker>
            <h2 className="h-section">Gear that earns shifts.</h2>
            <p className="lead">
              Add the kit that fits your routine. From extra batteries for long delivery days to
              bags, holders and weatherproofing — every accessory is built for courier work and can
              be added to any rentaro plan.
            </p>
          </Reveal>
        </div>
      </section>
      <Accessories />
    </main>
  );
}
