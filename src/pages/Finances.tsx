import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, History, Pencil, ChevronDown, ChevronUp, Star, AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeekData {
  week: number;
  total_sales: number;
  product_cost: number;
}

interface PurchaseRow {
  id: string;
  amount: number;
  description: string | null;
  purchase_date: string;
  is_credit: boolean;
  credit_paid: boolean | null;
  credit_due_date: string | null;
  credit_paid_amount: number | null;
  client_name: string;
  client_id: string | null;
}

export default function Finances() {
  const { user } = useAuth();
  const { toast } = useToast();
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [weeks, setWeeks] = useState<WeekData[]>([
    { week: 1, total_sales: 0, product_cost: 0 },
    { week: 2, total_sales: 0, product_cost: 0 },
    { week: 3, total_sales: 0, product_cost: 0 },
    { week: 4, total_sales: 0, product_cost: 0 },
  ]);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [showWeekEditor, setShowWeekEditor] = useState(false);

  // Historial
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseRow | null>(null);
  const [editForm, setEditForm] = useState({ amount: 0, description: '', credit_due_date: '' });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [weekRes, goalRes] = await Promise.all([
        supabase
          .from('weekly_finances')
          .select('week, total_sales, product_cost')
          .eq('user_id', user.id)
          .eq('year', year)
          .eq('month', month),
        supabase
          .from('monthly_goals')
          .select('target_income')
          .eq('user_id', user.id)
          .eq('year', year)
          .eq('month', month),
      ]);

      if (weekRes.data && weekRes.data.length > 0) {
        const mapped = [1, 2, 3, 4].map(w => {
          const found = weekRes.data.find(d => d.week === w);
          return { week: w, total_sales: found ? Number(found.total_sales) : 0, product_cost: found ? Number(found.product_cost) : 0 };
        });
        setWeeks(mapped);
      }

      if (goalRes.data && goalRes.data.length > 0) {
        setMonthlyGoal(Number(goalRes.data[0].target_income));
      }
    };
    load();
  }, [user, year, month]);

  const loadPurchases = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('purchases')
      .select('id, amount, description, purchase_date, is_credit, credit_paid, credit_due_date, credit_paid_amount, client_id, clients(name)')
      .eq('user_id', user.id)
      .order('purchase_date', { ascending: false });
    if (data) {
      setPurchases(data.map((p: any) => ({
        ...p,
        client_name: p.clients?.name || 'Sin clienta',
      })));
    }
  };

  const saveWeek = async (weekData: WeekData) => {
    if (!user) return;
    const { error } = await supabase
      .from('weekly_finances')
      .upsert({
        user_id: user.id, year, month,
        week: weekData.week,
        total_sales: weekData.total_sales,
        product_cost: weekData.product_cost,
      }, { onConflict: 'user_id,year,month,week' });
    if (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } else {
      toast({ title: '¡Guardado! ✅' });
    }
  };

  const openDetail = (p: PurchaseRow) => {
    setEditingPurchase(p);
    setEditForm({
      amount: Number(p.amount),
      description: p.description || '',
      credit_due_date: p.credit_due_date || '',
    });
    setDetailOpen(true);
  };

  const saveEdit = async () => {
    if (!editingPurchase) return;
    await supabase.from('purchases').update({
      amount: editForm.amount,
      description: editForm.description || null,
      credit_due_date: editForm.credit_due_date || null,
    }).eq('id', editingPurchase.id);
    toast({ title: 'Venta actualizada ✅' });
    setDetailOpen(false);
    loadPurchases();
  };

  const markAsPaid = async () => {
    if (!editingPurchase) return;
    await supabase.from('purchases').update({
      credit_paid: true,
      credit_paid_amount: editingPurchase.amount,
    }).eq('id', editingPurchase.id);
    toast({ title: '¡Marcada como pagada! ✅' });
    setDetailOpen(false);
    loadPurchases();
  };

  const getStatusBadge = (p: PurchaseRow) => {
    if (!p.is_credit || p.credit_paid) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">Pagado</Badge>;
    }
    const today = new Date().toISOString().split('T')[0];
    if (p.credit_due_date && p.credit_due_date < today) {
      return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 text-[10px]">Vencido</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-[10px]">Pendiente</Badge>;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + 'T12:00:00'), "d MMM yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // ── Computed values for "Mi Mes" ──
  const monthTotal = weeks.reduce((s, w) => s + w.total_sales, 0);
  const weeksWithData = weeks.filter(w => w.total_sales > 0);
  const avgWeekly = weeksWithData.length > 0 ? monthTotal / weeksWithData.length : 0;
  const bestWeek = weeksWithData.length > 0 ? weeksWithData.reduce((best, w) => w.total_sales > best.total_sales ? w : best, weeksWithData[0]) : null;
  const goalProgress = monthlyGoal > 0 ? Math.min(100, Math.round((monthTotal / monthlyGoal) * 100)) : 0;

  // 3C breakdown
  const reposicion = monthTotal * 0.65;
  const ganancia = monthTotal * 0.30;
  const gastos = monthTotal * 0.05;

  // 50-30-20 of ganancia
  const necesidades = ganancia * 0.50;
  const deseos = ganancia * 0.30;
  const ahorro = ganancia * 0.20;

  // Days remaining in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - today);

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-foreground mb-1">Finanzas</h1>
      <p className="text-sm text-muted-foreground mb-4">{monthNames[month]} {year}</p>

      <Tabs defaultValue="mimes" className="w-full" onValueChange={(v) => { if (v === 'historial') loadPurchases(); }}>
        <TabsList className="grid w-full grid-cols-2 bg-muted rounded-xl h-10">
          <TabsTrigger value="mimes" className="text-xs rounded-lg data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> Mi Mes
          </TabsTrigger>
          <TabsTrigger value="historial" className="text-xs rounded-lg data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            <History className="w-3.5 h-3.5 mr-1" /> Historial
          </TabsTrigger>
        </TabsList>

        {/* ════════ Tab: Mi Mes ════════ */}
        <TabsContent value="mimes" className="mt-4 space-y-4">

          {/* ── Sección 1: Resumen ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-navy rounded-xl p-4 text-primary-foreground">
            <p className="text-xs opacity-70 mb-1">Total vendido en el mes</p>
            <p className="text-3xl font-bold">{formatCurrency(monthTotal)}</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-primary-foreground/10 rounded-lg p-2.5">
                <p className="text-[10px] opacity-70">Promedio semanal</p>
                <p className="text-sm font-semibold">{formatCurrency(avgWeekly)}</p>
              </div>
              <div className="bg-primary-foreground/10 rounded-lg p-2.5">
                <p className="text-[10px] opacity-70">Mejor semana</p>
                <p className="text-sm font-semibold">
                  {bestWeek ? `S${bestWeek.week}: ${formatCurrency(bestWeek.total_sales)}` : '—'}
                </p>
              </div>
            </div>
            {monthlyGoal > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] opacity-70 mb-1">
                  <span>Meta: {formatCurrency(monthlyGoal)}</span>
                  <span>{goalProgress}%</span>
                </div>
                <Progress value={goalProgress} className="h-2 bg-primary-foreground/20 [&>div]:bg-gold" />
                {monthTotal < monthlyGoal && (
                  <p className="text-[10px] opacity-70 mt-1.5">
                    Necesitas vender {formatCurrency(Math.ceil((monthlyGoal - monthTotal) / daysRemaining))} por día para llegar
                  </p>
                )}
              </div>
            )}
          </motion.div>

          {/* ── Sección 2: Desglose 3C ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <h3 className="text-sm font-semibold text-foreground mb-2">Desglose 3C del mes</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
                <p className="text-[10px] text-green-700 dark:text-green-400 font-medium">Reposición 65%</p>
                <p className="text-sm font-bold text-green-800 dark:text-green-300 mt-1">{formatCurrency(reposicion)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center bg-gradient-navy">
                <p className="text-[10px] text-primary-foreground/70 font-medium">Ganancia 30%</p>
                <p className="text-sm font-bold text-primary-foreground mt-1">{formatCurrency(ganancia)}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3 text-center">
                <p className="text-[10px] text-orange-700 dark:text-orange-400 font-medium">Gastos 5%</p>
                <p className="text-sm font-bold text-orange-800 dark:text-orange-300 mt-1">{formatCurrency(gastos)}</p>
              </div>
            </div>
          </motion.div>

          {/* ── Sección 3: 50-30-20 de ganancia ── */}
          {ganancia > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Tu ganancia: {formatCurrency(ganancia)}</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-navy" />
                    <span className="text-xs text-muted-foreground">50% Necesidades</span>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(necesidades)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-gold" />
                    <span className="text-xs text-muted-foreground">30% Deseos</span>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(deseos)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-gold" />
                    <span className="text-xs text-muted-foreground">20% Ahorro / Sueños</span>
                  </div>
                  <span className="text-sm font-bold text-navy">{formatCurrency(ahorro)}</span>
                </div>
              </div>
              <div className="mt-3 bg-gold/10 rounded-lg p-2.5 text-center">
                <p className="text-xs text-foreground">
                  Este mes, <span className="font-bold text-navy">{formatCurrency(ahorro)}</span> fueron a tus sueños ⭐
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Sección 4: Semáforo por semana ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h3 className="text-sm font-semibold text-foreground mb-2">Semáforo semanal</h3>
            <div className="space-y-2">
              {weeks.map((w) => {
                const hasData = w.total_sales > 0;
                const isHealthy = hasData && w.total_sales * 0.65 >= w.product_cost;
                const isUnhealthy = hasData && w.total_sales * 0.65 < w.product_cost;

                return (
                  <div key={w.week} className={`flex items-center gap-3 rounded-xl p-3 border ${
                    !hasData ? 'bg-muted/50 border-border' :
                    isHealthy ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                    'bg-destructive/5 border-destructive/20'
                  }`}>
                    {!hasData ? (
                      <MinusCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                    ) : isHealthy ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Semana {w.week}</p>
                      {hasData ? (
                        <p className="text-[10px] text-muted-foreground">
                          Venta: {formatCurrency(w.total_sales)} · Costo: {formatCurrency(w.product_cost)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Sin datos</p>
                      )}
                    </div>
                    {isUnhealthy && (
                      <p className="text-[9px] text-destructive font-medium shrink-0">Revisa tu precio</p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* ── Sección 5: Editor de semanas ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Button
              variant="outline"
              onClick={() => setShowWeekEditor(!showWeekEditor)}
              className="w-full justify-between text-xs h-10 rounded-xl"
            >
              <span>✏️ Actualizar mis semanas</span>
              {showWeekEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            <AnimatePresence>
              {showWeekEditor && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-3">
                    {weeks.map((w, i) => (
                      <div key={w.week} className="bg-card rounded-xl p-4 shadow-card">
                        <h4 className="text-xs font-semibold text-foreground mb-2">Semana {w.week}</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-[10px]">Venta total</Label>
                            <Input
                              type="number"
                              value={w.total_sales || ''}
                              onChange={(e) => {
                                const updated = [...weeks];
                                updated[i] = { ...w, total_sales: Number(e.target.value) || 0 };
                                setWeeks(updated);
                              }}
                              placeholder="$0"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Costo producto</Label>
                            <Input
                              type="number"
                              value={w.product_cost || ''}
                              onChange={(e) => {
                                const updated = [...weeks];
                                updated[i] = { ...w, product_cost: Number(e.target.value) || 0 };
                                setWeeks(updated);
                              }}
                              placeholder="$0"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => saveWeek(w)}
                          className="mt-2 w-full bg-navy text-primary-foreground h-8 text-xs rounded-lg"
                        >
                          Guardar semana {w.week}
                        </Button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </TabsContent>

        {/* ════════ Tab: Historial ════════ */}
        <TabsContent value="historial" className="mt-4 space-y-2">
          {purchases.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground">
                Aún no hay ventas registradas. Usa el botón Vender para empezar 💪
              </p>
            </div>
          ) : (
            purchases.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => openDetail(p)}
                className="w-full bg-card rounded-xl p-4 shadow-card text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.client_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.description || 'Venta'}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-semibold text-navy">{formatCurrency(Number(p.amount))}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(p.purchase_date)}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-2">
                  <Badge variant="outline" className="text-[10px]">
                    {p.is_credit ? '💳 Crédito' : '💵 Contado'}
                  </Badge>
                  {getStatusBadge(p)}
                </div>
              </motion.button>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Purchase Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          {editingPurchase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="w-4 h-4" /> Detalle de venta
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Clienta</p>
                  <p className="text-sm font-semibold">{editingPurchase.client_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(editingPurchase.purchase_date)}</p>
                </div>

                <div>
                  <Label className="text-xs">Monto</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      value={editForm.amount || ''}
                      onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) || 0 })}
                      className="pl-7"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Descripción</Label>
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Ej: Zapatillas negras"
                    className="mt-1"
                  />
                </div>

                {editingPurchase.is_credit && (
                  <div>
                    <Label className="text-xs">Fecha de pago acordada</Label>
                    <Input
                      type="date"
                      value={editForm.credit_due_date}
                      onChange={(e) => setEditForm({ ...editForm, credit_due_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                )}

                <Button onClick={saveEdit} className="w-full bg-navy text-primary-foreground">
                  Guardar cambios
                </Button>

                {editingPurchase.is_credit && !editingPurchase.credit_paid && (
                  <Button
                    onClick={markAsPaid}
                    variant="outline"
                    className="w-full border-green-500 text-green-700 hover:bg-green-50"
                  >
                    ✅ Marcar como pagada
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
