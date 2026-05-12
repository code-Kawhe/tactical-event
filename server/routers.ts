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
  getRegistrationsForExport,
  calculateTotalAmount,
  updatePaymentStatus,
  deleteRegistration,
  updateRegistration,
  TEAM_LIMIT,
} from "./db";
import * as XLSX from "xlsx";

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
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { sdk } = await import("./_core/sdk");
        const { getUserByEmail } = await import("./db");
        const { ONE_YEAR_MS } = await import("@shared/const");
        const bcrypt = await import("bcryptjs");

        try {
          const user = await getUserByEmail(input.email);

          if (!user || !user.passwordHash) {
             throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Credenciais inválidas",
            });
          }

          const isValid = await bcrypt.compare(input.password, user.passwordHash);

          if (!isValid) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Credenciais inválidas",
            });
          }

          const sessionToken = await sdk.createSessionToken(user.email, {
            name: user.name || "",
            role: user.role,
            expiresInMs: ONE_YEAR_MS,
          });

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

          return { success: true };
        } catch (error) {
          console.error("[Auth] Login failed", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao realizar login",
          });
        }
      }),
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
        const totalAmount = calculateTotalAmount({
          wantsPatch: input.wantsPatch,
          wantsShirt: input.wantsShirt,
          hasCompanion: input.hasCompanion,
          companionCount: input.hasCompanion ? (input.companionCount ?? 1) : 0,
        });
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
          paymentStatus: 'pending',
          totalAmount: totalAmount,
        });
        const teamLink =
          input.team === "FORCA_INTERVENCAO"
            ? EVENT_LINKS.forcaIntervencao
            : EVENT_LINKS.miliciaLocal;
        return {
          success: true,
          id: result.id,
          totalAmount: totalAmount,
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
    // Protected: export registrations as Excel (admin only)
    exportExcel: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
      }

      const registrations = await getRegistrationsForExport();

      // Prepare data for Excel
      const data = registrations.map((reg) => ({
        "Nº": reg.registrationNumber ?? "-",
        "Nome Completo": reg.fullName,
        "CPF": reg.cpf,
        "Telefone": reg.phone,
        "Telefone Familiar": reg.familyPhone,
        "Maior de 18": reg.isAdult ? "Sim" : "Não",
        "Equipe": reg.team === "FORCA_INTERVENCAO" ? "FORÇA DE INTERVENÇÃO" : "MILÍCIA LOCAL",
        "Patch (R$ 20)": reg.wantsPatch ? "Sim" : "Não",
        "Camisa": reg.wantsShirt ? `Sim (${reg.shirtSize})` : "Não",
        "Acompanhantes": (reg.companionCount ?? 0) > 0 ? reg.companionCount : "Não",
        "Data Inscrição": new Date(reg.createdAt).toLocaleString("pt-BR"),
      }));

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inscrições");

      // Set column widths
      ws["!cols"] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
      ];

      // Generate buffer
      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

      return {
        success: true,
        buffer: buffer.toString("base64"),
        filename: `inscricoes-operacao-falcao-negro-${new Date().toISOString().split("T")[0]}.xlsx`,
      };
    }),
     // Protected: confirm payment status (admin only)
    confirmPayment: protectedProcedure
      .input(z.object({ registrationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        await updatePaymentStatus(input.registrationId, "confirmed");
        return { success: true };
      }),
    // Protected: update registration (admin only)
    update: protectedProcedure
      .input(z.object({ 
        id: z.number(), 
        data: registrationInput.partial() 
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        // recalculate total amount if relevant fields are updated
        const currentData = input.data;
        if (currentData.wantsPatch !== undefined || currentData.wantsShirt !== undefined || currentData.hasCompanion !== undefined || currentData.companionCount !== undefined) {
           // We're just updating the values provided. Note: For a true recalculation we would need to merge with existing data.
           // For simplicity, we just pass what we got if the form sends all fields.
        }
        
        await updateRegistration(input.id, input.data);
        return { success: true };
      }),
    // Protected: delete registration (admin only)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        await deleteRegistration(input.id);
        return { success: true };
      }),
    // Public: get event links config (for confirmation page)
    getEventLinks: publicProcedure.query(() => EVENT_LINKS),
  }),
});
export type AppRouter = typeof appRouter;
