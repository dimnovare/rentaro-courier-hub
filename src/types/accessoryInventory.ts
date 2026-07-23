/** Exact camelCase mirrors of the accessory inventory, custody, and metric APIs. */

export type AccessoryUnitStatus =
  | "incoming"
  | "available"
  | "reserved"
  | "assigned"
  | "inspectionpending"
  | "maintenance"
  | "lost"
  | "retired";

export type AccessoryCondition = "new" | "good" | "worn" | "damaged";

export type AccessoryAssignmentOutcome =
  | "assigned"
  | "handedover"
  | "returned"
  | "damaged"
  | "missing"
  | "retained";

export type AccessoryDepositStatus =
  | "notrequired"
  | "due"
  | "collected"
  | "refunded"
  | "partially_retained"
  | "retained";

export interface AdminAccessoryUnit {
  id: number;
  assetCode: string;
  accessoryCode: string;
  accessoryName: string;
  serialNumber: string | null;
  cityId: string;
  location: string | null;
  status: AccessoryUnitStatus;
  condition: AccessoryCondition;
  purchaseDate: string | null;
  purchaseCost: number | null;
  expectedArrivalDate: string | null;
  notes: string | null;
  heldBookingId: string | null;
  holdExpiresAt: string | null;
  assignmentId: string | null;
  rentalId: string | null;
  hasHistory: boolean;
}

export interface AccessoryInventoryFilters {
  cityId?: string;
  accessoryCode?: string;
  status?: AccessoryUnitStatus;
  condition?: AccessoryCondition;
}

export interface CreateAccessoryUnitInput {
  assetCode: string;
  accessoryCode: string;
  cityId: string;
  status?: AccessoryUnitStatus;
  condition?: AccessoryCondition;
  serialNumber?: string | null;
  location?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  expectedArrivalDate?: string | null;
  notes?: string | null;
}

export interface CreateAccessoryUnitBatchInput {
  accessoryCode: string;
  cityId: string;
  prefix: string;
  start: number;
  count: number;
  status?: AccessoryUnitStatus;
  condition?: AccessoryCondition;
  location?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  expectedArrivalDate?: string | null;
  notes?: string | null;
}

export interface UpdateAccessoryUnitInput {
  assetCode?: string;
  accessoryCode?: string;
  cityId?: string;
  serialNumber?: string | null;
  location?: string | null;
  condition?: AccessoryCondition;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  clearPurchaseCost?: boolean;
  expectedArrivalDate?: string | null;
  notes?: string | null;
}

export type AccessoryUnitLifecycleAction =
  | "receive"
  | "maintenance"
  | "available"
  | "lost"
  | "retire";

export interface AccessoryHandoverItem {
  accessoryUnitId: number;
  condition: AccessoryCondition;
  notes?: string | null;
}

export interface AccessoryHandoverInput {
  items: AccessoryHandoverItem[];
}

export interface AccessoryDepositUpdateInput {
  status: AccessoryDepositStatus;
  retainedAmount?: number | null;
  reason?: string | null;
}

export interface AccessoryInspectionInput {
  accessoryUnitId: number;
  outcome: AccessoryAssignmentOutcome;
  condition?: AccessoryCondition | null;
  notes?: string | null;
}

export interface AdminRentalAccessory {
  assignmentId: string;
  accessoryUnitId: number;
  assetCode: string;
  serialNumber: string | null;
  cityId: string;
  accessoryCode: string;
  accessoryName: string;
  unitStatus: AccessoryUnitStatus;
  unitCondition: AccessoryCondition;
  outcome: AccessoryAssignmentOutcome;
  outboundCondition: AccessoryCondition;
  outboundNotes: string | null;
  inboundCondition: AccessoryCondition | null;
  inspectionNotes: string | null;
  replacementValue: number;
  depositAmount: number;
  depositStatus: AccessoryDepositStatus;
  retainedAmount: number;
  retainedReason: string | null;
  assignedAt: string;
  handedOverAt: string | null;
  returnedAt: string | null;
  completedAt: string | null;
}

export interface AdminRentalAccessoryResponse {
  depositDue: boolean;
  offerCode: string | null;
  items: AdminRentalAccessory[];
}

export interface AdminAccessoryOfferMetric {
  offerCode: string;
  offerName: string;
  bookingCount: number;
  sharePercent: number;
  recurringRevenue: number;
}

export interface AdminAccessoryInventoryMetric {
  cityId: string;
  componentCode: string;
  componentName: string;
  status: AccessoryUnitStatus;
  count: number;
}

export interface AdminAccessoryMetrics {
  from: string;
  to: string;
  cityId: string | null;
  eligibleBookings: number;
  attachedBookings: number;
  attachRatePercent: number;
  offerMix: AdminAccessoryOfferMetric[];
  activeBikeMonths: number;
  recurringAccessoryRevenue: number;
  revenuePerActiveBikeMonth: number;
  inventoryTotal: number;
  inventory: AdminAccessoryInventoryMetric[];
  inspectedAssignments: number;
  damagedAssignments: number;
  damageRatePercent: number;
  lostAssignments: number;
  lossRatePercent: number;
  currency: string;
}

export interface AdminAccessoryMetricsQuery {
  from?: string;
  to?: string;
  cityId?: string;
}
