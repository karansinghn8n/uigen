import { test, expect, vi, beforeEach } from "vitest";

// Mock "server-only" so it doesn't throw outside a Next.js server context
vi.mock("server-only", () => ({}));

// ── jose mocks ──────────────────────────────────────────────────────────────
const mockSign = vi.fn();
const mockSignJWTInstance = {
  setProtectedHeader: vi.fn().mockReturnThis(),
  setExpirationTime: vi.fn().mockReturnThis(),
  setIssuedAt: vi.fn().mockReturnThis(),
  sign: mockSign,
};

vi.mock("jose", () => ({
  SignJWT: vi.fn(() => mockSignJWTInstance),
  jwtVerify: vi.fn(),
}));

// ── next/headers mock ───────────────────────────────────────────────────────
const mockCookieSet = vi.fn();
const mockCookieGet = vi.fn();
const mockCookieDelete = vi.fn();
const mockCookieStore = {
  set: mockCookieSet,
  get: mockCookieGet,
  delete: mockCookieDelete,
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// ── module imports (after vi.mock hoisting) ──────────────────────────────────
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  createSession,
  getSession,
  deleteSession,
  verifySession,
} from "@/lib/auth";

beforeEach(() => {
  vi.clearAllMocks();

  // Restore implementations cleared by clearAllMocks
  vi.mocked(cookies).mockResolvedValue(mockCookieStore as never);
  mockSign.mockResolvedValue("mock-jwt-token");
  mockSignJWTInstance.setProtectedHeader.mockReturnThis();
  mockSignJWTInstance.setExpirationTime.mockReturnThis();
  mockSignJWTInstance.setIssuedAt.mockReturnThis();
});

// ── createSession ────────────────────────────────────────────────────────────
test("createSession signs a JWT and stores it in an httpOnly cookie", async () => {
  await createSession("user-1", "user@example.com");

  expect(mockSign).toHaveBeenCalled();
  expect(mockCookieSet).toHaveBeenCalledWith(
    "auth-token",
    "mock-jwt-token",
    expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    })
  );
});

test("createSession sets secure:false outside production", async () => {
  vi.stubEnv("NODE_ENV", "test");

  await createSession("user-1", "user@example.com");

  expect(mockCookieSet).toHaveBeenCalledWith(
    "auth-token",
    "mock-jwt-token",
    expect.objectContaining({ secure: false })
  );

  vi.unstubAllEnvs();
});

test("createSession sets a 7-day expiry on the cookie", async () => {
  const before = Date.now();
  await createSession("user-1", "user@example.com");
  const after = Date.now();

  const [[, , { expires }]] = mockCookieSet.mock.calls;
  const expiresMs = (expires as Date).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDays - 500);
  expect(expiresMs).toBeLessThanOrEqual(after + sevenDays + 500);
});

// ── getSession ───────────────────────────────────────────────────────────────
test("getSession returns null when no cookie is present", async () => {
  mockCookieGet.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns the decoded payload for a valid token", async () => {
  const payload = { userId: "user-1", email: "user@example.com", expiresAt: new Date() };
  mockCookieGet.mockReturnValue({ value: "valid-token" });
  vi.mocked(jwtVerify).mockResolvedValue({ payload } as never);

  const session = await getSession();

  expect(session).toEqual(payload);
});

test("getSession returns null when jwtVerify throws", async () => {
  mockCookieGet.mockReturnValue({ value: "bad-token" });
  vi.mocked(jwtVerify).mockRejectedValue(new Error("invalid signature"));

  const session = await getSession();

  expect(session).toBeNull();
});

// ── deleteSession ─────────────────────────────────────────────────────────────
test("deleteSession removes the auth-token cookie", async () => {
  await deleteSession();

  expect(mockCookieDelete).toHaveBeenCalledWith("auth-token");
});

// ── verifySession ─────────────────────────────────────────────────────────────
function makeRequest(token?: string) {
  return {
    cookies: {
      get: (name: string) => (name === "auth-token" && token ? { value: token } : undefined),
    },
  } as never;
}

test("verifySession returns null when the request has no auth cookie", async () => {
  const result = await verifySession(makeRequest());

  expect(result).toBeNull();
});

test("verifySession returns the decoded payload for a valid token", async () => {
  const payload = { userId: "user-2", email: "other@example.com", expiresAt: new Date() };
  vi.mocked(jwtVerify).mockResolvedValue({ payload } as never);

  const result = await verifySession(makeRequest("valid-token"));

  expect(result).toEqual(payload);
});

test("verifySession returns null when jwtVerify throws", async () => {
  vi.mocked(jwtVerify).mockRejectedValue(new Error("expired"));

  const result = await verifySession(makeRequest("expired-token"));

  expect(result).toBeNull();
});
