import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

function request(pathname: string, token?: string) {
  const url = new URL(`http://localhost${pathname}`);
  return {
    nextUrl: Object.assign(url, { clone: () => new URL(url.href) }),
    cookies: { get: () => token ? { value: token } : undefined },
  } as never;
}

describe("middleware", () => {
  it("redirects unauthenticated protected pages", () => {
    const dashboard = middleware(request("/dashboard"));
    expect(dashboard.status).toBeGreaterThanOrEqual(300);
    expect(dashboard.headers.get("location")).toBe("http://localhost/login");
    const nested = middleware(request("/routes/r1/edit"));
    expect(nested.headers.get("location")).toContain("next=%2Froutes%2Fr1%2Fedit");
  });

  it("allows public and authenticated requests", () => {
    expect(middleware(request("/login")).headers.get("x-middleware-next")).toBe("1");
    expect(middleware(request("/trips", "jwt")).headers.get("x-middleware-next")).toBe("1");
  });
});
