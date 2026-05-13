import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getTeamCounts: vi.fn().mockResolvedValue({ FORCA_INTERVENCAO: 0, MILICIA_LOCAL: 0 }),
  createRegistration: vi.fn().mockResolvedValue({ id: 1 }),
  getAllRegistrations: vi.fn().mockResolvedValue([]),
  checkCpfExists: vi.fn().mockResolvedValue(false),
  calculateTotalAmount: vi.fn((data: any) => {
    let total = 0;
    if (data.wantsPatch) total += 1500;
    if (data.wantsShirt) total += 6000;
    if (data.hasCompanion && data.companionCount > 0) {
      total += data.companionCount * 2500;
    }
    return total;
  }),
  updatePaymentStatus: vi.fn().mockResolvedValue(undefined),
  TEAM_LIMIT: 75,
}));

import * as db from "./db";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("registration.getTeamCounts", () => {
  it("returns team counts with availability info", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.registration.getTeamCounts();

    expect(result.FORCA_INTERVENCAO.count).toBe(0);
    expect(result.FORCA_INTERVENCAO.available).toBe(true);
    expect(result.FORCA_INTERVENCAO.remaining).toBe(75);
    expect(result.MILICIA_LOCAL.count).toBe(0);
    expect(result.MILICIA_LOCAL.available).toBe(true);
    expect(result.limit).toBe(75);
  });

  it("marks team as unavailable when limit is reached", async () => {
    vi.mocked(db.getTeamCounts).mockResolvedValueOnce({
      FORCA_INTERVENCAO: 75,
      MILICIA_LOCAL: 10,
    });

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.registration.getTeamCounts();

    expect(result.FORCA_INTERVENCAO.available).toBe(false);
    expect(result.FORCA_INTERVENCAO.remaining).toBe(0);
    expect(result.MILICIA_LOCAL.available).toBe(true);
  });
});

describe("registration.create", () => {
  beforeEach(() => {
    vi.mocked(db.getTeamCounts).mockResolvedValue({ FORCA_INTERVENCAO: 0, MILICIA_LOCAL: 0 });
    vi.mocked(db.createRegistration).mockResolvedValue({ id: 42 });
  });

  const validInput = {
    cpf: "11144477735",
    fullName: "João Silva",
    phone: "11999990000",
    familyPhone: "11888880000",
    isAdult: true,
    team: "FORCA_INTERVENCAO" as const,
    wantsPatch: false,
    wantsShirt: false,
    hasCompanion: false,
  };

  it("creates a registration successfully", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.registration.create(validInput);

    expect(result.success).toBe(true);
    expect(result.id).toBe(42);
    expect(result.team).toBe("FORCA_INTERVENCAO");
    expect(result.mainGroupLink).toBeDefined();
    expect(result.teamGroupLink).toBeDefined();
  });

  it("rejects registration when CPF is invalid", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.registration.create({ ...validInput, cpf: "11111111111" })
    ).rejects.toThrow("CPF");
  });

  it("rejects registration when CPF already exists", async () => {
    vi.mocked(db.checkCpfExists).mockResolvedValueOnce(true);
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.registration.create(validInput)
    ).rejects.toThrow("CPF já foi registrado");
  });

  it("allows registration for minors (isAdult false)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.registration.create({ ...validInput, isAdult: false });

    expect(result.success).toBe(true);
    expect(result.isAdult).toBe(false);
  });

  it("rejects registration when wantsShirt is true but no size provided", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.registration.create({ ...validInput, wantsShirt: true })
    ).rejects.toThrow("tamanho da camisa");
  });

  it("returns MILICIA_LOCAL team link for that team", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.registration.create({
      ...validInput,
      team: "MILICIA_LOCAL",
    });

    expect(result.team).toBe("MILICIA_LOCAL");
    expect(result.teamGroupLink).toContain("chat.whatsapp.com");
  });
});

describe("registration.list", () => {
  it("returns registrations for admin user", async () => {
    vi.mocked(db.getAllRegistrations).mockResolvedValueOnce([]);
    vi.mocked(db.getTeamCounts).mockResolvedValueOnce({ FORCA_INTERVENCAO: 0, MILICIA_LOCAL: 0 });

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.registration.list();

    expect(result.registrations).toEqual([]);
    expect(result.limit).toBe(75);
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const caller = appRouter.createCaller(createUserContext());

    await expect(caller.registration.list()).rejects.toThrow("administradores");
  });

  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.registration.list()).rejects.toThrow();
  });
});
