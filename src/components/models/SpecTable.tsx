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
      </div>
      {hasRange && (
        <div className="spec-note">
          {t("rangeNote")}
        </div>
      )}
    </div>
  );
}
