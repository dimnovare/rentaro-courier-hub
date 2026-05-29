"use client";

import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { Kicker } from "@/components/ui/Kicker";
import { Ic } from "@/components/ui/Icon";
import { faqs, defaultOpenFaq } from "@/data/faq";

export function Faq() {
  const [open, setOpen] = useState(defaultOpenFaq);
  const half = Math.ceil(faqs.length / 2);
  const cols = [faqs.slice(0, half), faqs.slice(half)];

  return (
    <section className="section-pad">
      <div className="wrap">
        <Reveal className="section-head center">
          <Kicker>FAQ</Kicker>
          <h2 className="h-section">Quick answers.</h2>
        </Reveal>
        <div className="faq-grid">
          {cols.map((col, ci) => (
            <div key={ci} className="faq-col">
              {col.map((f, j) => {
                const idx = ci === 0 ? j : half + j;
                const isOpen = open === idx;
                return (
                  <div key={idx} className={`faq-item ${isOpen ? "open" : ""}`}>
                    <button
                      className="faq-q"
                      onClick={() => setOpen(isOpen ? -1 : idx)}
                      aria-expanded={isOpen}
                    >
                      <span>{f.q}</span>
                      <span className="ic">
                        <Ic.plus s={12} />
                      </span>
                    </button>
                    <div className="faq-a">
                      <div className="faq-a-in">{f.a}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
