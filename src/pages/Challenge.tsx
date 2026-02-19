import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Mark reto as visited for checklist
function useMarkVisitedReto() {
  const { user, profile } = useAuth();
  useEffect(() => {
    if (user && profile && !profile.visited_reto) {
      supabase.from('profiles').update({ visited_reto: true }).eq('user_id', user.id).then(() => {});
    }
  }, [user, profile]);
}
import { formatCurrency, daysRemaining, progressPercentage } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar, Pencil, Lock } from 'lucide-react';

const HEADER_GRADIENT = 'linear-gradient(145deg, #2D1B69 0%, #6B2FA0 45%, #C06DD6 100%)';
const CARD_SHADOW = '0 2px 12px rgba(0,0,0,0.07)';

const DREAM_TEMPLATES = [
  { type: 'coche', emoji: '🚗', name: 'Mi coche', fixed: false },
  { type: 'casa', emoji: '🏠', name: 'Mi casa / renta', fixed: false },
  { type: 'vacaciones', emoji: '✈️', name: 'Mis vacaciones', fixed: false },
  { type: 'capricho', emoji: '📱', name: 'Un capricho', fixed: false },
  { type: 'personalizada', emoji: '✏️', name: 'Meta personalizada', fixed: false },
] as const;
type GoalTemplate = typeof DREAM_TEMPLATES[number];

interface ActiveGoal { id: string; target_name: string; target_type: string; target_amount: number; deadline: string; monthly_sales_needed: number; }

function getMotivationalPhrase(pct: number) {
  if (pct >= 100) return '¡META CUMPLIDA! 🎉🏆';
  if (pct >= 76) return '¡Estás a nada de lograrlo! 🚀';
  if (pct >= 51) return '¡Casi lo tienes! Sigue así 🔥';
  if (pct >= 26) return '¡Ya vas a la mitad del camino! 🌟';
  return '¡Cada venta te acerca más! 💪';
}

function getEmojiForType(type: string) { return DREAM_TEMPLATES.find(t => t.type === type)?.emoji ?? '🎯'; }

export default function Challenge() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  useMarkVisitedReto();
  const [activeGoal, setActiveGoal] = useState<ActiveGoal | null>(null);
  const [monthlySales, setMonthlySales] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formMonths, setFormMonths] = useState(3);
  const [saving, setSaving] = useState(false);

  const pctGanancia = profile?.pct_ganancia ?? 30;
  const pctAhorro = profile?.pct_ahorro ?? 20;

  const loadData = async () => {
    if (!user) return;
    // Only load non-reto goals
    const { data: goal } = await supabase.from('challenge_goals').select('*').eq('user_id', user.id).neq('target_type', 'reto').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (goal) { const g = goal as any; setActiveGoal({ id: goal.id, target_name: g.target_name ?? 'Mi Meta', target_type: g.target_type ?? 'personalizada', target_amount: Number(goal.target_amount), deadline: goal.deadline, monthly_sales_needed: Number(g.monthly_sales_needed ?? 0) }); } else { setActiveGoal(null); }
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data: purchases } = await supabase.from('purchases').select('amount, cost_price').eq('user_id', user.id).gte('purchase_date', startOfMonth).lte('purchase_date', endOfMonth);
    if (purchases) setMonthlySales(purchases.reduce((s, p) => s + Number(p.amount), 0));
    const { data: allPurchases } = await supabase.from('purchases').select('amount, cost_price').eq('user_id', user.id);
    if (allPurchases) setTotalProfit(allPurchases.reduce((s, p) => { const cost = p.cost_price ? Number(p.cost_price) : Number(p.amount) * (1 - (pctGanancia / 100)); return s + (Number(p.amount) - cost); }, 0));
  };

  useEffect(() => { loadData(); }, [user]);

  const calc = (() => {
    if (!formAmount || formAmount <= 0 || !formMonths) return { ahorroMensual: 0, gananciaMensual: 0, ventaMensual: 0, ventaDiaria: 0 };
    const ahorroMensual = formAmount / formMonths; const gananciaMensual = ahorroMensual / (pctAhorro / 100); const ventaMensual = gananciaMensual / (pctGanancia / 100);
    return { ahorroMensual, gananciaMensual, ventaMensual, ventaDiaria: ventaMensual / 30 };
  })();

  const openDialog = (template: GoalTemplate) => { setSelectedTemplate(template); setFormName(template.name); setFormAmount(0); setFormMonths(3); setDialogOpen(true); };

  const saveGoal = async () => {
    if (!user || !selectedTemplate) return;
    if (!formAmount || formAmount <= 0) { toast({ title: 'Ingresa un monto válido', variant: 'destructive' }); return; }
    if (!formMonths || formMonths <= 0) { toast({ title: 'Ingresa un plazo válido (meses)', variant: 'destructive' }); return; }
    setSaving(true);
    const deadlineDate = new Date(); deadlineDate.setDate(deadlineDate.getDate() + formMonths * 30);
    const payload = { user_id: user.id, target_amount: formAmount, deadline: deadlineDate.toISOString().split('T')[0], target_name: formName || selectedTemplate.name, target_type: selectedTemplate.type, monthly_sales_needed: Math.round(calc.ventaMensual) };
    if (activeGoal) { await supabase.from('challenge_goals').update(payload).eq('id', activeGoal.id); } else { await supabase.from('challenge_goals').insert(payload); }
    await loadData(); setSaving(false); setDialogOpen(false); toast({ title: '¡Meta guardada! 🎯' });
  };

  const days = activeGoal ? daysRemaining(activeGoal.deadline) : 0;
  const monthlyTarget = activeGoal?.monthly_sales_needed ?? 0;
  const monthProgress = monthlyTarget > 0 ? progressPercentage(monthlySales, monthlyTarget) : 0;
  const remainingForMonth = Math.max(0, monthlyTarget - monthlySales);
  const dreamProgress = activeGoal ? progressPercentage(totalProfit, activeGoal.target_amount) : 0;

  return (
    <div>
      {/* HEADER */}
      <div style={{ background: HEADER_GRADIENT, padding: '48px 20px 24px' }}>
        <h1 className="text-white font-nunito" style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>Mis Metas 🎯</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Elige tu próximo sueño</p>
      </div>

      {/* BODY */}
      <div className="px-4 pt-5 pb-4 space-y-5" style={{ background: '#F5F5F7', minHeight: 'calc(100vh - 140px)' }}>
        {/* Sueños — only personal goals, no Reto */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#2D1B69' }}>✨ Mis sueños</h2>
          <div className="grid grid-cols-2 gap-3">
            {DREAM_TEMPLATES.map((t) => {
              const isActive = activeGoal?.target_type === t.type;
              return (
                <motion.button key={t.type} whileTap={{ scale: 0.97 }} onClick={() => openDialog(t)} className={`relative bg-white rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all border-2`} style={{ boxShadow: CARD_SHADOW, borderColor: isActive ? '#C06DD6' : 'transparent' }}>
                  <span className="text-3xl">{t.emoji}</span>
                  <span className="text-xs font-semibold leading-tight" style={{ color: '#2D1B69' }}>{t.name}</span>
                  {isActive && <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: '#C06DD6' }} />}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Active Goal */}
        <AnimatePresence>
          {activeGoal && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="rounded-[18px] p-5 space-y-4 text-white" style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="text-2xl">{getEmojiForType(activeGoal.target_type)}</span><h2 className="text-lg font-bold font-nunito">{activeGoal.target_name}</h2></div>
                <button onClick={() => { const tmpl = DREAM_TEMPLATES.find(t => t.type === activeGoal.target_type) ?? DREAM_TEMPLATES[4]; openDialog(tmpl); }} style={{ color: 'rgba(255,255,255,0.6)' }}><Pencil className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}><span>Progreso este mes</span><span>{monthProgress}%</span></div>
                <div className="w-full h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}><div className="h-full rounded-full" style={{ width: `${monthProgress}%`, background: 'linear-gradient(90deg, #C06DD6, #E8A5F0)' }} /></div>
                <p className="text-sm">{formatCurrency(monthlySales)} vendido de {formatCurrency(monthlyTarget)} necesario</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Te faltan {formatCurrency(remainingForMonth)} para llegar a tu meta de {formatCurrency(activeGoal.target_amount)}</p>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}><Calendar className="w-3.5 h-3.5" /><span>{days} días restantes del plazo</span></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dream Progress */}
        {activeGoal && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-5 space-y-3" style={{ boxShadow: CARD_SHADOW }}>
            <h3 className="text-sm font-semibold" style={{ color: '#2D1B69' }}>Progreso hacia tu sueño</h3>
            <div className="flex items-end gap-3">
              <span className="text-3xl">{getEmojiForType(activeGoal.target_type)}</span>
              <div className="flex-1"><div className="w-full h-3 rounded-full" style={{ background: '#F0E6F6' }}><div className="h-full rounded-full" style={{ width: `${dreamProgress}%`, background: 'linear-gradient(90deg, #C06DD6, #6B2FA0)' }} /></div></div>
              <span className="text-sm font-bold font-nunito" style={{ color: '#6B2FA0' }}>{dreamProgress}%</span>
            </div>
            <p className="text-sm" style={{ color: '#8a8a9a' }}>{formatCurrency(totalProfit)} ganado de {formatCurrency(activeGoal.target_amount)}</p>
            <p className="text-sm font-medium" style={{ color: '#2D1B69' }}>{getMotivationalPhrase(dreamProgress)}</p>
          </motion.div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-[92vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><span className="text-2xl">{selectedTemplate?.emoji}</span>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>Configura tu meta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label className="text-xs">Nombre de la meta</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Costo del sueño ($)</Label><Input type="number" value={formAmount || ''} onChange={(e) => setFormAmount(Number(e.target.value) || 0)} placeholder="$50,000" /></div>
              <div><Label className="text-xs">Plazo (meses)</Label><Input type="number" value={formMonths || ''} onChange={(e) => setFormMonths(Number(e.target.value) || 0)} /></div>
            </div>
            {formAmount > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-4 space-y-2 text-white" style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Para {formName} de {formatCurrency(formAmount)} en {formMonths} {formMonths === 1 ? 'mes' : 'meses'}:</p>
                <p className="text-sm">Ahorro mensual necesario: {formatCurrency(Math.round(calc.ahorroMensual))}</p>
                <p className="text-sm">Ganancia mensual necesaria: {formatCurrency(Math.round(calc.gananciaMensual))}</p>
                <p className="text-sm">Ventas mensuales necesarias: {formatCurrency(Math.round(calc.ventaMensual))}</p>
                <p className="text-base font-bold mt-1 font-nunito" style={{ color: '#E8A5F0' }}>= {formatCurrency(Math.round(calc.ventaDiaria))} por día 💪</p>
                <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Usando tu ganancia del {pctGanancia}% y ahorro del {pctAhorro}% · Ajusta en Mi Cuenta</p>
              </motion.div>
            )}
            <Button onClick={saveGoal} disabled={saving || formAmount <= 0} className="w-full font-semibold h-12 rounded-xl text-white" style={{ background: '#6B2FA0' }}>
              {saving ? 'Guardando...' : '¡Comenzar mi meta! 🚀'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
