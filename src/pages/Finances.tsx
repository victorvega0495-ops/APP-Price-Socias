import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, History, Pencil, Star, AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const HEADER_GRADIENT = 'linear-gradient(145deg, #2D1B69 0%, #6B2FA0 45%, #C06DD6 100%)';
const PILL_BG = 'rgba(255,255,255,0.15)';
const PILL_ACTIVE = { background: 'white', color: '#2D1B69' };
const PILL_INACTIVE = { background: 'transparent', color: 'rgba(255,255,255,0.7)' };
const CARD_SHADOW = '0 2px 12px rgba(0,0,0,0.07)';

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
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'mimes' | 'historial'>('mimes');
  const [weeks, setWeeks] = useState<WeekData[]>([
    { week: 1, total_sales: 0, product_cost: 0 },
    { week: 2, total_sales: 0, product_cost: 0 },
    { week: 3, total_sales: 0, product_cost: 0 },
    { week: 4, total_sales: 0, product_cost: 0 },
  ]);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saleItemsMap, setSaleItemsMap] = useState<Record<string, string[]>>({});
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseRow | null>(null);
  const [editForm, setEditForm] = useState({ amount: 0, description: '', credit_due_date: '' });

  const pctReposicion = (profile?.pct_reposicion ?? 65) / 100;
  const pctGanancia = (profile?.pct_ganancia ?? 30) / 100;
  const pctAhorro = (profile?.pct_ahorro ?? 20) / 100;
  const pctGastos = 1 - pctReposicion - pctGanancia;
  const pctNecesidades = (1 - pctAhorro) * 0.625;
  const pctDeseos = (1 - pctAhorro) * 0.375;

  const daysInMonth = new Date(year, month, 0).getDate();
  const weekRanges: Record<number, [number, number]> = { 1: [1, 7], 2: [8, 14], 3: [15, 21], 4: [22, daysInMonth] };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: goalRes } = await supabase.from('monthly_goals').select('target_income').eq('user_id', user.id).eq('year', year).eq('month', month);
      if (goalRes && goalRes.length > 0) setMonthlyGoal(Number(goalRes[0].target_income));
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      const { data: purchasesData } = await supabase.from('purchases').select('amount, cost_price, purchase_date').eq('user_id', user.id).gte('purchase_date', monthStart).lte('purchase_date', monthEnd);
      const computed: WeekData[] = [1, 2, 3, 4].map(w => {
        const [startDay, endDay] = weekRanges[w];
        const startDate = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
        const weekPurchases = (purchasesData || []).filter(p => p.purchase_date >= startDate && p.purchase_date <= endDate);
        return { week: w, total_sales: weekPurchases.reduce((s, p) => s + Number(p.amount), 0), product_cost: weekPurchases.reduce((s, p) => s + (p.cost_price ? Number(p.cost_price) : 0), 0) };
      });
      setWeeks(computed);
    };
    load();
  }, [user, year, month]);

  const loadPurchases = async () => {
    if (!user) return;
    const { data } = await supabase.from('purchases').select('id, amount, description, purchase_date, is_credit, credit_paid, credit_due_date, credit_paid_amount, client_id, clients(name)').eq('user_id', user.id).order('purchase_date', { ascending: false });
    if (data) {
      setPurchases(data.map((p: any) => ({ ...p, client_name: p.clients?.name || 'Sin clienta' })));
      const purchaseIds = data.map((p: any) => p.id);
      if (purchaseIds.length > 0) {
        const { data: items } = await supabase.from('sale_items').select('purchase_id, category, quantity').in('purchase_id', purchaseIds);
        if (items) { const map: Record<string, string[]> = {}; items.forEach((item: any) => { if (!map[item.purchase_id]) map[item.purchase_id] = []; map[item.purchase_id].push(`${item.quantity}x ${item.category}`); }); setSaleItemsMap(map); }
      }
    }
  };

  const openDetail = (p: PurchaseRow) => { setEditingPurchase(p); setEditForm({ amount: Number(p.amount), description: p.description || '', credit_due_date: p.credit_due_date || '' }); setDetailOpen(true); };
  const saveEdit = async () => { if (!editingPurchase) return; await supabase.from('purchases').update({ amount: editForm.amount, description: editForm.description || null, credit_due_date: editForm.credit_due_date || null }).eq('id', editingPurchase.id); toast({ title: 'Venta actualizada ✅' }); setDetailOpen(false); loadPurchases(); };
  const markAsPaid = async () => { if (!editingPurchase) return; await supabase.from('purchases').update({ credit_paid: true, credit_paid_amount: editingPurchase.amount }).eq('id', editingPurchase.id); toast({ title: '¡Marcada como pagada! ✅' }); setDetailOpen(false); loadPurchases(); };

  const getStatusBadge = (p: PurchaseRow) => {
    if (!p.is_credit || p.credit_paid) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">Pagado</Badge>;
    const today = new Date().toISOString().split('T')[0];
    if (p.credit_due_date && p.credit_due_date < today) return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 text-[10px]">Vencido</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-[10px]">Pendiente</Badge>;
  };

  const formatDate = (dateStr: string) => { try { return format(new Date(dateStr + 'T12:00:00'), "d MMM yyyy", { locale: es }); } catch { return dateStr; } };

  const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const monthTotal = weeks.reduce((s, w) => s + w.total_sales, 0);
  const weeksWithData = weeks.filter(w => w.total_sales > 0);
  const avgWeekly = weeksWithData.length > 0 ? monthTotal / weeksWithData.length : 0;
  const bestWeek = weeksWithData.length > 0 ? weeksWithData.reduce((best, w) => w.total_sales > best.total_sales ? w : best, weeksWithData[0]) : null;
  const salesGoal = monthlyGoal > 0 ? monthlyGoal / pctGanancia : 0;
  const goalProgress = salesGoal > 0 ? Math.min(100, Math.round((monthTotal / salesGoal) * 100)) : 0;

  const reposicion = monthTotal * pctReposicion;
  const ganancia = monthTotal * pctGanancia;
  const gastos = monthTotal * pctGastos;
  const necesidades = ganancia * pctNecesidades;
  const deseos = ganancia * pctDeseos;
  const ahorro = ganancia * pctAhorro;

  const today = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - today);

  const pctReposicionLabel = Math.round(pctReposicion * 100);
  const pctGananciaLabel = Math.round(pctGanancia * 100);
  const pctGastosLabel = Math.round(pctGastos * 100);
  const pctNecesidadesLabel = Math.round(pctNecesidades * 100);
  const pctDeseosLabel = Math.round(pctDeseos * 100);
  const pctAhorroLabel = Math.round(pctAhorro * 100);

  return (
    <div>
      {/* HEADER */}
      <div style={{ background: HEADER_GRADIENT, padding: '48px 20px 24px' }}>
        <h1 className="text-white" style={{ fontFamily: 'Nunito, sans-serif', fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
          Finanzas 💰
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{monthNames[month]} {year}</p>
        <div className="flex gap-1 mt-4 p-1 rounded-xl" style={{ background: PILL_BG }}>
          <button onClick={() => setActiveTab('mimes')} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1" style={activeTab === 'mimes' ? PILL_ACTIVE : PILL_INACTIVE}>
            <TrendingUp className="w-3.5 h-3.5" /> Mi Mes
          </button>
          <button onClick={() => { setActiveTab('historial'); loadPurchases(); }} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1" style={activeTab === 'historial' ? PILL_ACTIVE : PILL_INACTIVE}>
            <History className="w-3.5 h-3.5" /> Historial
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="px-4 pt-5 pb-4" style={{ background: '#F5F5F7', minHeight: 'calc(100vh - 200px)' }}>
        {activeTab === 'mimes' && (
          <div className="space-y-4">
            {/* Resumen */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}>
              <p className="text-xs opacity-70 mb-1">Total vendido en el mes</p>
              <p className="text-3xl font-bold" style={{ fontFamily: 'Nunito, sans-serif' }}>{formatCurrency(monthTotal)}</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <p className="text-[10px] opacity-70">Promedio semanal</p>
                  <p className="text-sm font-semibold" style={{ fontFamily: 'Nunito, sans-serif' }}>{formatCurrency(avgWeekly)}</p>
                </div>
                <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <p className="text-[10px] opacity-70">Mejor semana</p>
                  <p className="text-sm font-semibold" style={{ fontFamily: 'Nunito, sans-serif' }}>{bestWeek ? `S${bestWeek.week}: ${formatCurrency(bestWeek.total_sales)}` : '—'}</p>
                </div>
              </div>
              {monthlyGoal > 0 && (
                <div className="mt-3">
                  <div className="flex flex-col gap-0.5 text-[10px] opacity-70 mb-1">
                    <div className="flex justify-between"><span>Meta de venta: {formatCurrency(salesGoal)}</span><span>{goalProgress}%</span></div>
                    <span>Meta de ganancia: {formatCurrency(monthlyGoal)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <div className="h-full rounded-full" style={{ width: `${goalProgress}%`, background: 'linear-gradient(90deg, #C06DD6, #E8A5F0)', boxShadow: '0 0 8px rgba(192,109,214,0.4)' }} />
                  </div>
                  <p className="text-[10px] opacity-50 mt-1">Tu ganancia es el {pctGananciaLabel}% de tus ventas totales</p>
                  {monthTotal < salesGoal && <p className="text-[10px] opacity-70 mt-1">Necesitas vender {formatCurrency(Math.ceil((salesGoal - monthTotal) / daysRemaining))} por día para llegar</p>}
                </div>
              )}
            </motion.div>

            {/* 3C */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#2D1B69' }}>Desglose 3C del mes</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-xl p-3 text-center" style={{ boxShadow: CARD_SHADOW }}>
                  <p className="text-[10px] font-medium" style={{ color: '#6B2FA0' }}>Producto {pctReposicionLabel}%</p>
                  <p className="text-sm font-bold mt-1" style={{ color: '#2D1B69', fontFamily: 'Nunito, sans-serif' }}>{formatCurrency(reposicion)}</p>
                </div>
                <div className="rounded-xl p-3 text-center text-white" style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}>
                  <p className="text-[10px] opacity-70 font-medium">Ganancia {pctGananciaLabel}%</p>
                  <p className="text-sm font-bold mt-1" style={{ fontFamily: 'Nunito, sans-serif' }}>{formatCurrency(ganancia)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center" style={{ boxShadow: CARD_SHADOW }}>
                  <p className="text-[10px] font-medium" style={{ color: '#6B2FA0' }}>Gastos {pctGastosLabel}%</p>
                  <p className="text-sm font-bold mt-1" style={{ color: '#2D1B69', fontFamily: 'Nunito, sans-serif' }}>{formatCurrency(gastos)}</p>
                </div>
              </div>
            </motion.div>

            {/* Distribución ganancia */}
            {ganancia > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-4 space-y-3" style={{ boxShadow: CARD_SHADOW }}>
                <h3 className="text-sm font-semibold" style={{ color: '#2D1B69' }}>Tu ganancia: {formatCurrency(ganancia)}</h3>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2D1B69' }} /><span className="text-xs" style={{ color: '#8a8a9a' }}>{pctNecesidadesLabel}% Necesidades</span></div><span className="text-sm font-semibold" style={{ color: '#2D1B69', fontFamily: 'Nunito, sans-serif' }}>{formatCurrency(necesidades)}</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#C06DD6' }} /><span className="text-xs" style={{ color: '#8a8a9a' }}>{pctDeseosLabel}% Deseos</span></div><span className="text-sm font-semibold" style={{ color: '#2D1B69', fontFamily: 'Nunito, sans-serif' }}>{formatCurrency(deseos)}</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Star className="w-3 h-3" style={{ color: '#C06DD6' }} /><span className="text-xs" style={{ color: '#8a8a9a' }}>{pctAhorroLabel}% Ahorro / Sueños</span></div><span className="text-sm font-bold" style={{ color: '#6B2FA0', fontFamily: 'Nunito, sans-serif' }}>{formatCurrency(ahorro)}</span></div>
                </div>
                <div className="rounded-lg p-2.5 text-center" style={{ background: '#F0E6F6' }}>
                  <p className="text-xs" style={{ color: '#2D1B69' }}>Este mes, <span className="font-bold" style={{ color: '#6B2FA0' }}>{formatCurrency(ahorro)}</span> fueron a tus sueños ⭐</p>
                </div>
              </motion.div>
            )}

            {/* Semáforo */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#2D1B69' }}>Semáforo semanal</h3>
              <div className="space-y-2">
                {weeks.map((w) => {
                  const hasData = w.total_sales > 0;
                  const isHealthy = hasData && w.total_sales * pctReposicion >= w.product_cost;
                  const isUnhealthy = hasData && w.total_sales * pctReposicion < w.product_cost;
                  return (
                    <div key={w.week} className="flex items-center gap-3 rounded-xl p-3 bg-white" style={{ boxShadow: CARD_SHADOW }}>
                      {!hasData ? <MinusCircle className="w-5 h-5 shrink-0" style={{ color: '#8a8a9a' }} /> : isHealthy ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: '#2D1B69' }}>Semana {w.week}</p>
                        {hasData ? <p className="text-[10px]" style={{ color: '#8a8a9a' }}>Venta: {formatCurrency(w.total_sales)} · Costo: {formatCurrency(w.product_cost)}</p> : <p className="text-[10px]" style={{ color: '#8a8a9a' }}>Sin datos</p>}
                      </div>
                      {isUnhealthy && <p className="text-[9px] text-destructive font-medium shrink-0">Revisa tu precio</p>}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="space-y-2">
            <Input placeholder="Buscar clienta..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="mb-2 rounded-xl" />
            {(() => {
              const filtered = purchases.filter(p => p.client_name.toLowerCase().includes(searchQuery.toLowerCase()));
              if (filtered.length === 0) return <div className="text-center py-10"><p className="text-sm" style={{ color: '#8a8a9a' }}>{purchases.length === 0 ? 'Aún no hay ventas registradas. Usa el botón Vender para empezar 💪' : 'No se encontraron ventas'}</p></div>;
              return filtered.map((p, i) => {
                const descIsEmpty = !p.description || p.description.trim() === '' || p.description.toLowerCase() === 'nada';
                const itemLabels = saleItemsMap[p.id];
                const subtitle = descIsEmpty ? (itemLabels && itemLabels.length > 0 ? itemLabels.join(', ') : null) : p.description;
                return (
                  <motion.button key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} onClick={() => openDetail(p)} className="w-full bg-white rounded-2xl p-4 text-left" style={{ boxShadow: CARD_SHADOW }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate" style={{ color: '#2D1B69' }}>{p.client_name}</p>{subtitle && <p className="text-xs truncate" style={{ color: '#8a8a9a' }}>{subtitle}</p>}</div>
                      <div className="text-right ml-3 shrink-0"><p className="text-sm font-semibold" style={{ color: '#6B2FA0', fontFamily: 'Nunito, sans-serif' }}>{formatCurrency(Number(p.amount))}</p><p className="text-[10px]" style={{ color: '#8a8a9a' }}>{formatDate(p.purchase_date)}</p></div>
                    </div>
                    <div className="flex gap-1.5 mt-2"><Badge variant="outline" className="text-[10px]">{p.is_credit ? '💳 Crédito' : '💵 Contado'}</Badge>{getStatusBadge(p)}</div>
                  </motion.button>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          {editingPurchase && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-4 h-4" /> Detalle de venta</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="rounded-lg p-3 text-center" style={{ background: '#F0E6F6' }}>
                  <p className="text-xs" style={{ color: '#8a8a9a' }}>Clienta</p>
                  <p className="text-sm font-semibold" style={{ color: '#2D1B69' }}>{editingPurchase.client_name}</p>
                  <p className="text-xs mt-1" style={{ color: '#8a8a9a' }}>{formatDate(editingPurchase.purchase_date)}</p>
                </div>
                <div><Label className="text-xs">Monto</Label><div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#8a8a9a' }}>$</span><Input type="number" value={editForm.amount || ''} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) || 0 })} className="pl-7" /></div></div>
                <div><Label className="text-xs">Descripción</Label><Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Ej: Zapatillas negras" className="mt-1" /></div>
                {editingPurchase.is_credit && (<div><Label className="text-xs">Fecha de pago acordada</Label><Input type="date" value={editForm.credit_due_date} onChange={(e) => setEditForm({ ...editForm, credit_due_date: e.target.value })} className="mt-1" /></div>)}
                <Button onClick={saveEdit} className="w-full text-white" style={{ background: '#6B2FA0' }}>Guardar cambios</Button>
                {editingPurchase.is_credit && !editingPurchase.credit_paid && (<Button onClick={markAsPaid} variant="outline" className="w-full border-green-500 text-green-700 hover:bg-green-50">✅ Marcar como pagada</Button>)}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
