import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, daysRemaining, progressPercentage } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Target, Calendar, Pencil } from 'lucide-react';

const GOAL_TEMPLATES = [
  { type: 'reto', emoji: '🏆', name: 'Reto 0 a 10,000', fixed: true, fixedAmount: 10000, fixedMonths: 1 },
  { type: 'coche', emoji: '🚗', name: 'Mi coche', fixed: false },
  { type: 'casa', emoji: '🏠', name: 'Mi casa / renta', fixed: false },
  { type: 'vacaciones', emoji: '✈️', name: 'Mis vacaciones', fixed: false },
  { type: 'capricho', emoji: '📱', name: 'Un capricho', fixed: false },
  { type: 'personalizada', emoji: '✏️', name: 'Meta personalizada', fixed: false },
] as const;

type GoalTemplate = typeof GOAL_TEMPLATES[number];

interface ActiveGoal {
  id: string;
  target_name: string;
  target_type: string;
  target_amount: number;
  deadline: string;
  monthly_sales_needed: number;
}

function getMotivationalPhrase(pct: number) {
  if (pct >= 100) return '¡META CUMPLIDA! 🎉🏆';
  if (pct >= 76) return '¡Estás a nada de lograrlo! 🚀';
  if (pct >= 51) return '¡Casi lo tienes! Sigue así 🔥';
  if (pct >= 26) return '¡Ya vas a la mitad del camino! 🌟';
  return '¡Cada venta te acerca más! 💪';
}

function getEmojiForType(type: string) {
  return GOAL_TEMPLATES.find(t => t.type === type)?.emoji ?? '🎯';
}

export default function Challenge() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeGoal, setActiveGoal] = useState<ActiveGoal | null>(null);
  const [monthlySales, setMonthlySales] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formMonths, setFormMonths] = useState(3);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!user) return;

    // Load active goal
    const { data: goal } = await supabase
      .from('challenge_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (goal) {
      setActiveGoal({
        id: goal.id,
        target_name: (goal as any).target_name ?? 'Mi Meta',
        target_type: (goal as any).target_type ?? 'personalizada',
        target_amount: Number(goal.target_amount),
        deadline: goal.deadline,
        monthly_sales_needed: Number((goal as any).monthly_sales_needed ?? 0),
      });
    } else {
      setActiveGoal(null);
    }

    // Current month sales from purchases
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: purchases } = await supabase
      .from('purchases')
      .select('amount, cost_price')
      .eq('user_id', user.id)
      .gte('purchase_date', startOfMonth)
      .lte('purchase_date', endOfMonth);

    if (purchases) {
      const sales = purchases.reduce((s, p) => s + Number(p.amount), 0);
      setMonthlySales(sales);
    }

    // Total profit (all time) — sum of (amount - cost_price) where cost_price exists, else amount * 0.30
    const { data: allPurchases } = await supabase
      .from('purchases')
      .select('amount, cost_price')
      .eq('user_id', user.id);

    if (allPurchases) {
      const profit = allPurchases.reduce((s, p) => {
        const cost = p.cost_price ? Number(p.cost_price) : Number(p.amount) * 0.70;
        return s + (Number(p.amount) - cost);
      }, 0);
      setTotalProfit(profit);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  // Dialog calculations
  const profitNeeded = formAmount / (formMonths || 1);
  const salesNeeded = profitNeeded / 0.30;
  const dailySales = salesNeeded / 30;

  const openDialog = (template: GoalTemplate) => {
    setSelectedTemplate(template);
    setFormName(template.name);
    if (template.fixed) {
      setFormAmount(template.fixedAmount!);
      setFormMonths(template.fixedMonths!);
    } else {
      setFormAmount(0);
      setFormMonths(3);
    }
    setDialogOpen(true);
  };

  const saveGoal = async () => {
    if (!user || !selectedTemplate) return;
    if (!formAmount || formAmount <= 0) {
      toast({ title: 'Ingresa un monto válido', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + formMonths * 30);
    const deadlineStr = deadlineDate.toISOString().split('T')[0];
    const monthlySalesCalc = (formAmount / formMonths) / 0.30;

    const payload = {
      user_id: user.id,
      target_amount: formAmount,
      deadline: deadlineStr,
      target_name: formName || selectedTemplate.name,
      target_type: selectedTemplate.type,
      monthly_sales_needed: Math.round(monthlySalesCalc),
    };

    if (activeGoal) {
      await supabase.from('challenge_goals').update(payload).eq('id', activeGoal.id);
    } else {
      await supabase.from('challenge_goals').insert(payload);
    }

    await loadData();
    setSaving(false);
    setDialogOpen(false);
    toast({ title: '¡Meta guardada! 🎯' });
  };

  // Active goal metrics
  const days = activeGoal ? daysRemaining(activeGoal.deadline) : 0;
  const monthlyTarget = activeGoal?.monthly_sales_needed ?? 0;
  const monthProgress = monthlyTarget > 0 ? progressPercentage(monthlySales, monthlyTarget) : 0;
  const remainingForMonth = Math.max(0, monthlyTarget - monthlySales);
  const dreamProgress = activeGoal ? progressPercentage(totalProfit, activeGoal.target_amount) : 0;

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Target className="w-6 h-6 text-gold" />
        <h1 className="text-xl font-bold">Mis Metas</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-3">¿Para qué estás vendiendo?</p>

      {/* Goal Grid */}
      <div className="grid grid-cols-2 gap-3">
        {GOAL_TEMPLATES.map((t) => {
          const isActive = activeGoal?.target_type === t.type;
          return (
            <motion.button
              key={t.type}
              whileTap={{ scale: 0.97 }}
              onClick={() => openDialog(t)}
              className={`relative bg-card rounded-2xl p-4 shadow-card flex flex-col items-center gap-2 text-center transition-all border-2 ${
                isActive ? 'border-gold' : 'border-transparent'
              }`}
            >
              <span className="text-3xl">{t.emoji}</span>
              <span className="text-xs font-semibold text-foreground leading-tight">{t.name}</span>
              {isActive && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Active Goal Card */}
      <AnimatePresence>
        {activeGoal && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-gradient-navy rounded-2xl p-5 shadow-elevated space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getEmojiForType(activeGoal.target_type)}</span>
                <h2 className="text-lg font-bold text-primary-foreground">{activeGoal.target_name}</h2>
              </div>
              <button
                onClick={() => {
                  const tmpl = GOAL_TEMPLATES.find(t => t.type === activeGoal.target_type) ?? GOAL_TEMPLATES[5];
                  openDialog(tmpl);
                }}
                className="text-primary-foreground/60 hover:text-primary-foreground"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>

            {/* Monthly progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-primary-foreground/70">
                <span>Progreso este mes</span>
                <span>{monthProgress}%</span>
              </div>
              <Progress value={monthProgress} className="h-3 bg-primary-foreground/10 [&>div]:bg-gold" />
              <p className="text-sm text-primary-foreground">
                {formatCurrency(monthlySales)} vendido de {formatCurrency(monthlyTarget)} necesario
              </p>
              <p className="text-xs text-primary-foreground/60">
                Te faltan {formatCurrency(remainingForMonth)} para llegar a tu meta de {formatCurrency(activeGoal.target_amount)}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-primary-foreground/60">
              <Calendar className="w-3.5 h-3.5" />
              <span>{days} días restantes del plazo</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dream Progress */}
      {activeGoal && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-5 shadow-card space-y-3"
        >
          <h3 className="text-sm font-semibold">Progreso hacia tu sueño</h3>
          <div className="flex items-end gap-3">
            <span className="text-3xl">{getEmojiForType(activeGoal.target_type)}</span>
            <div className="flex-1">
              <Progress value={dreamProgress} className="h-3 [&>div]:bg-gradient-gold" />
            </div>
            <span className="text-sm font-bold text-navy">{dreamProgress}%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(totalProfit)} ganado de {formatCurrency(activeGoal.target_amount)}
          </p>
          <p className="text-sm font-medium text-foreground">
            {getMotivationalPhrase(dreamProgress)}
          </p>
        </motion.div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-[92vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedTemplate?.emoji}</span>
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>Configura tu meta y ve cuánto necesitas vender</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Nombre de la meta</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={selectedTemplate?.type === 'reto'}
              />
            </div>
            <div>
              <Label className="text-xs">Costo total del sueño ($)</Label>
              <Input
                type="number"
                value={formAmount || ''}
                onChange={(e) => setFormAmount(Number(e.target.value) || 0)}
                disabled={selectedTemplate?.fixed}
                placeholder="$50,000"
              />
            </div>
            <div>
              <Label className="text-xs">Plazo en meses</Label>
              <Input
                type="number"
                value={formMonths || ''}
                onChange={(e) => setFormMonths(Number(e.target.value) || 1)}
                disabled={selectedTemplate?.fixed}
                min={1}
              />
            </div>

            {formAmount > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-secondary rounded-xl p-4 space-y-1"
              >
                <p className="text-xs text-muted-foreground">Necesitas ganar</p>
                <p className="text-lg font-bold text-navy">{formatCurrency(Math.round(profitNeeded))} al mes</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Eso equivale a vender <span className="font-semibold text-foreground">{formatCurrency(Math.round(salesNeeded))}</span> al mes
                </p>
                <p className="text-xs text-muted-foreground">
                  O sea <span className="font-semibold text-foreground">{formatCurrency(Math.round(dailySales))}</span> por día
                </p>
              </motion.div>
            )}

            <Button
              onClick={saveGoal}
              disabled={saving || formAmount <= 0}
              className="w-full bg-gradient-gold text-accent-foreground font-semibold h-12 rounded-xl"
            >
              {saving ? 'Guardando...' : '¡Comenzar mi meta! 🚀'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
