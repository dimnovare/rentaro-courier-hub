import type { AdminFleet } from "@/services/adminService";
import { AdminTable, Th, Td, EmptyRow } from "./Table";
import { StatusPill } from "./StatusPill";

function ModelSummaryCard({
  name,
  brand,
  status,
  availability,
  unitCount,
}: {
  name: string;
  brand: string;
  status: string;
  availability: number;
  unitCount: number;
}) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: "-0.02em" }}>
            {name}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            {brand}
          </div>
        </div>
        <StatusPill value={status} />
      </div>
      <div
        style={{
          display: "flex",
          gap: 22,
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px dashed var(--border)",
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--lime)", lineHeight: 1 }}>
            {availability}
          </div>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginTop: 5 }}>
            Available
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--text)", lineHeight: 1 }}>
            {unitCount}
          </div>
          <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginTop: 5 }}>
            Units
          </div>
        </div>
      </div>
    </div>
  );
}

export function FleetView({ fleet }: { fleet: AdminFleet }) {
  const unitsByModel = new Map<string, number>();
  for (const u of fleet.units) {
    unitsByModel.set(u.modelId, (unitsByModel.get(u.modelId) ?? 0) + 1);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Models summary */}
      <div>
        <h3 className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12, fontWeight: 500 }}>
          Models · {fleet.models.length}
        </h3>
        {fleet.models.length === 0 ? (
          <div className="card mono" style={{ padding: "22px", textAlign: "center", color: "var(--text-dim)", fontSize: 12 }}>
            No models.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {fleet.models.map((m) => (
              <ModelSummaryCard
                key={m.id}
                name={m.name}
                brand={m.brand}
                status={m.status}
                availability={m.availability}
                unitCount={unitsByModel.get(m.id) ?? 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Units table */}
      <div>
        <h3 className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12, fontWeight: 500 }}>
          Units · {fleet.units.length}
        </h3>
        <AdminTable>
          <thead>
            <tr>
              <Th>Internal code</Th>
              <Th>Model</Th>
              <Th>City</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {fleet.units.length === 0 ? (
              <EmptyRow colSpan={4} label="No bike units." />
            ) : (
              fleet.units.map((u) => (
                <tr key={u.internalCode}>
                  <Td mono>{u.internalCode}</Td>
                  <Td mono dim>
                    {u.modelId}
                  </Td>
                  <Td mono>{u.cityId}</Td>
                  <Td nowrap>
                    <StatusPill value={u.status} />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </AdminTable>
      </div>
    </div>
  );
}
