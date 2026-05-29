/** City availability types. */

export type CityStatus = "available" | "limited" | "soon";

export interface City {
  id: string;
  name: string;
  country: string;
  /** Number of available bikes; ignored when status is "soon". */
  available: number;
  pickup: string;
  status: CityStatus;
}
