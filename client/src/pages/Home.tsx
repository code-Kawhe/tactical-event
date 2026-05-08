import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Users, AlertTriangle, CheckCircle2, ExternalLink, ChevronRight, Target, Crosshair } from "lucide-react";

// ─── Form schema ──────────────────────────────────────────────────────────────
const formSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().min(10, "Telefone inválido (mínimo 10 dígitos)"),
  familyPhone: z.string().min(10, "Telefone de familiar inválido (mínimo 10 dígitos)"),
  isAdult: z.boolean().refine(v => v === true, "Você deve ser maior de 18 anos para se inscrever"),
  team: z.enum(["FORCA_INTERVENCAO", "MILICIA_LOCAL"] as const, { error: "Selecione uma equipe" }),
  wantsPatch: z.boolean(),
  wantsShirt: z.boolean(),
  shirtSize: z.enum(["P", "M", "G", "GG"] as const).optional(),
  hasCompanion: z.boolean(),
  companionCount: z.number().int().min(1).max(20).optional(),
}).refine(d => !d.wantsShirt || d.shirtSize, {
  message: "Selecione o tamanho da camisa",
  path: ["shirtSize"],
}).refine(d => !d.hasCompanion || (d.companionCount && d.companionCount >= 1), {
  message: "Informe a quantidade de acompanhantes",
  path: ["companionCount"],
});

type FormData = z.infer<typeof formSchema>;

// ─── Confirmation screen ──────────────────────────────────────────────────────
function ConfirmationScreen({ team, mainGroupLink, teamGroupLink }: {
  team: "FORCA_INTERVENCAO" | "MILICIA_LOCAL";
  mainGroupLink: string;
  teamGroupLink: string;
}) {
  const teamName = team === "FORCA_INTERVENCAO" ? "FORÇA DE INTERVENÇÃO" : "MILÍCIA LOCAL";
  const teamColor = team === "FORCA_INTERVENCAO" ? "text-green-400" : "text-amber-400";
  const teamBorder = team === "FORCA_INTERVENCAO" ? "border-green-500/40" : "border-amber-500/40";
  const teamBg = team === "FORCA_INTERVENCAO" ? "bg-green-900/20" : "bg-amber-900/20";

  return (
    <div className="min-h-screen tactical-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-900/30 border-2 border-green-500/50 mb-4 military-glow">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-green-400 mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            INSCRIÇÃO CONFIRMADA
          </h1>
          <p className="text-muted-foreground">Operador registrado com sucesso no sistema</p>
        </div>

        {/* Team badge */}
        <div className={`rounded-lg border ${teamBorder} ${teamBg} p-4 mb-6 text-center`}>
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">Equipe designada</p>
          <p className={`text-xl font-bold ${teamColor}`} style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em" }}>
            {teamName}
          </p>
        </div>

        {/* Links */}
        <div className="space-y-4 mb-8">
          <p className="text-sm text-muted-foreground text-center uppercase tracking-widest mb-4">
            Acesse os grupos do evento
          </p>

          <a
            href={mainGroupLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full p-4 rounded-lg bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Grupo Principal do Evento</p>
                <p className="text-xs text-muted-foreground">Comunicados e informações gerais</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </a>

          <a
            href={teamGroupLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between w-full p-4 rounded-lg bg-card border ${teamBorder} hover:${teamBg} transition-all group`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${teamBg} flex items-center justify-center`}>
                <Shield className={`w-5 h-5 ${teamColor}`} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Grupo da Equipe</p>
                <p className={`text-xs font-medium ${teamColor}`}>{teamName}</p>
              </div>
            </div>
            <ExternalLink className={`w-4 h-4 text-muted-foreground group-hover:${teamColor} transition-colors`} />
          </a>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Guarde esses links. Eles contêm informações importantes sobre o evento.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main registration page ───────────────────────────────────────────────────
export default function Home() {
  const [confirmed, setConfirmed] = useState<{
    team: "FORCA_INTERVENCAO" | "MILICIA_LOCAL";
    mainGroupLink: string;
    teamGroupLink: string;
  } | null>(null);

  const { data: teamData, refetch: refetchTeams } = trpc.registration.getTeamCounts.useQuery(undefined, {
    refetchInterval: 10000, // poll every 10s for real-time updates
  });

  const createMutation = trpc.registration.create.useMutation({
    onSuccess: (data) => {
      setConfirmed({
        team: data.team as "FORCA_INTERVENCAO" | "MILICIA_LOCAL",
        mainGroupLink: data.mainGroupLink,
        teamGroupLink: data.teamGroupLink,
      });
      refetchTeams();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao realizar inscrição. Tente novamente.");
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isAdult: false,
      wantsPatch: false,
      wantsShirt: false,
      hasCompanion: false,
    },
  });

  const selectedTeam = watch("team");
  const wantsShirt = watch("wantsShirt");
  const hasCompanion = watch("hasCompanion");
  const isAdult = watch("isAdult");

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  if (confirmed) {
    return (
      <ConfirmationScreen
        team={confirmed.team}
        mainGroupLink={confirmed.mainGroupLink}
        teamGroupLink={confirmed.teamGroupLink}
      />
    );
  }

  const fi = teamData?.FORCA_INTERVENCAO;
  const ml = teamData?.MILICIA_LOCAL;
  const limit = teamData?.limit ?? 75;

  return (
    <div className="min-h-screen tactical-bg">
      {/* Header */}
      <header className="relative border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest leading-none">Sistema de</p>
              <p className="font-bold text-foreground leading-tight" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.8rem" }}>
                INSCRIÇÕES TÁTICAS
              </p>
            </div>
          </div>
          <a
            href="/admin"
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <Shield className="w-3 h-3" />
            Admin
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="container text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs uppercase tracking-widest mb-6">
            <Target className="w-3 h-3" />
            Evento Tático Especial
          </div>
          <h1
            className="text-4xl md:text-6xl font-black text-foreground mb-4 leading-tight"
            style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.05em" }}
          >
            OPERAÇÃO<br />
            <span className="text-primary">TÁTICA</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Registre-se agora e escolha sua equipe. Vagas limitadas por unidade.
          </p>
        </div>
      </section>

      {/* Team availability banner */}
      {teamData && (
        <section className="container mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FORÇA DE INTERVENÇÃO */}
            <div className={`rounded-lg border p-4 ${fi?.available ? "border-green-500/30 bg-green-900/10" : "border-red-500/30 bg-red-900/10"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-green-400" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.7rem" }}>
                  FORÇA DE INTERVENÇÃO
                </span>
                {fi?.available ? (
                  <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">DISPONÍVEL</span>
                ) : (
                  <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">ESGOTADO</span>
                )}
              </div>
              <div className="progress-bar mb-1">
                <div
                  className={`progress-fill ${(fi?.count ?? 0) / limit > 0.8 ? "danger" : ""}`}
                  style={{ width: `${Math.min(100, ((fi?.count ?? 0) / limit) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{fi?.count ?? 0}/{limit} vagas preenchidas · {fi?.remaining ?? limit} restantes</p>
            </div>

            {/* MILÍCIA LOCAL */}
            <div className={`rounded-lg border p-4 ${ml?.available ? "border-amber-500/30 bg-amber-900/10" : "border-red-500/30 bg-red-900/10"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-amber-400" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.7rem" }}>
                  MILÍCIA LOCAL
                </span>
                {ml?.available ? (
                  <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full">DISPONÍVEL</span>
                ) : (
                  <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">ESGOTADO</span>
                )}
              </div>
              <div className="progress-bar mb-1">
                <div
                  className={`progress-fill ${(ml?.count ?? 0) / limit > 0.8 ? "danger" : ""}`}
                  style={{ width: `${Math.min(100, ((ml?.count ?? 0) / limit) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{ml?.count ?? 0}/{limit} vagas preenchidas · {ml?.remaining ?? limit} restantes</p>
            </div>
          </div>
        </section>
      )}

      {/* Registration form */}
      <section className="container pb-16">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-8">

          {/* ── Section 1: Personal data ── */}
          <div className="rounded-xl border border-border bg-card military-glow p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">01</div>
              <h2 className="text-lg font-bold uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.85rem" }}>
                Dados do Operador
              </h2>
            </div>

            <div className="space-y-4">
              {/* Full name */}
              <div>
                <Label htmlFor="fullName" className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">
                  Nome Completo *
                </Label>
                <Input
                  id="fullName"
                  placeholder="Digite seu nome completo"
                  className="bg-input border-border focus:border-primary"
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.fullName.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Telefone do Participante *
                  </Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    className="bg-input border-border focus:border-primary"
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {errors.phone.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="familyPhone" className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Telefone de Familiar *
                  </Label>
                  <Input
                    id="familyPhone"
                    placeholder="(00) 00000-0000"
                    className="bg-input border-border focus:border-primary"
                    {...register("familyPhone")}
                  />
                  {errors.familyPhone && (
                    <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {errors.familyPhone.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Age confirmation */}
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
                  Você é maior de 18 anos? *
                </Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setValue("isAdult", true)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                      isAdult === true
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-input text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("isAdult", false)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                      isAdult === false && watch("isAdult") !== undefined
                        ? "border-destructive bg-destructive/20 text-destructive"
                        : "border-border bg-input text-muted-foreground hover:border-destructive/50"
                    }`}
                  >
                    Não
                  </button>
                </div>
                {errors.isAdult && (
                  <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.isAdult.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 2: Team selection ── */}
          <div className="rounded-xl border border-border bg-card military-glow p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">02</div>
              <h2 className="text-lg font-bold uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.85rem" }}>
                Escolha de Equipe
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* FORÇA DE INTERVENÇÃO */}
              <button
                type="button"
                disabled={!fi?.available}
                onClick={() => fi?.available && setValue("team", "FORCA_INTERVENCAO")}
                className={`team-card rounded-xl p-5 text-left bg-card/50 ${
                  selectedTeam === "FORCA_INTERVENCAO" ? "selected" : ""
                } ${!fi?.available ? "disabled" : ""}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-900/30 border border-green-500/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  {selectedTeam === "FORCA_INTERVENCAO" && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  {!fi?.available && (
                    <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">ESGOTADO</span>
                  )}
                </div>
                <p className="font-bold text-green-400 text-sm mb-1" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                  FORÇA DE INTERVENÇÃO
                </p>
                <p className="text-xs text-muted-foreground mb-3">Unidade de resposta rápida e intervenção tática</p>
                <div className="progress-bar mb-1">
                  <div
                    className={`progress-fill ${(fi?.count ?? 0) / limit > 0.8 ? "danger" : ""}`}
                    style={{ width: `${Math.min(100, ((fi?.count ?? 0) / limit) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{fi?.remaining ?? limit} vagas restantes</p>
              </button>

              {/* MILÍCIA LOCAL */}
              <button
                type="button"
                disabled={!ml?.available}
                onClick={() => ml?.available && setValue("team", "MILICIA_LOCAL")}
                className={`team-card rounded-xl p-5 text-left bg-card/50 ${
                  selectedTeam === "MILICIA_LOCAL" ? "selected" : ""
                } ${!ml?.available ? "disabled" : ""}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-900/30 border border-amber-500/30 flex items-center justify-center">
                    <Target className="w-5 h-5 text-amber-400" />
                  </div>
                  {selectedTeam === "MILICIA_LOCAL" && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  {!ml?.available && (
                    <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">ESGOTADO</span>
                  )}
                </div>
                <p className="font-bold text-amber-400 text-sm mb-1" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                  MILÍCIA LOCAL
                </p>
                <p className="text-xs text-muted-foreground mb-3">Força de defesa territorial e controle de área</p>
                <div className="progress-bar mb-1">
                  <div
                    className={`progress-fill ${(ml?.count ?? 0) / limit > 0.8 ? "danger" : ""}`}
                    style={{ width: `${Math.min(100, ((ml?.count ?? 0) / limit) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{ml?.remaining ?? limit} vagas restantes</p>
              </button>
            </div>
            {errors.team && (
              <p className="text-destructive text-xs mt-3 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {errors.team.message}
              </p>
            )}
          </div>

          {/* ── Section 3: Optionals ── */}
          <div className="rounded-xl border border-border bg-card military-glow p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">03</div>
              <h2 className="text-lg font-bold uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.85rem" }}>
                Opcionais do Evento
              </h2>
            </div>

            <div className="space-y-5">
              {/* Patch */}
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground text-sm">Patch Oficial do Evento</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Patch bordado exclusivo do evento</p>
                    <p className="text-primary font-bold text-sm mt-1">R$ 20,00</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setValue("wantsPatch", true)}
                      className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        watch("wantsPatch") === true
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border bg-input text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("wantsPatch", false)}
                      className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        watch("wantsPatch") === false
                          ? "border-border bg-secondary text-foreground"
                          : "border-border bg-input text-muted-foreground hover:border-border"
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>
              </div>

              {/* Shirt */}
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold text-foreground text-sm">Camisa Oficial do Evento</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Camisa tática exclusiva do evento</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setValue("wantsShirt", true)}
                      className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        wantsShirt === true
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border bg-input text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => { setValue("wantsShirt", false); setValue("shirtSize", undefined); }}
                      className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        wantsShirt === false
                          ? "border-border bg-secondary text-foreground"
                          : "border-border bg-input text-muted-foreground hover:border-border"
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>
                {wantsShirt && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest">Tamanho</p>
                    <div className="flex gap-2">
                      {(["P", "M", "G", "GG"] as const).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setValue("shirtSize", size)}
                          className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${
                            watch("shirtSize") === size
                              ? "border-primary bg-primary/20 text-primary"
                              : "border-border bg-input text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    {errors.shirtSize && (
                      <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {errors.shirtSize.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Companion */}
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold text-foreground text-sm">Acompanhante</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Deseja levar acompanhante(s)?</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setValue("hasCompanion", true)}
                      className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        hasCompanion === true
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border bg-input text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => { setValue("hasCompanion", false); setValue("companionCount", undefined); }}
                      className={`px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        hasCompanion === false
                          ? "border-border bg-secondary text-foreground"
                          : "border-border bg-input text-muted-foreground hover:border-border"
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>
                {hasCompanion && (
                  <div>
                    <Label htmlFor="companionCount" className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Quantidade de Acompanhantes
                    </Label>
                    <Input
                      id="companionCount"
                      type="number"
                      min={1}
                      max={20}
                      placeholder="Ex: 2"
                      className="bg-input border-border focus:border-primary max-w-[160px]"
                      {...register("companionCount", { valueAsNumber: true })}
                    />
                    {errors.companionCount && (
                      <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {errors.companionCount.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full h-14 text-base font-bold uppercase tracking-widest"
            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.85rem" }}
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Processando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Confirmar Inscrição
                <ChevronRight className="w-5 h-5" />
              </span>
            )}
          </Button>
        </form>
      </section>
    </div>
  );
}
