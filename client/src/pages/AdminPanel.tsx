import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Users,
  LogIn,
  Loader2,
  CheckCircle2,
  XCircle,
  Target,
  Crosshair,
  ArrowLeft,
  Download,
} from "lucide-react";
import { Link } from "wouter";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 military-glow">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-black ${color ?? "text-foreground"}`} style={{ fontFamily: "'Orbitron', sans-serif" }}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPanel() {
  const { user, loading, isAuthenticated } = useAuth();

  const { data, isLoading: dataLoading } = trpc.registration.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 15000,
  });
  const { mutate: exportExcel, isPending: isExporting } = trpc.registration.exportExcel.useMutation();

  const handleExportExcel = async () => {
    exportExcel(undefined, {
      onSuccess: (result: { success: boolean; buffer: string; filename: string }) => {
        // Decode base64 to binary string
        const binaryString = atob(result.buffer);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
    });
  };

  // Loading auth state
  if (loading) {
    return (
      <div className="min-h-screen tactical-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground uppercase tracking-widest text-sm">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen tactical-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 mb-6 military-glow">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-black mb-2 text-foreground" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            ACESSO RESTRITO
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Autenticação necessária para acessar o painel de comando.
          </p>
          <Button
            asChild
            className="w-full h-12 font-bold uppercase tracking-widest"
            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.75rem" }}
          >
            <a href={getLoginUrl()}>
              <LogIn className="w-4 h-4 mr-2" />
              Autenticar Acesso
            </a>
          </Button>
          <Link href="/">
            <button className="mt-4 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mx-auto">
              <ArrowLeft className="w-3 h-3" /> Voltar ao início
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated but not admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen tactical-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive/30 mb-6">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-black mb-2 text-foreground" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            ACESSO NEGADO
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Você não possui permissões de administrador para acessar este painel.
          </p>
          <Link href="/">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const registrations = data?.registrations ?? [];
  const counts = data?.counts;
  const limit = data?.limit ?? 75;

  const totalRegistrations = registrations.length;
  const patchCount = registrations.filter(r => r.wantsPatch).length;
  const shirtCount = registrations.filter(r => r.wantsShirt).length;
  const companionTotal = registrations.reduce((sum, r) => sum + (r.companionCount ?? 0), 0);

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
              <p className="text-xs text-muted-foreground uppercase tracking-widest leading-none">Painel de</p>
              <p className="font-bold text-foreground leading-tight" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.8rem" }}>
                COMANDO
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.name}</span>
            <Link href="/">
              <button className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Inscrições
              </button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            PAINEL ADMINISTRATIVO
          </h1>
          <p className="text-muted-foreground text-sm">Gerenciamento de inscrições e controle de vagas</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total de Inscritos" value={totalRegistrations} color="text-primary" />
          <StatCard label="Patches Solicitados" value={patchCount} color="text-amber-400" />
          <StatCard label="Camisas Solicitadas" value={shirtCount} color="text-blue-400" />
          <StatCard label="Acompanhantes" value={companionTotal} color="text-purple-400" />
        </div>

        {/* Team counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-green-500/30 bg-green-900/10 p-5">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-5 h-5 text-green-400" />
              <p className="font-bold text-green-400 text-xs uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                FORÇA DE INTERVENÇÃO
              </p>
            </div>
            <p className="text-4xl font-black text-green-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {counts?.FORCA_INTERVENCAO ?? 0}
              <span className="text-lg text-green-400/50">/{limit}</span>
            </p>
            <div className="progress-bar mt-3">
              <div
                className={`progress-fill ${(counts?.FORCA_INTERVENCAO ?? 0) / limit > 0.8 ? "danger" : ""}`}
                style={{ width: `${Math.min(100, ((counts?.FORCA_INTERVENCAO ?? 0) / limit) * 100)}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-900/10 p-5">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-5 h-5 text-amber-400" />
              <p className="font-bold text-amber-400 text-xs uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                MILÍCIA LOCAL
              </p>
            </div>
            <p className="text-4xl font-black text-amber-400" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {counts?.MILICIA_LOCAL ?? 0}
              <span className="text-lg text-amber-400/50">/{limit}</span>
            </p>
            <div className="progress-bar mt-3">
              <div
                className={`progress-fill ${(counts?.MILICIA_LOCAL ?? 0) / limit > 0.8 ? "danger" : ""}`}
                style={{ width: `${Math.min(100, ((counts?.MILICIA_LOCAL ?? 0) / limit) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Registrations table */}
        <div className="rounded-xl border border-border bg-card military-glow overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-bold uppercase tracking-widest text-sm" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                Lista de Inscritos
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                {totalRegistrations} registros
              </span>
              <Button
                onClick={() => handleExportExcel()}
                disabled={isExporting || totalRegistrations === 0}
                size="sm"
                className="gap-2"
                type="button"
              >
                <Download className="w-4 h-4" />
                {isExporting ? "Exportando..." : "Exportar Excel"}
              </Button>
            </div>
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma inscrição registrada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Nº</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Nome</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Equipe</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Telefone</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Familiar</th>
                    <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">+18</th>
                    <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Patch</th>
                    <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Camisa</th>
                    <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Acomp.</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, idx) => (
                    <tr key={reg.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{reg.fullName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {reg.team === "FORCA_INTERVENCAO" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-900/20 px-2 py-0.5 rounded-full">
                            <Shield className="w-3 h-3" /> F. INTERVENÇÃO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded-full">
                            <Target className="w-3 h-3" /> MILÍCIA LOCAL
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{reg.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{reg.familyPhone}</td>
                      <td className="px-4 py-3 text-center">
                        {reg.isAdult ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {reg.wantsPatch ? (
                          <CheckCircle2 className="w-4 h-4 text-primary mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {reg.wantsShirt ? (
                          <span className="text-xs font-bold text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-full">
                            {reg.shirtSize}
                          </span>
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-foreground font-medium">
                        {reg.hasCompanion ? reg.companionCount : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(reg.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
