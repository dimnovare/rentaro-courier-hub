import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { getIcon } from "@/components/ui/Icon";
import { accessories } from "@/data/accessories";

export function Accessories() {
  return (
    <section className="section-pad">
      <div className="wrap">
        <Reveal className="section-head">
          <Kicker>Add-ons</Kicker>
          <h2 className="h-section">Gear that earns shifts.</h2>
        </Reveal>
        <div className="acc-grid">
          {accessories.map((a, i) => {
            const Glyph = getIcon(a.icon);
            return (
              <Reveal key={a.id} delay={(i % 4) * 70}>
                <div className="acc">
                  <div className="ai">
                    <Glyph s={22} />
                  </div>
                  <div>
                    <div className="an">{a.name}</div>
                    <div className="ap">{a.price}</div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
