/** Booking request types. Sent to the mock service now, the API later. */

import type { PlanId } from "./pricing";

export interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface BookingRequest {
  cityId: string;
  modelId: string;
  planId: PlanId;
  /** Server-authoritative package selected by current booking clients. */
  accessoryOfferCode: string | null;
  /** @deprecated Temporary compatibility for the pre-package booking UI. */
  accessoryIds?: string[];
  /** ISO date string (yyyy-mm-dd). */
  preferredStartDate: string;
  customer: CustomerDetails;
  notes?: string;
}

export type BookingStatus =
  | "submitted"
  | "awaiting_review"
  | "approved"
  | "rejected"
  | "cancelled";

export interface BookingResult {
  id: string;
  status: BookingStatus;
  createdAt: string;
}
