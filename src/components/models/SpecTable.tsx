import type { BikeModel } from "@/types";

type Cell = { k: string; v: string; u?: string };

function buildCells(m: BikeModel): Cell[] {
  const s = m.spec;
  if (!s) return m.specs;
  const c: Cell[] = [];
  const push = (k: string, v?: string | number, u?: string) => {
    if (v !== undefined && v !== null && v !== "") c.push({ k, v: String(v), u });
  };
  push("Type", s.bikeType);
  push("Motor", s.motorPowerW, "W");
  push("Peak power", s.peakPowerW, "W");
  push("Torque", s.torqueNm, "Nm");
  if (s.batteryWh) push("Battery", s.batteryWh, "Wh");
  else if (s.batteryVoltage && s.batteryAh) push("Battery", `${s.batteryVoltage}V · ${s.batteryAh}Ah`);
  push("Range", s.rangeKm, "km");
  push("Top speed", s.topSpeedKmh, "km/h");
  push("Charging", s.chargingHours, "h");
  push("Drive", s.driveSystem);
  push("Transmission", s.transmission);
  push("Riding modes", s.ridingModes);
  push("Brakes", s.brakes);
  push("Suspension", s.suspension);
  push("Tyres", s.tyres);
  push("Display", s.display);
  push("Sensor", s.sensor);
  push("Lighting", s.lighting);
  push("Smart", s.smartFeatures);
  push("Max load", s.maxLoadKg, "kg");
  push("Weight", s.netWeightKg, "kg");
  push("Max climb", s.maxClimbDeg, "°");
  if (s.riderHeightMinCm && s.riderHeightMaxCm)
    push("Rider height", `${s.riderHeightMinCm}–${s.riderHeightMaxCm}`, "cm");
  push("Certification", s.certification);
  return c;
}

export function SpecTable({ m }: { m: BikeModel }) {
  const cells = buildCells(m);
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
          Range is a manufacturer estimate — real distance varies with load, terrain, weather
          and rider.
        </div>
      )}
    </div>
  );
}
