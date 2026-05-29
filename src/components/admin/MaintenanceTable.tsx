import type { AdminMaintenanceTicket } from "@/services/adminService";
import { AdminTable, Th, Td, EmptyRow, fmtDate } from "./Table";
import { StatusPill } from "./StatusPill";

export function MaintenanceTable({ tickets }: { tickets: AdminMaintenanceTicket[] }) {
  return (
    <AdminTable>
      <thead>
        <tr>
          <Th>Created</Th>
          <Th>Bike unit</Th>
          <Th>Issue</Th>
          <Th>Priority</Th>
          <Th>Status</Th>
          <Th>Description</Th>
        </tr>
      </thead>
      <tbody>
        {tickets.length === 0 ? (
          <EmptyRow colSpan={6} label="No maintenance tickets." />
        ) : (
          tickets.map((t) => (
            <tr key={t.id}>
              <Td mono nowrap>
                {fmtDate(t.createdAt)}
              </Td>
              <Td mono>{t.bikeUnitCode}</Td>
              <Td nowrap>{t.issueType.replace(/_/g, " ")}</Td>
              <Td nowrap>
                <StatusPill value={t.priority} />
              </Td>
              <Td nowrap>
                <StatusPill value={t.status} />
              </Td>
              <Td dim>{t.description?.trim() ? t.description : "—"}</Td>
            </tr>
          ))
        )}
      </tbody>
    </AdminTable>
  );
}
