"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { Ic } from "@/components/ui/Icon";

type Summary = {
  id: string;
  model: string;
  plan: string;
  monthly: number;
  city: string;
  startDate: string;
  firstName: string;
  accessories: string[];
};

export default function BookingSuccessPage() {
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("rentaro_booking");
      if (raw) setS(JSON.parse(raw) as Summary);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <main>
      <section className="section-pad" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <Reveal>
            <div className="final" style={{ marginTop: 0 }}>
              <div className="final-inner">
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--lime)",
                    color: "var(--lime-ink)",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 22px",
                    boxShadow: "0 0 40px -6px var(--lime-glow)",
                  }}
                >
                  <Ic.check s={28} />
                </div>
                <h2>Request received{s?.firstName ? `, ${s.firstName}` : ""}.</h2>
                <p>
                  We&apos;ll confirm availability and send your digital contract by email shortly
                  — no payment has been taken.
                </p>

                {s && (
                  <article
                    className="card"
                    style={{ maxWidth: 440, margin: "8px auto 30px", textAlign: "left" }}
                  >
                    <div style={{ padding: "6px 20px" }}>
                      <div className="summary-row">
                        <span className="l">Reference</span>
                        <span className="v mono">{s.id}</span>
                      </div>
                      <div className="summary-row">
                        <span className="l">Model</span>
                        <span className="v">{s.model}</span>
                      </div>
                      <div className="summary-row">
                        <span className="l">Plan</span>
                        <span className="v">{s.plan}</span>
                      </div>
                      <div className="summary-row">
                        <span className="l">City</span>
                        <span className="v">{s.city}</span>
                      </div>
                      <div className="summary-row" style={{ borderBottom: "none" }}>
                        <span className="l">Start date</span>
                        <span className="v">{s.startDate}</span>
                      </div>
                    </div>
                  </article>
                )}

                <div style={{ display: "flex", gap: 13, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link className="btn btn-primary btn-lg" href="/models">
                    Browse the fleet
                    <span className="arrow">
                      <Ic.arrow />
                    </span>
                  </Link>
                  <Link className="btn btn-ghost btn-lg" href="/">
                    Back home
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
