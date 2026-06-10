import { getTranslations } from "next-intl/server";
import type { BikeModel } from "@/types";

type Cell = { k: string; v: string; u?: string };

function buildCells(m: BikeModel, t: (key: string) => string): Cell[] {
  const s = m.spec;
  if (!s) return m.specs;
  const c: Cell[] = [];
  const push = (k: string, v?: string | number, u?: string) => {
    if (v !== undefined && v !== null && v !== "") c.push({ k, v: String(v), u });
  };
  push(t("type"), s.bikeType);
  push(t("motor"), s.motorPowerW, "W");
  push(t("peakPower"), s.peakPowerW, "W");
  push(t("torque"), s.torqueNm, "Nm");
  if (s.batteryWh) push(t("battery"), s.batteryWh, "Wh");
  else if (s.batteryVoltage && s.batteryAh) push(t("battery"), `${s.batteryVoltage}V · ${s.batteryAh}Ah`);
  push(t("range"), s.rangeKm, "km");
  push(t("topSpeed"), s.topSpeedKmh, "km/h");
  push(t("charging"), s.chargingHours, "h");
  push(t("drive"), s.driveSystem);
  push(t("transmission"), s.transmission);
  push(t("ridingModes"), s.ridingModes);
  push(t("brakes"), s.brakes);
  push(t("suspension"), s.suspension);
  push(t("tyres"), s.tyres);
  push(t("display"), s.display);
  push(t("sensor"), s.sensor);
  push(t("lighting"), s.lighting);
  push(t("smart"), s.smartFeatures);
  push(t("maxLoad"), s.maxLoadKg, "kg");
  push(t("weight"), s.netWeightKg, "kg");
  push(t("maxClimb"), s.maxClimbDeg, "°");
  if (s.riderHeightMinCm && s.riderHeightMaxCm)
    push(t("riderHeight"), `${s.riderHeightMinCm}–${s.riderHeightMaxCm}`, "cm");
  push(t("certification"), s.certification);
  return c;
}

export async function SpecTable({ m }: { m: BikeModel }) {
  const t = await getTranslations("specTable");
  const cells = buildCells(m, t);
  const hasRange = !!m.spec?.rangeKm;
  // The .spec-full grid is 3 columns on desktop and 2 on mobile. When the cell
  // count doesn't fill the last row, the grid container's border colour shows
  // through the empty tracks as a dead grey box. Pad to the next multiple of 6
  // (LCM of 2 and 3) with on-brand HUD-bracket fillers so the grid ends evenly
  // and intentionally at both breakpoints.
  const fillerCount = (6 - (cells.length % 6)) % 6;
  return (
    <div>
      <div className="spec-full">
        {cells.map((s) => (
          <div className="spec-cell" key={s.k}>
            <div className="v">
              {s.v}
              {s.u && <span className="u">{s.u}</span>}
            </div>
            <div className="k">{s.k}</div>
          </div>
        ))}
        {Array.from({ length: fillerCount }).map((_, i) => (
          <div className="spec-cell" aria-hidden key={`filler-${i}`} style={{ position: "relative" }}>
            {/* faint lime HUD corner-bracket — "ilusa nurgaga" */}
            <span
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 14,
                height: 14,
                borderTop: "1px solid var(--lime)",
                borderRight: "1px solid var(--lime)",
                opacity: 0.28,
              }}
            />
            <span
              style={{
                position: "absolute",
                bottom: 14,
                left: 14,
                width: 14,
                height: 14,
                borderBottom: "1px solid var(--lime)",
                borderLeft: "1px solid var(--lime)",
                opacity: 0.28,
              }}
            />
          </div>
        ))}
      </div>
      {hasRange && (
        <div className="spec-note">
          {t("rangeNote")}
        </div>
      )}
    </div>
  );
}
