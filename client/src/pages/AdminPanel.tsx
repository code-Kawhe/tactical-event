import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Trash2,
  Edit2,
  DollarSign
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

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
  const { user, loading, isAuthenticated, refresh } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [deleteItem, setDeleteItem] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Login realizado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao realizar login");
    },
  });

  const deleteMutation = trpc.registration.delete.useMutation({
    onSuccess: () => {
      toast.success("Inscrição excluída com sucesso");
      utils.registration.list.invalidate();
      utils.registration.getTeamCounts.invalidate();
      setDeleteItem(null);
    },
    onError: (error) => toast.error(error.message || "Erro ao excluir"),
  });

  const updateMutation = trpc.registration.update.useMutation({
    onSuccess: () => {
      toast.success("Inscrição atualizada com sucesso");
      utils.registration.list.invalidate();
      utils.registration.getTeamCounts.invalidate();
      setEditItem(null);
    },
    onError: (error) => toast.error(error.message || "Erro ao atualizar"),
  });

  const confirmPaymentMutation = trpc.registration.confirmPayment.useMutation({
    onSuccess: () => {
      toast.success("Pagamento confirmado com sucesso");
      utils.registration.list.invalidate();
    },
    onError: (error) => toast.error(error.message || "Erro ao confirmar pagamento"),
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    setIsLoggingIn(true);
    try {
      await loginMutation.mutateAsync({ email, password });
    } catch (error: any) {
      console.error("Login error", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    
    // Convert string inputs to proper types
    const updatedData = {
      ...editItem,
      companionCount: parseInt(editItem.companionCount) || 0,
      wantsPatch: editItem.wantsPatch === true || editItem.wantsPatch === "true",
      wantsShirt: editItem.wantsShirt === true || editItem.wantsShirt === "true",
      hasCompanion: editItem.hasCompanion === true || editItem.hasCompanion === "true",
      isAdult: editItem.isAdult === true || editItem.isAdult === "true",
    };

    updateMutation.mutate({
      id: editItem.id,
      data: updatedData,
    });
  };

  const { data, isLoading: dataLoading } = trpc.registration.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 15000,
  });
  const { mutate: exportExcel, isPending: isExporting } = trpc.registration.exportExcel.useMutation();

  const handleExportExcel = async () => {
    exportExcel(undefined, {
      onSuccess: (result: { success: boolean; buffer: string; filename: string }) => {
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

          <form onSubmit={handleLogin} className="space-y-4 mb-6 text-left">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@admin.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-card/50 border-primary/20 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-card/50 border-primary/20 focus:border-primary/50"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-12 font-bold uppercase tracking-widest mt-4"
              style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.75rem" }}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar no Sistema
                </>
              )}
            </Button>
          </form>

          <Link href="/">
            <button className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mx-auto">
              <ArrowLeft className="w-3 h-3" /> Voltar ao início
            </button>
          </Link>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen tactical-bg relative">
      {/* Delete Modal */}
      {deleteItem !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border-2 border-destructive/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-destructive mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>CONFIRMAR EXCLUSÃO</h3>
            <p className="text-sm text-muted-foreground mb-6">Tem certeza que deseja excluir esta inscrição? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteItem(null)} disabled={deleteMutation.isPending}>Cancelar</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate({ id: deleteItem })} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border-2 border-primary/30 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-xl font-bold text-foreground mb-4" style={{ fontFamily: "'Orbitron', sans-serif" }}>EDITAR INSCRIÇÃO</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label>Nome Completo</Label>
                <Input value={editItem.fullName} onChange={e => setEditItem({...editItem, fullName: e.target.value})} />
              </div>
              <div>
                <Label>Equipe</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editItem.team} 
                  onChange={e => setEditItem({...editItem, team: e.target.value})}
                >
                  <option value="FORCA_INTERVENCAO">Força de Intervenção</option>
                  <option value="MILICIA_LOCAL">Milícia Local</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patch (+R$15)</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editItem.wantsPatch ? "true" : "false"} 
                    onChange={e => setEditItem({...editItem, wantsPatch: e.target.value === "true"})}
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>
                <div>
                  <Label>Camisa (+R$50)</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editItem.wantsShirt ? "true" : "false"} 
                    onChange={e => setEditItem({...editItem, wantsShirt: e.target.value === "true"})}
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>
              </div>
              {editItem.wantsShirt && (
                <div>
                  <Label>Tamanho da Camisa</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editItem.shirtSize || "M"} 
                    onChange={e => setEditItem({...editItem, shirtSize: e.target.value})}
                  >
                    <option value="P">P</option>
                    <option value="M">M</option>
                    <option value="G">G</option>
                    <option value="GG">GG</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Acompanhante (+R$25)</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editItem.hasCompanion ? "true" : "false"} 
                    onChange={e => setEditItem({...editItem, hasCompanion: e.target.value === "true"})}
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>
                {editItem.hasCompanion && (
                  <div>
                    <Label>Qtd. Acompanhantes</Label>
                    <Input type="number" min="1" value={editItem.companionCount || 1} onChange={e => setEditItem({...editItem, companionCount: e.target.value})} />
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <Button variant="outline" type="button" onClick={() => setEditItem(null)} disabled={updateMutation.isPending}>Cancelar</Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Cpf</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Equipe</th>
                    <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Patch</th>
                    <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Camisa</th>
                    <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Acomp.</th>
                    <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Pagamento</th>
                    <th className="text-center px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, idx) => (
                    <tr key={reg.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{reg.fullName}</td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{reg.cpf}</td>
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
                      <td className="px-4 py-3 text-center">
                        {reg.paymentStatus === "confirmed" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-900/20 px-2 py-0.5 rounded-full">
                            PAGO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded-full">
                            PENDENTE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {reg.paymentStatus !== "confirmed" && (
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 text-green-400 border-green-500/30 hover:bg-green-500/10" 
                              title="Confirmar Pagamento"
                              onClick={() => confirmPaymentMutation.mutate({ registrationId: reg.id })}
                              disabled={confirmPaymentMutation.isPending}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-blue-400 border-blue-500/30 hover:bg-blue-500/10" 
                            title="Editar Inscrição"
                            onClick={() => setEditItem(reg)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10" 
                            title="Excluir Inscrição"
                            onClick={() => setDeleteItem(reg.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
