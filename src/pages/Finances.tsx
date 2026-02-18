import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatCurrencyDecimals } from '@/lib/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, TrendingUp, History, Pencil } from 'lucide-react';
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

  // Historial
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseRow | null>(null);
  const [editForm, setEditForm] = useState({ amount: 0, description: '', credit_due_date: '' });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('weekly_finances')
        .select('week, total_sales, product_cost')
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('month', month);
      if (data && data.length > 0) {
        const mapped = [1, 2, 3, 4].map(w => {
          const found = data.find(d => d.week === w);
          return { week: w, total_sales: found ? Number(found.total_sales) : 0, product_cost: found ? Number(found.product_cost) : 0 };
        });
        setWeeks(mapped);
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
  const monthTotal = weeks.reduce((s, w) => s + w.total_sales, 0);

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-foreground mb-1">Finanzas</h1>
      <p className="text-sm text-muted-foreground mb-4">{monthNames[month]} {year}</p>

      <Tabs defaultValue="weekly" className="w-full" onValueChange={(v) => { if (v === 'historial') loadPurchases(); }}>
        <TabsList className="grid w-full grid-cols-2 bg-muted rounded-xl h-10">
          <TabsTrigger value="weekly" className="text-xs rounded-lg data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> Control Semanal
          </TabsTrigger>
          <TabsTrigger value="historial" className="text-xs rounded-lg data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            <History className="w-3.5 h-3.5 mr-1" /> Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab A: Control Semanal */}
        <TabsContent value="weekly" className="mt-4 space-y-3">
          {weeks.map((w, i) => {
            const costLimit = w.total_sales * 0.65;
            const isOverCost = w.product_cost > costLimit && w.total_sales > 0;
            return (
              <motion.div
                key={w.week}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl p-4 shadow-card"
              >
                <h3 className="text-sm font-semibold text-foreground mb-3">Semana {w.week}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Venta total</Label>
                    <Input
                      type="number"
                      value={w.total_sales || ''}
                      onChange={(e) => {
                        const updated = [...weeks];
                        updated[i] = { ...w, total_sales: Number(e.target.value) || 0 };
                        setWeeks(updated);
                      }}
                      placeholder="$0"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Costo producto</Label>
                    <Input
                      type="number"
                      value={w.product_cost || ''}
                      onChange={(e) => {
                        const updated = [...weeks];
                        updated[i] = { ...w, product_cost: Number(e.target.value) || 0 };
                        setWeeks(updated);
                      }}
                      placeholder="$0"
                      className="h-9"
                    />
                  </div>
                </div>
                {w.total_sales > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">Reposición 65%</p>
                      <p className="text-xs font-semibold">{formatCurrency(w.total_sales * 0.65)}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">Ganancia 30%</p>
                      <p className="text-xs font-semibold text-navy">{formatCurrency(w.total_sales * 0.30)}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">Gastos 5%</p>
                      <p className="text-xs font-semibold">{formatCurrency(w.total_sales * 0.05)}</p>
                    </div>
                  </div>
                )}
                {isOverCost && (
                  <div className="mt-2 flex items-start gap-2 bg-destructive/10 rounded-lg p-2.5">
                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground">
                      ⚠️ Tu precio de venta está muy bajo. No estás cubriendo el costo de tu producto.
                    </p>
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={() => saveWeek(w)}
                  className="mt-3 w-full bg-navy text-primary-foreground h-8 text-xs rounded-lg"
                >
                  Guardar semana {w.week}
                </Button>
              </motion.div>
            );
          })}
          <div className="bg-gradient-navy rounded-xl p-4 text-center">
            <p className="text-xs text-primary-foreground/70">Total del mes</p>
            <p className="text-2xl font-bold text-primary-foreground">{formatCurrency(monthTotal)}</p>
          </div>
        </TabsContent>

        {/* Tab B: Historial */}
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
