import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TripList } from "@/components/admin/trip-list";

describe("TripList", () => {
  it("renders the empty state", () => {
    render(<TripList trips={[]} routes={[]} drivers={[]} />);
    expect(screen.getByText("La API no devolvió viajes.")).toBeTruthy();
  });

  it("orders trips and resolves route and driver names", () => {
    render(
      <TripList
        trips={[
          { id: "old", route_id: "route-1", bus_id: "bus", driver_id: "driver-1", departure_time: "2026-01-01T08:00:00Z", status: "Scheduled" },
          { id: "new", route_id: "missing", bus_id: "bus", departure_time: "invalid", status: "Delayed" },
        ] as never}
        routes={[{ id: "route-1", name: "Central" }] as never}
        drivers={[{ user_id: "driver-1", name: "Ana", email: "ana@example.com" }] as never}
      />,
    );

    expect(screen.getByText("Central")).toBeTruthy();
    expect(screen.getByText("Ruta desconocida")).toBeTruthy();
    expect(screen.getByText("Con demora")).toBeTruthy();
    expect(screen.getByText(/Ana/)).toBeTruthy();
    expect(screen.getByText(/Sin hora/)).toBeTruthy();
  });
});
