import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getTeamCounts,
  createRegistration,
  getAllRegistrations,
  checkCpfExists,
  TEAM_LIMIT,
} from "./db";

// ─── Event configuration ─────────────────────────────────────────────────────
// Update these links before going live
const EVENT_LINKS = {
  mainGroup: "https://chat.whatsapp.com/LbQPUJOAlEvGne65HRGXNL",
  forcaIntervencao: "https://chat.whatsapp.com/FHBG8gDKo9sKNLG8MR2abc",
  miliciaLocal: "https://chat.whatsapp.com/K6Gupp3HzUHHScVEQ4ahee",
};

// ─── CPF validation helper ────────────────────────────────────────────────────
function formatCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

function isValidCpf(cpf: string): boolean {
  const cleaned = formatCpf(cpf);
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
}

// ─── Validation schema ────────────────────────────────────────────────────────
const registrationInput = z.object({
  cpf: z.string().min(11, "CPF inválido").refine(isValidCpf, "CPF inválido"),
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().min(10, "Telefone inválido"),
  familyPhone: z.string().min(10, "Telefone de familiar inválido"),
  isAdult: z.boolean(),
  team: z.enum(["FORCA_INTERVENCAO", "MILICIA_LOCAL"] as const),
  wantsPatch: z.boolean(),
  wantsShirt: z.boolean(),
  shirtSize: z.enum(["P", "M", "G", "GG"] as const).optional(),
  hasCompanion: z.boolean(),
  companionCount: z.number().int().min(0).max(20).optional(),
});

// ─── Routers ──────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  registration: router({
    // Public: get current team counts and availability
    getTeamCounts: publicProcedure.query(async () => {
      const counts = await getTeamCounts();
      return {
        FORCA_INTERVENCAO: {
          count: counts.FORCA_INTERVENCAO,
          available: counts.FORCA_INTERVENCAO < TEAM_LIMIT,
          remaining: Math.max(0, TEAM_LIMIT - counts.FORCA_INTERVENCAO),
        },
        MILICIA_LOCAL: {
          count: counts.MILICIA_LOCAL,
          available: counts.MILICIA_LOCAL < TEAM_LIMIT,
          remaining: Math.max(0, TEAM_LIMIT - counts.MILICIA_LOCAL),
        },
        limit: TEAM_LIMIT,
      };
    }),
    // Public: create a new registration
    create: publicProcedure.input(registrationInput).mutation(async ({ input }) => {
      // Validate CPF uniqueness
      const cpfFormatted = formatCpf(input.cpf);
      const cpfExists = await checkCpfExists(cpfFormatted);
      if (cpfExists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este CPF já foi registrado. Apenas uma inscrição por CPF é permitida.",
        });
      }

      if (input.wantsShirt && !input.shirtSize) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selecione o tamanho da camisa.",
        });
      }

      try {
        const result = await createRegistration({
          cpf: cpfFormatted,
          fullName: input.fullName,
          phone: input.phone,
          familyPhone: input.familyPhone,
          isAdult: input.isAdult,
          team: input.team,
          wantsPatch: input.wantsPatch,
          wantsShirt: input.wantsShirt,
          shirtSize: input.wantsShirt ? input.shirtSize : undefined,
          hasCompanion: input.hasCompanion,
          companionCount: input.hasCompanion ? (input.companionCount ?? 1) : 0,
        });
        const teamLink =
          input.team === "FORCA_INTERVENCAO"
            ? EVENT_LINKS.forcaIntervencao
            : EVENT_LINKS.miliciaLocal;
        return {
          success: true,
          id: result.id,
          mainGroupLink: EVENT_LINKS.mainGroup,
          teamGroupLink: teamLink,
          team: input.team,
          isAdult: input.isAdult,
        };
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err.message ?? "Erro ao realizar inscrição.",
        });
      }
    }),
    // Protected: list all registrations (admin only)
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
      }
      const rows = await getAllRegistrations();
      const counts = await getTeamCounts();
      return { registrations: rows, counts, limit: TEAM_LIMIT };
    }),
    // Public: get event links config (for confirmation page)
    getEventLinks: publicProcedure.query(() => EVENT_LINKS),
  }),
});

export type AppRouter = typeof appRouter;
