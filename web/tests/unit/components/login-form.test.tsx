import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks }));

import { LoginForm } from "@/app/login/login-form";

describe("LoginForm", () => {
  beforeEach(() => vi.clearAllMocks());

  function fillAndSubmit() {
    fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: "admin@test.com" } });
    fireEvent.change(screen.getByLabelText(/Contrase/), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /Iniciar sesi/ }));
  }

  it("toggles password visibility and navigates after success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) }));
    render(<LoginForm next="/routes" />);
    const password = screen.getByLabelText(/Contrase/) as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: /Mostrar/ }));
    expect(password.type).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: /Ocultar/ }));
    expect(password.type).toBe("password");
    fillAndSubmit();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/routes"));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it.each([
    [{ ok: false, json: vi.fn().mockResolvedValue({ message: "Invalid" }) }, "Invalid"],
    [{ ok: false, json: vi.fn().mockRejectedValue(new Error("bad json")) }, "No se pudo iniciar"],
  ])("renders HTTP login errors", async (response, expected) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    render(<LoginForm next="/dashboard" />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain(expected));
  });

  it("renders connection errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<LoginForm next="/dashboard" />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("No se pudo conectar"));
  });
});
