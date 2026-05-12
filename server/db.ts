import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, registrations, InsertRegistration, Registration } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const connection = await mysql.createConnection({
        uri: process.env.DATABASE_URL,
        ssl: {
          minVersion: "TLSv1.2",
          rejectUnauthorized: true,
        },
      });
      _db = drizzle(connection);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.email) {
    throw new Error("User email is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { email: user.email, passwordHash: user.passwordHash };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "passwordHash"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Registration helpers ────────────────────────────────────────────────────

export const TEAM_LIMIT = 75;

export async function getTeamCounts(): Promise<{ FORCA_INTERVENCAO: number; MILICIA_LOCAL: number }> {
  const db = await getDb();
  if (!db) return { FORCA_INTERVENCAO: 0, MILICIA_LOCAL: 0 };

  const rows = await db
    .select({ team: registrations.team, count: sql<number>`count(*)` })
    .from(registrations)
    .groupBy(registrations.team);

  const counts = { FORCA_INTERVENCAO: 0, MILICIA_LOCAL: 0 };
  for (const row of rows) {
    if (row.team === "FORCA_INTERVENCAO") counts.FORCA_INTERVENCAO = Number(row.count);
    if (row.team === "MILICIA_LOCAL") counts.MILICIA_LOCAL = Number(row.count);
  }
  return counts;
}

export async function createRegistration(data: InsertRegistration): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const counts = await getTeamCounts();
  const teamCount = data.team === "FORCA_INTERVENCAO" ? counts.FORCA_INTERVENCAO : counts.MILICIA_LOCAL;

  if (teamCount >= TEAM_LIMIT) {
    throw new Error(`A equipe ${data.team === "FORCA_INTERVENCAO" ? "FORÇA DE INTERVENÇÃO" : "MILÍCIA LOCAL"} já atingiu o limite de ${TEAM_LIMIT} participantes.`);
  }

  // Get next registration number
  const totalRegistrations = await db.select({ count: sql<number>`count(*)` }).from(registrations);
  const nextNumber = Math.min(Number(totalRegistrations[0]?.count ?? 0) + 1, 150);

  const result = await db.insert(registrations).values({
    ...data,
    registrationNumber: nextNumber,
  });
  return { id: Number((result as any)[0]?.insertId ?? 0) };
}

export async function getAllRegistrations(): Promise<Registration[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(registrations).orderBy(registrations.createdAt);
}

export async function checkCpfExists(cpf: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(registrations).where(eq(registrations.cpf, cpf)).limit(1);
  return result.length > 0;
}

export async function getRegistrationsForExport(): Promise<Array<Registration & { registrationNumber: number | null }>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(registrations).orderBy(registrations.registrationNumber);
  return rows as Array<Registration & { registrationNumber: number | null }>;
}


// Payment helpers
export function calculateTotalAmount(data: {
  wantsPatch: boolean;
  wantsShirt: boolean;
  hasCompanion: boolean;
  companionCount: number;
}): number {
  let total = 0; // Inscrição gratuita
  if (data.wantsPatch) total += 1500; // R$ 15,00
  if (data.wantsShirt) total += 5000; // R$ 50,00
  if (data.hasCompanion && data.companionCount > 0) {
    total += data.companionCount * 2500; // R$ 25,00 each
  }
  return total;
}

export async function updatePaymentStatus(registrationId: number, status: 'pending' | 'confirmed'): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(registrations).set({ paymentStatus: status }).where(eq(registrations.id, registrationId));
}

export async function deleteRegistration(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(registrations).where(eq(registrations.id, id));
}

export async function updateRegistration(id: number, data: Partial<InsertRegistration>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(registrations).set(data).where(eq(registrations.id, id));
}
