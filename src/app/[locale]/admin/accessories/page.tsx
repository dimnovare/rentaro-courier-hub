"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  createAccessoryUnit,
  createAccessoryUnitBatch,
  deleteAccessoryUnit,
  getAccessoryUnits,
  markAccessoryUnitAvailable,
  markAccessoryUnitLost,
  markAccessoryUnitMaintenance,
  receiveAccessoryUnit,
  retireAccessoryUnit,
  updateAccessoryUnit,
  AccessoryInventoryApiError,
} from "@/services/adminAccessoryInventoryService";
import {
  getAccessoryMetrics,
  AccessoryMetricsApiError,
} from "@/services/adminAccessoryMetricsService";
import {
  getAccessories,
  getCities,
  CatalogApiError,
  CatalogAuthError,
  type AdminAccessory,
  type AdminCity,
} from "@/services/adminCatalogService";
import type {
  AccessoryCondition,
  AccessoryInventoryFilters,
  AccessoryUnitLifecycleAction,
  AccessoryUnitStatus,
  AdminAccessoryMetrics,
  AdminAccessoryMetricsQuery,
  AdminAccessoryUnit,
  CreateAccessoryUnitBatchInput,
  CreateAccessoryUnitInput,
  UpdateAccessoryUnitInput,
} from "@/types/accessoryInventory";
import { AdminTable, EmptyRow, Td, Th } from "@/components/admin/Table";
import { StatusPill, statusLabel } from "@/components/admin/StatusPill";
import { ActionErrorBar, Banner, ErrorPanel, InlineError, Notice } from "@/components/admin/Feedback";
import { Drawer } from "@/components/admin/Drawer";
import { DrawerFooter } from "@/components/admin/DrawerFooter";
import { PageHeader } from "@/components/admin/PageHeader";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminRefresh } from "@/components/admin/useAdminRefresh";
import { confirmAction } from "@/lib/confirm";
import { formatEur } from "@/lib/money";
import { track } from "@/services/analytics";
import { Link } from "@/i18n/navigation";

const UNIT_STATUSES: readonly AccessoryUnitStatus[] = [
  "incoming",
  "available",
  "reserved",
  "assigned",
  "inspectionpending",
  "maintenance",
  "lost",
  "retired",
];
const CONDITIONS: readonly AccessoryCondition[] = ["new", "good", "worn", "damaged"];

interface PageFilters {
  from: string;
  to: string;
  cityId: string;
  accessoryCode: string;
  status: "" | AccessoryUnitStatus;
  condition: "" | AccessoryCondition;
}

interface PageData {
  units: AdminAccessoryUnit[];
  metrics: AdminAccessoryMetrics | null;
  accessories: AdminAccessory[];
  cities: AdminCity[];
  inventoryError: string | null;
  metricsError: string | null;
  catalogError: string | null;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "ready"; data: PageData }
  | { phase: "error"; message: string };

function defaultFilters(): PageFilters {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return {
    from: localIsoDate(from),
    to: localIsoDate(to),
    cityId: "",
    accessoryCode: "",
    status: "",
    condition: "",
  };
}

export default function AdminAccessoriesPage() {
  const { signOut } = useAdminAuth();
  const [filters, setFilters] = useState<PageFilters>(() => defaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<PageFilters>(() => defaultFilters());
  const [filterError, setFilterError] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [singleOpen, setSingleOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAccessoryUnit | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!silent) setState({ phase: "loading" });
      setActionError(null);

      const inventoryFilters = toInventoryFilters(appliedFilters);
      const metricsQuery = toMetricsQuery(appliedFilters);
      const [unitsResult, metricsResult, accessoriesResult, citiesResult] = await Promise.allSettled([
        getAccessoryUnits(inventoryFilters),
        getAccessoryMetrics(metricsQuery),
        getAccessories(),
        getCities(),
      ]);

      const failures = [unitsResult, metricsResult, accessoriesResult, citiesResult]
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => result.reason);
      if (failures.some(isUnauthorized)) {
        signOut();
        return;
      }

      if (unitsResult.status === "rejected" && metricsResult.status === "rejected") {
        setState({
          phase: "error",
          message: errorMessage(unitsResult.reason, "Could not load accessory operations."),
        });
        return;
      }

      setState((current) => {
        const previous = current.phase === "ready" ? current.data : null;
        return {
          phase: "ready",
          data: {
            units: unitsResult.status === "fulfilled" ? unitsResult.value : previous?.units ?? [],
            metrics:
              metricsResult.status === "fulfilled" ? metricsResult.value : previous?.metrics ?? null,
            accessories:
              accessoriesResult.status === "fulfilled"
                ? accessoriesResult.value
                : previous?.accessories ?? [],
            cities: citiesResult.status === "fulfilled" ? citiesResult.value : previous?.cities ?? [],
            inventoryError:
              unitsResult.status === "rejected"
                ? errorMessage(unitsResult.reason, "Inventory is temporarily unavailable.")
                : null,
            metricsError:
              metricsResult.status === "rejected"
                ? errorMessage(metricsResult.reason, "Metrics are temporarily unavailable.")
                : null,
            catalogError:
              accessoriesResult.status === "rejected"
                ? errorMessage(accessoriesResult.reason, "Accessory catalog is temporarily unavailable.")
                : citiesResult.status === "rejected"
                  ? errorMessage(citiesResult.reason, "City catalog is temporarily unavailable.")
                  : null,
          },
        };
      });
    },
    [appliedFilters, signOut],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useAdminRefresh(useCallback(() => void load({ silent: true }), [load]));

  function applyFilters() {
    if (filters.from && filters.to && filters.from > filters.to) {
      setFilterError("The start date must be on or before the end date.");
      return;
    }
    setFilterError(null);
    setAppliedFilters({ ...filters });
  }

  function patchUnit(updated: AdminAccessoryUnit) {
    setState((current) =>
      current.phase === "ready"
        ? {
            ...current,
            data: {
              ...current.data,
              units: current.data.units
                .map((unit) => (unit.id === updated.id ? updated : unit))
                .sort((a, b) => a.assetCode.localeCompare(b.assetCode)),
            },
          }
        : current,
    );
    setEditing((current) => (current?.id === updated.id ? updated : current));
  }

  function appendUnits(created: AdminAccessoryUnit[]) {
    setState((current) =>
      current.phase === "ready"
        ? {
            ...current,
            data: {
              ...current.data,
              units: [...current.data.units, ...created].sort((a, b) =>
                a.assetCode.localeCompare(b.assetCode),
              ),
            },
          }
        : current,
    );
  }

  async function transition(unit: AdminAccessoryUnit, action: AccessoryUnitLifecycleAction) {
    if ((action === "lost" || action === "retire") && !confirmAction(
      action === "lost"
        ? `Mark ${unit.assetCode} as lost? It will leave available stock immediately.`
        : `Retire ${unit.assetCode}? This cannot be returned to active stock.`,
      { finality: "irreversible" },
    )) {
      return;
    }

    setActionError(null);
    setNotice(null);
    setPending((current) => ({ ...current, [unit.id]: true }));
    try {
      const updated = await runTransition(unit.id, action);
      patchUnit(updated);
      setNotice(`${unit.assetCode}: ${statusLabel(updated.status)}.`);
      track(action === "lost" ? "admin_accessory_loss" : "admin_accessory_inventory_transition", {
        component_code: unit.accessoryCode,
        city: unit.cityId,
        outcome: action,
      });
    } catch (error) {
      if (isUnauthorized(error)) signOut();
      else setActionError(errorMessage(error, `Could not update ${unit.assetCode}.`));
    } finally {
      setPending((current) => {
        const next = { ...current };
        delete next[unit.id];
        return next;
      });
    }
  }

  async function createOne(input: CreateAccessoryUnitInput): Promise<string | null> {
    try {
      const created = await createAccessoryUnit(input);
      appendUnits([created]);
      setSingleOpen(false);
      setNotice(`${created.assetCode} added to accessory inventory.`);
      track("admin_accessory_inventory_created", {
        component_code: created.accessoryCode,
        city: created.cityId,
        outcome: created.status,
      });
      return null;
    } catch (error) {
      if (isUnauthorized(error)) {
        signOut();
        return null;
      }
      return errorMessage(error, "Could not add the accessory unit.");
    }
  }

  async function createBatch(input: CreateAccessoryUnitBatchInput): Promise<string | null> {
    try {
      const created = await createAccessoryUnitBatch(input);
      appendUnits(created);
      setBatchOpen(false);
      setNotice(`${created.length} accessory units added.`);
      track("admin_accessory_inventory_batch_created", {
        component_code: input.accessoryCode,
        city: input.cityId,
        outcome: input.status ?? "incoming",
      });
      return null;
    } catch (error) {
      if (isUnauthorized(error)) {
        signOut();
        return null;
      }
      return errorMessage(error, "Could not add the accessory batch.");
    }
  }

  async function saveEdit(id: number, input: UpdateAccessoryUnitInput): Promise<string | null> {
    try {
      const updated = await updateAccessoryUnit(id, input);
      patchUnit(updated);
      setEditing(null);
      setNotice(`${updated.assetCode} updated.`);
      track("admin_accessory_inventory_edited", {
        component_code: updated.accessoryCode,
        city: updated.cityId,
        outcome: updated.condition,
      });
      return null;
    } catch (error) {
      if (isUnauthorized(error)) {
        signOut();
        return null;
      }
      return errorMessage(error, "Could not update the accessory unit.");
    }
  }

  async function remove(unit: AdminAccessoryUnit): Promise<string | null> {
    if (!confirmAction(`Delete ${unit.assetCode}?`, { finality: "irreversible" })) return null;
    try {
      await deleteAccessoryUnit(unit.id);
      setState((current) =>
        current.phase === "ready"
          ? {
              ...current,
              data: {
                ...current.data,
                units: current.data.units.filter((row) => row.id !== unit.id),
              },
            }
          : current,
      );
      setEditing(null);
      setNotice(`${unit.assetCode} deleted.`);
      return null;
    } catch (error) {
      if (isUnauthorized(error)) {
        signOut();
        return null;
      }
      return errorMessage(error, `Could not delete ${unit.assetCode}.`);
    }
  }

  if (state.phase === "loading") return <Notice>Loading accessory inventory…</Notice>;
  if (state.phase === "error") {
    return <ErrorPanel message={state.message} config={false} onRetry={() => void load()} />;
  }

  const trackedAccessories = state.data.accessories.filter(
    (accessory) => accessory.isActive && accessory.inventoryTracked && !accessory.isBundle,
  );
  const canCreateUnits = trackedAccessories.length > 0 && state.data.cities.length > 0;

  return (
    <div>
      <PageHeader
        title="Accessories"
        subtitle="Physical accessory stock, customer-package performance, and custody outcomes."
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary" disabled={!canCreateUnits} onClick={() => setBatchOpen(true)}>
            Batch add
          </button>
          <button type="button" className="btn btn-primary" disabled={!canCreateUnits} onClick={() => setSingleOpen(true)}>
            + New unit
          </button>
        </div>
      </PageHeader>

      {actionError && <ActionErrorBar message={actionError} onDismiss={() => setActionError(null)} />}
      {notice && <Banner tone="ok" text={notice} />}
      {state.data.catalogError && <Banner tone="bad" text={state.data.catalogError} />}

      <FilterBar
        filters={filters}
        accessories={trackedAccessories}
        cities={state.data.cities}
        error={filterError}
        onChange={setFilters}
        onApply={applyFilters}
      />

      {state.data.metricsError && <Banner tone="bad" text={state.data.metricsError} />}
      {state.data.metrics ? (
        <MetricsPanel metrics={state.data.metrics} cities={state.data.cities} />
      ) : null}

      {state.data.inventoryError && <Banner tone="bad" text={state.data.inventoryError} />}
      <InventoryTable
        units={state.data.units}
        cities={state.data.cities}
        pending={pending}
        onEdit={setEditing}
        onTransition={(unit, action) => void transition(unit, action)}
      />

      <SingleUnitDrawer
        open={singleOpen}
        accessories={trackedAccessories}
        cities={state.data.cities}
        onClose={() => setSingleOpen(false)}
        onSubmit={createOne}
      />
      <BatchUnitDrawer
        open={batchOpen}
        accessories={trackedAccessories}
        cities={state.data.cities}
        onClose={() => setBatchOpen(false)}
        onSubmit={createBatch}
      />
      <EditUnitDrawer
        unit={editing}
        accessories={trackedAccessories}
        cities={state.data.cities}
        onClose={() => setEditing(null)}
        onSubmit={saveEdit}
        onDelete={remove}
      />
    </div>
  );
}

function FilterBar({
  filters,
  accessories,
  cities,
  error,
  onChange,
  onApply,
}: {
  filters: PageFilters;
  accessories: AdminAccessory[];
  cities: AdminCity[];
  error: string | null;
  onChange: (filters: PageFilters) => void;
  onApply: () => void;
}) {
  return (
    <section aria-label="Accessory filters" style={{ marginBottom: 28 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
          gap: 10,
          alignItems: "end",
        }}
      >
        <CompactInput label="From" type="date" value={filters.from} onChange={(value) => onChange({ ...filters, from: value })} />
        <CompactInput label="To" type="date" value={filters.to} onChange={(value) => onChange({ ...filters, to: value })} />
        <CompactSelect
          label="City"
          value={filters.cityId}
          options={[{ value: "", label: "All cities" }, ...cities.map((city) => ({ value: city.id, label: city.name }))]}
          onChange={(value) => onChange({ ...filters, cityId: value })}
        />
        <CompactSelect
          label="Component"
          value={filters.accessoryCode}
          options={[
            { value: "", label: "All components" },
            ...accessories.map((accessory) => ({ value: accessory.id, label: accessory.name })),
          ]}
          onChange={(value) => onChange({ ...filters, accessoryCode: value })}
        />
        <CompactSelect
          label="Status"
          value={filters.status}
          options={[
            { value: "", label: "All statuses" },
            ...UNIT_STATUSES.map((status) => ({ value: status, label: statusLabel(status) })),
          ]}
          onChange={(value) => onChange({ ...filters, status: value as PageFilters["status"] })}
        />
        <CompactSelect
          label="Condition"
          value={filters.condition}
          options={[
            { value: "", label: "All conditions" },
            ...CONDITIONS.map((condition) => ({ value: condition, label: titleCase(condition) })),
          ]}
          onChange={(value) => onChange({ ...filters, condition: value as PageFilters["condition"] })}
        />
        <button type="button" className="btn btn-secondary" onClick={onApply} style={{ minHeight: 42 }}>
          Apply filters
        </button>
      </div>
      {error && <div style={{ marginTop: 10 }}><InlineError message={error} /></div>}
    </section>
  );
}

function MetricsPanel({ metrics, cities }: { metrics: AdminAccessoryMetrics; cities: AdminCity[] }) {
  return (
    <section aria-labelledby="accessory-performance-heading" style={{ marginBottom: 42 }}>
      <SectionHeading id="accessory-performance-heading" title="Package performance" note={`${metrics.from} to ${metrics.to}${metrics.cityId ? ` · ${cityName(cities, metrics.cityId)}` : ""}`} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          marginBottom: 24,
        }}
      >
        <Metric label="Attach rate" value={formatPercent(metrics.attachRatePercent)} hint={`${metrics.attachedBookings} of ${metrics.eligibleBookings} bookings`} />
        <Metric label="Recurring revenue" value={formatEur(metrics.recurringAccessoryRevenue, { cents: false })} hint={metrics.currency} />
        <Metric label="Revenue / bike-month" value={formatEur(metrics.revenuePerActiveBikeMonth)} hint={`${formatNumber(metrics.activeBikeMonths)} active bike-months`} />
        <Metric label="Damage rate" value={formatPercent(metrics.damageRatePercent)} hint={`${metrics.damagedAssignments} of ${metrics.inspectedAssignments} inspected`} />
        <Metric label="Loss rate" value={formatPercent(metrics.lossRatePercent)} hint={`${metrics.lostAssignments} missing`} tone={metrics.lostAssignments > 0 ? "danger" : "default"} />
        <Metric label="Current stock" value={formatNumber(metrics.inventoryTotal)} hint="physical units" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: 24 }}>
        <div>
          <Subheading>Offer mix</Subheading>
          <AdminTable>
            <thead><tr><Th>Offer</Th><Th>Bookings</Th><Th>Share</Th><Th>Revenue</Th></tr></thead>
            <tbody>
              {metrics.offerMix.length === 0 ? (
                <EmptyRow colSpan={4} label="No paid accessory packages in this period." />
              ) : metrics.offerMix.map((offer) => (
                <tr key={offer.offerCode}>
                  <Td><strong>{offer.offerName}</strong><div className="mono" style={dimStyle}>{offer.offerCode}</div></Td>
                  <Td mono>{formatNumber(offer.bookingCount)}</Td>
                  <Td mono>{formatPercent(offer.sharePercent)}</Td>
                  <Td mono>{formatEur(offer.recurringRevenue, { cents: false })}</Td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </div>

        <div>
          <Subheading>Current stock</Subheading>
          <AdminTable>
            <thead><tr><Th>City</Th><Th>Component</Th><Th>Status</Th><Th>Units</Th></tr></thead>
            <tbody>
              {metrics.inventory.length === 0 ? (
                <EmptyRow colSpan={4} label="No current accessory stock." />
              ) : metrics.inventory.map((row) => (
                <tr key={`${row.cityId}-${row.componentCode}-${row.status}`}>
                  <Td>{cityName(cities, row.cityId)}</Td>
                  <Td>{row.componentName}</Td>
                  <Td nowrap><StatusPill value={row.status} /></Td>
                  <Td mono>{formatNumber(row.count)}</Td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </div>
      </div>
    </section>
  );
}

function InventoryTable({
  units,
  cities,
  pending,
  onEdit,
  onTransition,
}: {
  units: AdminAccessoryUnit[];
  cities: AdminCity[];
  pending: Record<number, boolean>;
  onEdit: (unit: AdminAccessoryUnit) => void;
  onTransition: (unit: AdminAccessoryUnit, action: AccessoryUnitLifecycleAction) => void;
}) {
  return (
    <section aria-labelledby="physical-units-heading" style={{ marginBottom: 42 }}>
      <SectionHeading id="physical-units-heading" title="Physical units" note={`${units.length} shown`} />
      <AdminTable>
        <thead>
          <tr>
            <Th>Asset</Th><Th>Component</Th><Th>City</Th><Th>Condition</Th><Th>Status</Th>
            <Th>Location</Th><Th>Custody</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {units.length === 0 ? (
            <EmptyRow colSpan={8} label="No physical accessory units for these filters." />
          ) : units.map((unit) => (
            <tr key={unit.id}>
              <Td mono nowrap><strong>{unit.assetCode}</strong></Td>
              <Td>{unit.accessoryName}<div className="mono" style={dimStyle}>{unit.accessoryCode}</div></Td>
              <Td>{cityName(cities, unit.cityId)}</Td>
              <Td nowrap><StatusPill value={unit.condition} tone={unit.condition === "damaged" ? "bad" : undefined} /></Td>
              <Td nowrap><StatusPill value={unit.status} /></Td>
              <Td dim>{unit.location || "—"}</Td>
              <Td nowrap>
                {unit.rentalId ? (
                  <Link
                    href={`/admin/rentals?id=${encodeURIComponent(unit.rentalId)}`}
                    aria-label={`Open ${unit.assetCode} rental`}
                    className="mono"
                    style={{ fontSize: 11, color: "var(--lime)" }}
                  >
                    open rental
                  </Link>
                ) : unit.assignmentId || unit.heldBookingId ? (
                  <span className="mono" style={{ fontSize: 11, color: "var(--warn)" }}>custody active</span>
                ) : unit.hasHistory ? (
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>history recorded</span>
                ) : (
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>unused</span>
                )}
              </Td>
              <Td nowrap>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => onEdit(unit)} disabled={pending[unit.id]} aria-label={`Edit ${unit.assetCode}`} style={actionStyle}>Edit</button>
                  {actionsFor(unit.status, unit.condition).map((action) => (
                    <button
                      key={action}
                      type="button"
                      className="btn btn-ghost"
                      disabled={pending[unit.id]}
                      aria-label={actionLabel(unit.assetCode, action)}
                      title={actionLabel(unit.assetCode, action)}
                      onClick={() => onTransition(unit, action)}
                      style={{ ...actionStyle, color: action === "lost" || action === "retire" ? "var(--danger)" : undefined }}
                    >
                      {actionText(action)}
                    </button>
                  ))}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </section>
  );
}

function SingleUnitDrawer({
  open,
  accessories,
  cities,
  onClose,
  onSubmit,
}: {
  open: boolean;
  accessories: AdminAccessory[];
  cities: AdminCity[];
  onClose: () => void;
  onSubmit: (input: CreateAccessoryUnitInput) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState(() => emptySingle());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft((current) => ({
      ...current,
      accessoryCode: current.accessoryCode || accessories[0]?.id || "",
      cityId: current.cityId || cities[0]?.id || "",
    }));
    setError(null);
  }, [open, accessories, cities]);

  async function submit() {
    if (!draft.assetCode.trim() || !draft.accessoryCode || !draft.cityId || busy) {
      setError("Asset code, component, and city are required.");
      return;
    }
    if (draft.status === "available" && draft.condition === "damaged") {
      setError("Damaged equipment must be kept in maintenance.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await onSubmit(cleanSingle(draft));
    setBusy(false);
    if (result) setError(result);
    else setDraft(emptySingle());
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New accessory unit"
      footer={<DrawerFooter busy={busy} onPrimary={() => void submit()} onCancel={onClose} primaryLabel="Add unit" />}
    >
      <UnitFields draft={draft} accessories={accessories} cities={cities} onChange={setDraft} />
      {error && <InlineError message={error} />}
    </Drawer>
  );
}

function BatchUnitDrawer({
  open,
  accessories,
  cities,
  onClose,
  onSubmit,
}: {
  open: boolean;
  accessories: AdminAccessory[];
  cities: AdminCity[];
  onClose: () => void;
  onSubmit: (input: CreateAccessoryUnitBatchInput) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState(() => emptyBatch());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft((current) => ({
      ...current,
      accessoryCode: current.accessoryCode || accessories[0]?.id || "",
      cityId: current.cityId || cities[0]?.id || "",
    }));
    setError(null);
  }, [open, accessories, cities]);

  const preview = useMemo(() => {
    const count = Math.min(Math.max(draft.count, 0), 5);
    return Array.from({ length: count }, (_, index) => `${draft.prefix}${draft.start + index}`.replace(/(\d+)$/, (value) => value.padStart(3, "0")));
  }, [draft.count, draft.prefix, draft.start]);

  async function submit() {
    if (!draft.prefix.trim() || !draft.accessoryCode || !draft.cityId || draft.count < 1 || draft.count > 500 || draft.start < 0 || busy) {
      setError("Prefix, component, city, a non-negative start, and a quantity from 1 to 500 are required.");
      return;
    }
    if (draft.status === "available" && draft.condition === "damaged") {
      setError("Damaged equipment must be kept in maintenance.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await onSubmit({ ...draft, prefix: draft.prefix.trim() });
    setBusy(false);
    if (result) setError(result);
    else setDraft(emptyBatch());
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Batch add accessory units"
      footer={<DrawerFooter busy={busy} onPrimary={() => void submit()} onCancel={onClose} primaryLabel={`Create ${draft.count} units`} />}
    >
      <FormSelect label="Component" value={draft.accessoryCode} options={accessories.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => setDraft({ ...draft, accessoryCode: value })} />
      <FormSelect label="City" value={draft.cityId} options={cities.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => setDraft({ ...draft, cityId: value })} />
      <div className="field-row">
        <FormText label="Asset-code prefix" value={draft.prefix} onChange={(value) => setDraft({ ...draft, prefix: value })} placeholder="BAT-" />
        <FormNumber label="Start number" value={draft.start} min={0} onChange={(value) => setDraft({ ...draft, start: value })} />
      </div>
      <FormNumber label="Quantity" value={draft.count} min={1} max={500} onChange={(value) => setDraft({ ...draft, count: value })} />
      <FormSelect
        label="Initial status"
        value={draft.status ?? "incoming"}
        options={[{ value: "incoming", label: "Incoming" }, { value: "available", label: "Available" }]}
        onChange={(value) => setDraft({
          ...draft,
          status: value as AccessoryUnitStatus,
          condition: value === "available" && draft.condition === "damaged" ? "good" : draft.condition,
        })}
      />
      <FormSelect
        label="Condition"
        value={draft.condition ?? "new"}
        options={conditionOptions(draft.status)}
        onChange={(value) => setDraft({ ...draft, condition: value as AccessoryCondition })}
      />
      <FormText label="Location" value={draft.location ?? ""} onChange={(value) => setDraft({ ...draft, location: value })} />
      <div className="field">
        <label>Generated asset codes</label>
        <p className="mono" style={{ margin: 0, color: "var(--lime)", fontSize: 12.5, lineHeight: 1.7, overflowWrap: "anywhere" }}>
          {preview.length ? preview.join(" · ") : "Set a quantity to preview codes."}{draft.count > 5 ? ` · +${draft.count - 5} more` : ""}
        </p>
      </div>
      {error && <InlineError message={error} />}
    </Drawer>
  );
}

function EditUnitDrawer({
  unit,
  accessories,
  cities,
  onClose,
  onSubmit,
  onDelete,
}: {
  unit: AdminAccessoryUnit | null;
  accessories: AdminAccessory[];
  cities: AdminCity[];
  onClose: () => void;
  onSubmit: (id: number, input: UpdateAccessoryUnitInput) => Promise<string | null>;
  onDelete: (unit: AdminAccessoryUnit) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState<AdminAccessoryUnit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(unit ? { ...unit } : null);
    setError(null);
  }, [unit]);

  if (!draft) return <Drawer open={false} onClose={onClose} title="Edit accessory unit">{null}</Drawer>;
  const custodyActive = hasActiveCustody(draft);
  const canDelete = !draft.hasHistory && !custodyActive;

  async function submit() {
    if (!draft || busy) return;
    if (draft.status === "available" && draft.condition === "damaged") {
      setError("Damaged equipment must be kept in maintenance.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await onSubmit(draft.id, {
      assetCode: draft.assetCode.trim(),
      accessoryCode: draft.accessoryCode,
      cityId: draft.cityId,
      serialNumber: draft.serialNumber?.trim() || null,
      location: draft.location?.trim() || null,
      condition: draft.condition,
      purchaseDate: draft.purchaseDate,
      purchaseCost: draft.purchaseCost,
      clearPurchaseCost: draft.purchaseCost == null,
      expectedArrivalDate: draft.expectedArrivalDate,
      notes: draft.notes?.trim() || null,
    });
    setBusy(false);
    if (result) setError(result);
  }

  async function removeCurrent() {
    if (!draft || !canDelete || busy) return;
    setBusy(true);
    setError(null);
    const result = await onDelete(draft);
    setBusy(false);
    if (result) setError(result);
  }

  return (
    <Drawer
      open={unit != null}
      onClose={onClose}
      title="Edit accessory unit"
      subtitle={draft.assetCode}
      footer={
        <DrawerFooter
          busy={busy}
          onPrimary={() => void submit()}
          onCancel={onClose}
          primaryLabel="Save"
          danger={canDelete ? { label: "Delete", onClick: () => void removeCurrent() } : undefined}
        />
      }
    >
      {custodyActive && <Banner tone="bad" text="Custody is active. Identity, city, component, and condition remain locked; use the rental workflow." />}
      {draft.hasHistory && <Banner tone="ok" text="Custody history is recorded for this unit. Retire it instead of deleting it." />}
      <UnitFields draft={draft} accessories={accessories} cities={cities} disabledIdentity={custodyActive} onChange={setDraft} />
      {error && <InlineError message={error} />}
    </Drawer>
  );
}

function UnitFields<T extends CreateAccessoryUnitInput | AdminAccessoryUnit>({
  draft,
  accessories,
  cities,
  disabledIdentity = false,
  onChange,
}: {
  draft: T;
  accessories: AdminAccessory[];
  cities: AdminCity[];
  disabledIdentity?: boolean;
  onChange: (draft: T) => void;
}) {
  return (
    <>
      <FormText label="Asset code" value={draft.assetCode} disabled={disabledIdentity} onChange={(value) => onChange({ ...draft, assetCode: value })} placeholder="BAT-001" />
      <FormSelect label="Component" value={draft.accessoryCode} disabled={disabledIdentity} options={accessories.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => onChange({ ...draft, accessoryCode: value })} />
      <FormSelect label="City" value={draft.cityId} disabled={disabledIdentity} options={cities.map((row) => ({ value: row.id, label: row.name }))} onChange={(value) => onChange({ ...draft, cityId: value })} />
      <div className="field-row">
        <FormSelect
          label="Initial status"
          value={("status" in draft ? draft.status : undefined) ?? "incoming"}
          disabled={"id" in draft}
          options={[{ value: "incoming", label: "Incoming" }, { value: "available", label: "Available" }]}
          onChange={(value) => onChange({
            ...draft,
            status: value as AccessoryUnitStatus,
            condition: value === "available" && draft.condition === "damaged" ? "good" : draft.condition,
          })}
        />
        <FormSelect
          label="Condition"
          value={draft.condition ?? "new"}
          disabled={disabledIdentity}
          options={conditionOptions("status" in draft ? draft.status : undefined)}
          onChange={(value) => onChange({ ...draft, condition: value as AccessoryCondition })}
        />
      </div>
      <FormText label="Serial number" value={draft.serialNumber ?? ""} disabled={disabledIdentity} onChange={(value) => onChange({ ...draft, serialNumber: value })} />
      <FormText label="Location" value={draft.location ?? ""} onChange={(value) => onChange({ ...draft, location: value })} />
      <div className="field-row">
        <FormText label="Purchase date" type="date" value={draft.purchaseDate ?? ""} onChange={(value) => onChange({ ...draft, purchaseDate: value || null })} />
        <FormMoney label="Purchase cost (€)" value={draft.purchaseCost ?? null} onChange={(value) => onChange({ ...draft, purchaseCost: value })} />
      </div>
      <FormText label="Expected arrival" type="date" value={draft.expectedArrivalDate ?? ""} onChange={(value) => onChange({ ...draft, expectedArrivalDate: value || null })} />
      <FormTextArea label="Internal notes" value={draft.notes ?? ""} onChange={(value) => onChange({ ...draft, notes: value })} />
    </>
  );
}

function Metric({ label, value, hint, tone = "default" }: { label: string; value: string; hint: string; tone?: "default" | "danger" }) {
  return (
    <div style={{ padding: "18px 16px", borderRight: "1px solid var(--border)", minWidth: 0 }}>
      <strong style={{ display: "block", color: tone === "danger" ? "var(--danger)" : "var(--text)", fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: 0, fontVariantNumeric: "tabular-nums" }}>{value}</strong>
      <span className="mono" style={{ display: "block", marginTop: 7, fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span className="mono" style={{ display: "block", marginTop: 4, fontSize: 10.5, color: "var(--text-dim)", overflowWrap: "anywhere" }}>{hint}</span>
    </div>
  );
}

function SectionHeading({ id, title, note }: { id: string; title: string; note?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 13 }}>
      <h2 id={id} style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 0 }}>{title}</h2>
      {note && <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>{note}</span>}
    </div>
  );
}

function Subheading({ children }: { children: ReactNode }) {
  return <h3 className="mono" style={{ margin: "0 0 10px", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{children}</h3>;
}

function CompactInput({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mono" style={compactLabelStyle}>{label}<input aria-label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} style={compactControlStyle} /></label>
  );
}

function CompactSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="mono" style={compactLabelStyle}>{label}<select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} style={compactControlStyle}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
  );
}

function FormText({ label, value, onChange, placeholder, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; disabled?: boolean }) {
  return <div className="field"><label>{label}</label><input aria-label={label} type={type} value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></div>;
}

function FormTextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="field"><label>{label}</label><textarea aria-label={label} value={value} rows={4} onChange={(event) => onChange(event.target.value)} style={{ resize: "vertical" }} /></div>;
}

function FormSelect({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: readonly { value: string; label: string; disabled?: boolean }[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <div className="field"><label>{label}</label><select aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} style={formSelectStyle}>{options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select></div>;
}

function FormNumber({ label, value, onChange, min, max }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  return <div className="field"><label>{label}</label><input aria-label={label} type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value) || 0)} /></div>;
}

function FormMoney({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return <div className="field"><label>{label}</label><input aria-label={label} type="number" inputMode="decimal" min={0} step="0.01" value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} /></div>;
}

function emptySingle(): CreateAccessoryUnitInput {
  return { assetCode: "", accessoryCode: "", cityId: "", status: "incoming", condition: "new", serialNumber: null, location: null, purchaseDate: null, purchaseCost: null, expectedArrivalDate: null, notes: null };
}

function cleanSingle(input: CreateAccessoryUnitInput): CreateAccessoryUnitInput {
  return { ...input, assetCode: input.assetCode.trim(), serialNumber: input.serialNumber?.trim() || null, location: input.location?.trim() || null, notes: input.notes?.trim() || null };
}

function emptyBatch(): CreateAccessoryUnitBatchInput {
  return { accessoryCode: "", cityId: "", prefix: "", start: 1, count: 1, status: "incoming", condition: "new", location: null };
}

function toInventoryFilters(filters: PageFilters): AccessoryInventoryFilters {
  return {
    ...(filters.cityId ? { cityId: filters.cityId } : {}),
    ...(filters.accessoryCode ? { accessoryCode: filters.accessoryCode } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.condition ? { condition: filters.condition } : {}),
  };
}

function toMetricsQuery(filters: PageFilters): AdminAccessoryMetricsQuery {
  return { from: filters.from, to: filters.to, ...(filters.cityId ? { cityId: filters.cityId } : {}) };
}

function actionsFor(status: AccessoryUnitStatus, condition: AccessoryCondition): AccessoryUnitLifecycleAction[] {
  const actions: AccessoryUnitLifecycleAction[] = (() => {
  switch (status) {
    case "incoming": return ["receive", "lost", "retire"];
    case "available":
    case "inspectionpending": return ["maintenance", "lost", "retire"];
    case "maintenance": return ["available", "lost", "retire"];
    case "lost": return ["retire"];
    default: return [];
  }
  })();
  return condition === "damaged" ? actions.filter((action) => action !== "available") : actions;
}

function conditionOptions(status?: AccessoryUnitStatus) {
  return CONDITIONS.map((condition) => ({
    value: condition,
    label: titleCase(condition),
    disabled: status === "available" && condition === "damaged",
  }));
}

function runTransition(id: number, action: AccessoryUnitLifecycleAction): Promise<AdminAccessoryUnit> {
  switch (action) {
    case "receive": return receiveAccessoryUnit(id);
    case "maintenance": return markAccessoryUnitMaintenance(id);
    case "available": return markAccessoryUnitAvailable(id);
    case "lost": return markAccessoryUnitLost(id);
    case "retire": return retireAccessoryUnit(id);
  }
}

function actionLabel(assetCode: string, action: AccessoryUnitLifecycleAction): string {
  switch (action) {
    case "receive": return `Receive ${assetCode}`;
    case "maintenance": return `Move ${assetCode} to maintenance`;
    case "available": return `Mark ${assetCode} available`;
    case "lost": return `Mark ${assetCode} lost`;
    case "retire": return `Retire ${assetCode}`;
  }
}

function actionText(action: AccessoryUnitLifecycleAction): string {
  switch (action) {
    case "receive": return "Receive";
    case "maintenance": return "Maintenance";
    case "available": return "Available";
    case "lost": return "Lost";
    case "retire": return "Retire";
  }
}

function hasActiveCustody(unit: AdminAccessoryUnit): boolean {
  return unit.status === "reserved" || unit.status === "assigned" || unit.status === "inspectionpending" || unit.heldBookingId != null || unit.assignmentId != null;
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof CatalogAuthError ||
    (error instanceof CatalogApiError && error.unauthorized) ||
    (error instanceof AccessoryInventoryApiError && error.unauthorized) ||
    (error instanceof AccessoryMetricsApiError && error.unauthorized);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cityName(cities: AdminCity[], id: string): string {
  return cities.find((city) => city.id === id)?.name ?? id;
}

function formatPercent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function titleCase(value: string): string {
  return statusLabel(value);
}

const compactLabelStyle: CSSProperties = { display: "grid", gap: 6, fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" };
const compactControlStyle: CSSProperties = { width: "100%", minHeight: 42, padding: "9px 11px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 0 };
const formSelectStyle: CSSProperties = { width: "100%", padding: "13px 15px", borderRadius: "var(--r-sm)", background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: 0 };
const actionStyle: CSSProperties = { padding: "6px 9px", minHeight: 30, fontSize: 11.5 };
const dimStyle: CSSProperties = { marginTop: 3, color: "var(--text-dim)", fontSize: 10.5 };
