import type { AdminBooking } from "@/services/adminService";
import { AdminTable, Th, Td, EmptyRow, fmtDate, fmtDay } from "./Table";
import { StatusPill } from "./StatusPill";

export function BookingsTable({ bookings }: { bookings: AdminBooking[] }) {
  return (
    <AdminTable>
      <thead>
        <tr>
          <Th>Created</Th>
          <Th>Status</Th>
          <Th>Customer</Th>
          <Th>Contact</Th>
          <Th>City</Th>
          <Th>Model</Th>
          <Th>Plan</Th>
          <Th>Start</Th>
          <Th>Accessories</Th>
          <Th>Notes</Th>
        </tr>
      </thead>
      <tbody>
        {bookings.length === 0 ? (
          <EmptyRow colSpan={10} label="No bookings yet." />
        ) : (
          bookings.map((b) => (
            <tr key={b.id}>
              <Td mono nowrap>
                {fmtDate(b.createdAt)}
              </Td>
              <Td nowrap>
                <StatusPill value={b.status} />
              </Td>
              <Td nowrap>
                {b.customerFirstName} {b.customerLastName}
              </Td>
              <Td mono dim>
                <div>{b.customerEmail}</div>
                <div>{b.customerPhone}</div>
              </Td>
              <Td mono>{b.cityId}</Td>
              <Td mono>{b.modelId}</Td>
              <Td mono>{b.planId}</Td>
              <Td mono nowrap>
                {fmtDay(b.preferredStartDate)}
              </Td>
              <Td mono dim>
                {b.accessoryIds.length > 0 ? b.accessoryIds.join(", ") : "—"}
              </Td>
              <Td dim>{b.notes?.trim() ? b.notes : "—"}</Td>
            </tr>
          ))
        )}
      </tbody>
    </AdminTable>
  );
}
