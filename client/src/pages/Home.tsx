import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Users, AlertTriangle, CheckCircle2, ExternalLink, ChevronRight, Target, Crosshair, Loader2, Send, Download, AlertCircle, MessageCircle } from "lucide-react";


// ─── CPF validation ───────────────────────────────────────────────────────────
function isValidCpf(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
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

// ─── Form schema ──────────────────────────────────────────────────────────────
const formSchema = z.object({
  cpf: z.string().min(11, "CPF inválido").refine(isValidCpf, "CPF inválido"),
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().min(10, "Telefone inválido (mínimo 10 dígitos)"),
  familyPhone: z.string().min(10, "Telefone de familiar inválido (mínimo 10 dígitos)"),
  isAdult: z.boolean().refine(v => v === true || v === false, "Selecione uma opção"),
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
function ConfirmationScreen({ 
  team, 
  mainGroupLink, 
  teamGroupLink,
  isAdult,
  totalAmount,
  onClose 
}: {
  team: "FORCA_INTERVENCAO" | "MILICIA_LOCAL";
  mainGroupLink: string;
  teamGroupLink: string;
  isAdult: boolean;
  totalAmount?: number;
  onClose: () => void;
}) {
  const teamName = team === "FORCA_INTERVENCAO" ? "FORÇA DE INTERVENÇÃO" : "MILÍCIA LOCAL";
  const teamColor = team === "FORCA_INTERVENCAO" ? "text-green-400" : "text-amber-400";
  const teamBorder = team === "FORCA_INTERVENCAO" ? "border-green-500/40" : "border-amber-500/40";
  const teamBg = team === "FORCA_INTERVENCAO" ? "bg-green-900/20" : "bg-amber-900/20";

  const whatsappLink = "https://api.whatsapp.com/send/?phone=%2B5569984596623&text&type=phone_number&app_absent=0";
  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };
  const handleDownloadAuthorizationPDF = () => {
    toast.error("PDF de autorização será disponibilizado em breve. Aguarde o envio do arquivo.");
  };

  return (
    <div className="min-h-screen tactical-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-900/30 border-2 border-green-500/50 mb-4 military-glow">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-black text-foreground mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            INSCRIÇÃO CONFIRMADA!
          </h2>
          <p className="text-muted-foreground text-sm">
            Você foi registrado com sucesso na equipe <span className="font-bold">{teamName}</span>.
          </p>
        </div>

        {/* Authorization PDF for minors */}
        {!isAdult && (
          <div className="bg-destructive/10 border-2 border-destructive/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-destructive text-sm">⚠️ ATENÇÃO - MENOR DE IDADE</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Você informou ser menor de 18 anos. É obrigatório baixar, imprimir e levar o termo de autorização assinado por um responsável legal no dia do evento.
                </p>
                <p className="text-xs text-destructive font-bold mt-2">
                  SEM ESTE DOCUMENTO ASSINADO, VOCÊ NÃO PODERÁ PARTICIPAR DO EVENTO!
                </p>
              </div>
            </div>
            <Button
              onClick={handleDownloadAuthorizationPDF}
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Termo de Autorização
            </Button>
          </div>
        )}

        {/* Payment information */}
        {totalAmount && (
          <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4 mb-6">
            <div className="mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Valor a Pagar</p>
              <p className="text-3xl font-black text-primary" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                {formatCurrency(totalAmount)}
              </p>
            </div>
            <div className="bg-secondary/30 rounded p-3 mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Chave Pix (será informada em breve)</p>
              <p className="text-sm font-mono text-foreground">Aguardando configuração...</p>
            </div>
            <div className="bg-warning/10 border border-warning/30 rounded p-3 mb-4">
              <p className="text-xs text-muted-foreground mb-2">
                <strong>Como proceder:</strong>
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Realize a transferência Pix para a chave acima</li>
                <li>Capture o comprovante de pagamento</li>
                <li>Envie o comprovante via WhatsApp</li>
              </ol>
            </div>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 w-full justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar Comprovante via WhatsApp
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Group links */}
        <div className="space-y-3 mb-6">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Grupo Principal do Evento</p>
            <a
              href={mainGroupLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-bold text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Entrar no WhatsApp
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className={`p-4 rounded-lg border ${teamBg} ${teamBorder}`}>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
              Grupo da Equipe {teamName}
            </p>
            <a
              href={teamGroupLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 ${teamColor} hover:opacity-80 transition-opacity font-bold text-sm`}
            >
              <MessageCircle className="w-4 h-4" />
              Entrar no WhatsApp
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Close button */}
        <Button
          onClick={onClose}
          variant="outline"
          className="w-full"
        >
          Fechar
        </Button>
      </div>
    </div>
  );
}

// ─── Main form component ──────────────────────────────────────────────────────
export default function Home() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isAdult: true,
      wantsPatch: false,
      wantsShirt: false,
      hasCompanion: false,
    },
  });

  const wantsShirt = watch("wantsShirt");
  const hasCompanion = watch("hasCompanion");
  const isAdult = watch("isAdult");

  const { data: teamCounts } = trpc.registration.getTeamCounts.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const createRegistration = trpc.registration.create.useMutation();

  const onSubmit = async (data: FormData) => {
    try {
      const result = await createRegistration.mutateAsync(data);
      setConfirmationData({
        totalAmount: result.totalAmount,
        team: result.team,
        mainGroupLink: result.mainGroupLink,
        teamGroupLink: result.teamGroupLink,
        isAdult: result.isAdult,
      });
      setShowConfirmation(true);
      toast.success("Inscrição realizada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar inscrição");
    }
  };

  if (showConfirmation && confirmationData) {
    return (
      <ConfirmationScreen
        totalAmount={confirmationData.totalAmount}
        team={confirmationData.team}
        mainGroupLink={confirmationData.mainGroupLink}
        teamGroupLink={confirmationData.teamGroupLink}
        isAdult={confirmationData.isAdult}
        onClose={() => setShowConfirmation(false)}
      />
    );
  }

  return (
    <div className="min-h-screen tactical-bg">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest leading-none">Sistema de</p>
              <p className="font-bold text-foreground leading-tight" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.8rem" }}>
                INSCRIÇÕES
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Evento Tático</p>
            <p className="font-bold text-primary" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.75rem" }}>
              OPERAÇÃO FALCÃO NEGRO
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container py-12">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Logo image */}
          <div className="mb-12">
            <img
              src="topo.jpeg"
              alt="Operação Falcão Negro"
              className="w-full rounded-lg military-glow"
            />
          </div>

          {/* Rules image */}
          <div className="mb-12">
            <img
              src="regras.jpeg"
              alt="Itens Obrigatórios e Regras"
              className="w-full rounded-lg military-glow"
            />
          </div>

          {/* Personal data section */}
          <div className="p-6 rounded-xl border-2 border-border bg-card/50 military-glow">
            <h2 className="text-2xl font-black text-foreground mb-6" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              DADOS DO OPERADOR
            </h2>

            <div className="space-y-4">
              {/* CPF */}
              <div>
                <Label htmlFor="cpf" className="text-xs uppercase tracking-widest font-bold">
                  CPF *
                </Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  {...register("cpf")}
                  className="mt-2 bg-secondary/50 border-border"
                />
                {errors.cpf && (
                  <p className="text-xs text-destructive mt-1">{errors.cpf.message}</p>
                )}
              </div>

              {/* Full name */}
              <div>
                <Label htmlFor="fullName" className="text-xs uppercase tracking-widest font-bold">
                  Nome Completo *
                </Label>
                <Input
                  id="fullName"
                  placeholder="Digite seu nome completo"
                  {...register("fullName")}
                  className="mt-2 bg-secondary/50 border-border"
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-xs uppercase tracking-widest font-bold">
                  Telefone do Participante *
                </Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  {...register("phone")}
                  className="mt-2 bg-secondary/50 border-border"
                />
                {errors.phone && (
                  <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
                )}
              </div>

              {/* Family phone */}
              <div>
                <Label htmlFor="familyPhone" className="text-xs uppercase tracking-widest font-bold">
                  Telefone de Familiar *
                </Label>
                <Input
                  id="familyPhone"
                  placeholder="(11) 99999-9999"
                  {...register("familyPhone")}
                  className="mt-2 bg-secondary/50 border-border"
                />
                {errors.familyPhone && (
                  <p className="text-xs text-destructive mt-1">{errors.familyPhone.message}</p>
                )}
              </div>

              {/* Age confirmation - now as a question with Sim/Não */}
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-widest font-bold block">
                  Você é maior de 18 anos? *
                </Label>
                <div className="flex gap-3">
                  <label className="flex-1 cursor-pointer">
                    <div className={`p-3 rounded-lg border-2 text-center transition-all ${
                      isAdult === true
                        ? "border-green-500/60 bg-green-900/20"
                        : "border-green-500/20 bg-green-900/5 hover:bg-green-900/10"
                    }`}>
                      <input
                        type="radio"
                        checked={isAdult === true}
                        onClick={() => setValue("isAdult", true)}
                        className="sr-only"
                      />
                      <p className="font-bold text-green-400 text-sm">SIM</p>
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <div className={`p-3 rounded-lg border-2 text-center transition-all ${
                      isAdult === false
                        ? "border-amber-500/60 bg-amber-900/20"
                        : "border-amber-500/20 bg-amber-900/5 hover:bg-amber-900/10"
                    }`}>
                      <input
                        type="radio"
                        checked={isAdult === false}
                        onClick={() => setValue("isAdult", false)}
                        className="sr-only"
                      />
                      <p className="font-bold text-amber-400 text-sm">NÃO</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Uniform image */}
          <div className="mb-12">
            <img
              src="uniform.jpeg"
              alt="Padrão de Vestimenta"
              className="w-full rounded-lg military-glow"
            />
          </div>

          {/* Team selection */}
          <div className="p-6 rounded-xl border-2 border-border bg-card/50 military-glow">
            <h2 className="text-2xl font-black text-foreground mb-6" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              ESCOLHA SUA EQUIPE
            </h2>

            <div className="space-y-3">
              {/* Team 1 */}
              <label className="cursor-pointer">
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  watch("team") === "FORCA_INTERVENCAO"
                    ? "border-green-500/60 bg-green-900/20"
                    : "border-green-500/20 bg-green-900/5 hover:bg-green-900/10"
                } ${!teamCounts?.FORCA_INTERVENCAO.available ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        value="FORCA_INTERVENCAO"
                        {...register("team")}
                        disabled={!teamCounts?.FORCA_INTERVENCAO.available}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <p className="font-bold text-green-400 uppercase tracking-widest text-sm" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                          Força de Intervenção
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {teamCounts?.FORCA_INTERVENCAO.count ?? 0}/{teamCounts?.limit ?? 75} vagas
                        </p>
                      </div>
                    </div>
                    {!teamCounts?.FORCA_INTERVENCAO.available && (
                      <span className="text-xs font-bold text-destructive uppercase">Cheio</span>
                    )}
                  </div>
                </div>
              </label>

              {/* Team 2 */}
              <label className="cursor-pointer">
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  watch("team") === "MILICIA_LOCAL"
                    ? "border-amber-500/60 bg-amber-900/20"
                    : "border-amber-500/20 bg-amber-900/5 hover:bg-amber-900/10"
                } ${!teamCounts?.MILICIA_LOCAL.available ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        value="MILICIA_LOCAL"
                        {...register("team")}
                        disabled={!teamCounts?.MILICIA_LOCAL.available}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <p className="font-bold text-amber-400 uppercase tracking-widest text-sm" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                          Milícia Local
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {teamCounts?.MILICIA_LOCAL.count ?? 0}/{teamCounts?.limit ?? 75} vagas
                        </p>
                      </div>
                    </div>
                    {!teamCounts?.MILICIA_LOCAL.available && (
                      <span className="text-xs font-bold text-destructive uppercase">Cheio</span>
                    )}
                  </div>
                </div>
              </label>
            </div>

            {errors.team && (
              <p className="text-xs text-destructive mt-3">{errors.team.message}</p>
            )}
          </div>

          {/* Optionals section */}
          <div className="p-6 rounded-xl border-2 border-border bg-card/50 military-glow">
            <h2 className="text-2xl font-black text-foreground mb-6" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              OPCIONAIS DO EVENTO
            </h2>

            <div className="space-y-4">
              {/* Shirt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                  <div>
                    <p className="font-bold text-sm">Camisa Oficial</p>
                    <p className="text-xs text-muted-foreground">R$ 60,00</p>
                  </div>
                  <input
                    type="checkbox"
                    {...register("wantsShirt")}
                    className="w-4 h-4 cursor-pointer"
                  />
                </div>

                {wantsShirt && (
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <Label className="text-xs uppercase tracking-widest font-bold mb-2 block">
                      Tamanho da Camisa *
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {["P", "M", "G", "GG"].map((size) => (
                        <label key={size} className="cursor-pointer">
                          <input
                            type="radio"
                            value={size}
                            {...register("shirtSize")}
                            className="sr-only"
                          />
                          <div className={`p-2 rounded text-center text-sm font-bold transition-all ${
                            watch("shirtSize") === size
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground hover:bg-secondary/80"
                          }`}>
                            {size}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Companion */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                  <div>
                    <p className="font-bold text-sm">Levar Acompanhante</p>
                    <p className="text-xs text-muted-foreground">R$ 25,00 por acompanhante</p>
                  </div>
                  <input
                    type="checkbox"
                    {...register("hasCompanion")}
                    className="w-4 h-4 cursor-pointer"
                  />
                </div>

                {hasCompanion && (
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <Label htmlFor="companionCount" className="text-xs uppercase tracking-widest font-bold">
                      Quantidade de Acompanhantes *
                    </Label>
                    <Input
                      id="companionCount"
                      type="number"
                      min="1"
                      max="20"
                      placeholder="1"
                      {...register("companionCount", { valueAsNumber: true })}
                      className="mt-2 bg-secondary/50 border-border"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Terms image */}
          <div className="mb-12">
            <img
              src="termos.jpeg"
              alt="Termos e Responsabilidade"
              className="w-full rounded-lg military-glow"
            />
          </div>
          {/* Pricing summary */}
          <div className="p-6 rounded-xl border-2 border-primary/30 bg-primary/5 military-glow mb-6">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-3">Resumo de Preços</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Inscrição no Evento</span>
                <span className="font-bold">R$ 0,00</span>
              </div>
              {watch("wantsPatch") && (
                <div className="flex justify-between text-amber-400">
                  <span>+ Patch Oficial</span>
                  <span className="font-bold">R$ 15,00</span>
                </div>
              )}
              {watch("wantsShirt") && (
                <div className="flex justify-between text-blue-400">
                  <span>+ Camisa Oficial ({watch("shirtSize")})</span>
                  <span className="font-bold">R$ 50,00</span>
                </div>
              )}
              {watch("hasCompanion") && watch("companionCount") && (
                <div className="flex justify-between text-purple-400">
                  <span>+ {watch("companionCount")} Acompanhante(s)</span>
                  <span className="font-bold">R$ {((watch("companionCount") || 0) * 25).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-foreground">
                <span>TOTAL</span>
                <span className="text-primary">R$ {(
                  0 +
                  (watch("wantsPatch") ? 15 : 0) +
                  (watch("wantsShirt") ? 60 : 0) +
                  (watch("hasCompanion") && watch("companionCount") ? (watch("companionCount") || 0) * 25 : 0)
                ).toFixed(2)}</span>
              </div>
            </div>
          </div>



          {/* Submit button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 font-bold uppercase tracking-widest bg-primary hover:bg-primary/90"
            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.75rem" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Inscrição
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
