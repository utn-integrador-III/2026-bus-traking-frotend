import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    return <span role="img" aria-label={String(props.alt)} />;
  },
}));

vi.mock("@/app/(admin)/senior-requests/actions", () => ({
  approveSeniorRequestAction: mocks.approve,
  rejectSeniorRequestAction: mocks.reject,
}));

import { SeniorRequestList } from "@/components/admin/senior-request-list";

const request = {
  id: "request-1",
  passenger_id: "passenger-1",
  document_image_bucket: "cedulas",
  document_image_path: "registrations/document.jpg",
  document_image_url: "https://storage.example.com/document.jpg",
  status: "pending",
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  created_at: "2026-08-28T10:00:00Z",
  updated_at: "2026-08-28T10:00:00Z",
  user: {
    id: "passenger-1",
    name: "Carlos Marín",
    email: "carlos@example.com",
    is_active: false,
    deactivated_at: null,
    created_at: "2026-08-28T10:00:00Z",
  },
  passenger: {
    user_id: "passenger-1",
    phone: "88888888",
    notification_preferences: null,
    is_senior: false,
    expo_push_token: null,
    birth_date: "1961-08-28",
    senior_status: "pending",
  },
} as const;

describe("SeniorRequestList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.approve.mockResolvedValue({ ok: true });
    mocks.reject.mockResolvedValue({ ok: true });
  });

  it("shows applicant details and approves the account", async () => {
    render(<SeniorRequestList requests={[request]} />);
    fireEvent.click(screen.getByRole("button", { name: /Carlos Marín/ }));
    expect(screen.getByText("88888888")).toBeTruthy();
    expect(screen.getByRole("img", { name: /Documento de verificación/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Aprobar y activar/ }));
    await waitFor(() => expect(mocks.approve).toHaveBeenCalledWith("request-1"));
  });

  it("requires and sends a denial reason", async () => {
    render(<SeniorRequestList requests={[request]} />);
    fireEvent.click(screen.getByRole("button", { name: /Carlos Marín/ }));
    fireEvent.click(screen.getByRole("button", { name: "Denegar cuenta" }));
    fireEvent.change(screen.getByLabelText("Motivo de la denegación"), {
      target: { value: "Documento ilegible" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar denegación" }));
    await waitFor(() =>
      expect(mocks.reject).toHaveBeenCalledWith("request-1", "Documento ilegible"),
    );
  });

  it("shows the empty pending state", () => {
    render(<SeniorRequestList requests={[]} />);
    expect(screen.getByText("No hay solicitudes pendientes")).toBeTruthy();
  });
});
