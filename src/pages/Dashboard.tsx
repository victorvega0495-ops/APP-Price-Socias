import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, Trophy, AlertTriangle, Clock, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

import { formatCurrency, daysRemaining, progressPercentage } from '@/lib/format';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface DashboardData {
  totalSales: number;
  targetAmount: number;
  deadline: string;
  overdueCredits: number;
  inactiveClients: number;
}

const quickLinks = [
  { to: '/finanzas', icon: DollarSign, label: 'Finanzas', color: 'bg-navy' },
  { to: '/clientas', icon: Users, label: 'Mis Clientas', color: 'bg-navy-light' },
  { to: '/mi-reto', icon: Trophy, label: 'Mi Reto', color: 'bg-gold' },
];

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData>({
    totalSales: 0, targetAmount: 10000, deadline: '', overdueCredits: 0, inactiveClients: 0,
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [monthTotalSales, setMonthTotalSales] = useState(0);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState(0);

  const [totalRealMes, setTotalRealMes] = useState(0);
  const [margenPromedio, setMargenPromedio] = useState(0.30);
  const [montoPendienteCredito, setMontoPendienteCredito] = useState(0);
  const [lastPurchaseDaysAgo, setLastPurchaseDaysAgo] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Challenge goal
      const { data: goal } = await supabase
        .from('challenge_goals')
        .select('target_amount, deadline')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // All-time sales for reto
      const { data: finances } = await supabase
        .from('weekly_finances')
        .select('total_sales')
        .eq('user_id', user.id);
      const totalSales = finances?.reduce((sum, f) => sum + Number(f.total_sales), 0) || 0;

      // Monthly sales from weekly_finances
      const { data: monthFinances } = await supabase
        .from('weekly_finances')
        .select('total_sales')
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('month', month);
      const mSales = monthFinances?.reduce((sum, f) => sum + Number(f.total_sales), 0) || 0;
      setMonthTotalSales(mSales);

      // Monthly goal
      const { data: goalData } = await supabase
        .from('monthly_goals')
        .select('target_income')
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (goalData) {
        setMonthlyTarget(Number(goalData.target_income));
        setGoalInput(Number(goalData.target_income));
      }

      // Purchases this month — with cost_price for real margin
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('amount, is_credit, credit_paid, purchase_date, cost_price')
        .eq('user_id', user.id)
        .gte('purchase_date', monthStart);
      const realMes = purchasesData?.reduce((s, p) => s + Number(p.amount), 0) || 0;
      setTotalRealMes(realMes);

      // Calculate real average margin
      const ventasConCosto = purchasesData?.filter(p => p.cost_price && Number(p.cost_price) > 0) || [];
      const avgMargen = ventasConCosto.length > 0
        ? ventasConCosto.reduce((s, p) => s + (Number(p.amount) - Number(p.cost_price)) / Number(p.amount), 0) / ventasConCosto.length
        : 0.30;
      setMargenPromedio(avgMargen);

      // Days since last purchase
      if (purchasesData && purchasesData.length > 0) {
        const sorted = [...purchasesData].sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
        const lastDate = new Date(sorted[0].purchase_date + 'T12:00:00');
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        setLastPurchaseDaysAgo(diffDays);
      } else {
        setLastPurchaseDaysAgo(999);
      }

      // Pending credit amount
      const { data: pendingCredits } = await supabase
        .from('purchases')
        .select('amount, credit_paid_amount')
        .eq('user_id', user.id)
        .eq('is_credit', true)
        .eq('credit_paid', false);
      const pendingTotal = pendingCredits?.reduce((s, p) => s + Number(p.amount) - Number(p.credit_paid_amount || 0), 0) || 0;
      setMontoPendienteCredito(pendingTotal);

      // Overdue credits (>15 days)
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const { count: overdueCredits } = await supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_credit', true)
        .eq('credit_paid', false)
        .lt('credit_due_date', fifteenDaysAgo.toISOString().split('T')[0]);

      // Inactive clients (>30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: inactiveClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .lt('last_purchase_date', thirtyDaysAgo.toISOString().split('T')[0]);

      setData({
        totalSales,
        targetAmount: goal ? Number(goal.target_amount) : 10000,
        deadline: goal?.deadline || '',
        overdueCredits: overdueCredits || 0,
        inactiveClients: inactiveClients || 0,
      });
    };
    load();
  }, [user]);

  const saveMonthlyGoal = async () => {
    if (!user || goalInput <= 0) return;
    await supabase
      .from('monthly_goals')
      .upsert({ user_id: user.id, year, month, target_income: goalInput }, { onConflict: 'user_id,year,month' });
    setMonthlyTarget(goalInput);
    setGoalDialogOpen(false);
    toast({ title: 'Meta guardada ✅' });
  };

  const progress = progressPercentage(data.totalSales, data.targetAmount);
  const days = data.deadline ? daysRemaining(data.deadline) : 0;
  const firstName = profile?.name?.split(' ')[0] || 'Socia';

  const metaVentas = monthlyTarget > 0 ? monthlyTarget / margenPromedio : 0;
  const goalProgress = metaVentas > 0 ? Math.min(100, (totalRealMes / metaVentas) * 100) : 0;
  const gananciaAcumulada = totalRealMes * margenPromedio;

  const daysLeftInMonth = (() => {
    const lastDay = new Date(year, month, 0).getDate();
    const today = now.getDate();
    return Math.max(1, lastDay - today);
  })();
  const dailyNeeded = metaVentas > 0 ? Math.max(0, (metaVentas - totalRealMes) / daysLeftInMonth) : 0;

  // Smart notes (max 2)
  const smartNotes: { text: string; type: 'warn' | 'success' }[] = [];
  if (data.overdueCredits > 0 && montoPendienteCredito > 0) {
    const extraPct = metaVentas > 0 ? Math.round((montoPendienteCredito / metaVentas) * 100) : 0;
    smartNotes.push({
      text: `💰 Tienes ${formatCurrency(montoPendienteCredito)} sin cobrar. ¡Recupéralos y ya llevas ${extraPct}% más!`,
      type: 'warn',
    });
  }
  if (lastPurchaseDaysAgo >= 3 && smartNotes.length < 2) {
    smartNotes.push({
      text: `⏰ Llevas ${lastPurchaseDaysAgo}+ días sin registrar ventas. ¿Ya vendiste algo? Tócalo en Vender 👇`,
      type: 'warn',
    });
  }
  if (smartNotes.length === 0 && goalProgress >= 80 && totalRealMes > 0) {
    smartNotes.push({
      text: '🚀 ¡Vas muy bien! A este ritmo llegas antes de fin de mes.',
      type: 'success',
    });
  }

  const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">
          Hola {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Tu negocio te está esperando</p>
      </motion.div>

      {/* Mi Negocio — Unified Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl shadow-elevated overflow-hidden"
      >
        {/* UPPER SECTION — Monthly Business Dashboard */}
        <div className="bg-gradient-navy p-5">
          <p className="text-primary-foreground/70 text-xs font-medium uppercase tracking-wider mb-1">
            MI NEGOCIO — {monthNames[month]} {year}
          </p>

          {/* Total vendido este mes */}
          <p className="text-3xl font-bold text-primary-foreground mt-1">
            {formatCurrency(totalRealMes)}
          </p>
          <p className="text-xs text-primary-foreground/50 mt-0.5">vendido este mes</p>

          {/* Progress bar toward monthly sales goal */}
          {monthlyTarget > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-primary-foreground/60 mb-1">
                <span>{Math.round(goalProgress)}%</span>
                <span>Meta: {formatCurrency(metaVentas)} en ventas</span>
              </div>
              <Progress value={goalProgress} className="h-2.5 bg-primary-foreground/15 [&>div]:bg-gradient-gold shadow-gold" />
            </div>
          )}

          {/* Two stat-boxes */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] text-primary-foreground/50 uppercase tracking-wider">Ganancia acumulada</p>
              <p className="text-lg font-bold text-gold">{formatCurrency(gananciaAcumulada)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] text-primary-foreground/50 uppercase tracking-wider">Meta de ganancia</p>
              {monthlyTarget > 0 ? (
                <div className="flex items-center gap-1">
                  <p className="text-lg font-bold text-primary-foreground">{formatCurrency(monthlyTarget)}</p>
                  <button
                    onClick={() => { setGoalInput(monthlyTarget); setGoalDialogOpen(true); }}
                    className="text-primary-foreground/50 hover:text-primary-foreground/80"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setGoalDialogOpen(true)}
                  className="text-sm text-gold font-semibold hover:underline mt-0.5"
                >
                  Configura tu meta →
                </button>
              )}
            </div>
          </div>

          {/* Daily needed */}
          {monthlyTarget > 0 && totalRealMes < metaVentas && (
            <p className="text-xs text-primary-foreground/70 mt-3">
              Necesitas vender <span className="font-semibold text-gold">{formatCurrency(dailyNeeded)}</span>/día para llegar
            </p>
          )}
        </div>

        {/* LOWER SECTION — Reto (only if challenge_goal exists) */}
        {data.deadline && (
          <div className="bg-navy-light/90 p-4 border-t border-primary-foreground/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-gold/20 text-gold text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                🏆 Reto 0 a 10,000
              </span>
            </div>
            <Progress value={progress} className="h-2 bg-primary-foreground/15 [&>div]:bg-gradient-gold mb-2" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-primary-foreground/80">
                <span className="font-semibold text-primary-foreground">{formatCurrency(data.totalSales)}</span> de {formatCurrency(data.targetAmount)} en ganancia
              </p>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gold" />
                <span className="text-xs text-primary-foreground/70">{days} días</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Smart Notes */}
      {smartNotes.length > 0 && (
        <div className="space-y-2">
          {smartNotes.map((note, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className={`rounded-xl p-3 text-sm ${
                note.type === 'warn' ? 'bg-gold/10 text-foreground' : 'bg-green-500/10 text-foreground'
              }`}
            >
              {note.text}
            </motion.div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {(data.overdueCredits > 0 || data.inactiveClients > 0) && (
        <div className="space-y-2">
          {data.overdueCredits > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 bg-destructive/10 rounded-xl p-3"
            >
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-foreground">
                <strong>{data.overdueCredits}</strong> cuenta{data.overdueCredits > 1 ? 's' : ''} por cobrar vencida{data.overdueCredits > 1 ? 's' : ''}
              </p>
            </motion.div>
          )}
          {data.inactiveClients > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="flex items-center gap-3 bg-gold/10 rounded-xl p-3"
            >
              <Users className="w-5 h-5 text-gold-dark flex-shrink-0" />
              <p className="text-sm text-foreground">
                <strong>{data.inactiveClients}</strong> clienta{data.inactiveClients > 1 ? 's' : ''} sin comprar en +30 días
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-3">
        {quickLinks.map((link, i) => (
          <motion.div
            key={link.to}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
          >
            <Link
              to={link.to}
              className="flex flex-col items-center justify-center gap-2 bg-card rounded-2xl p-5 shadow-card hover:shadow-elevated transition-shadow"
            >
              <div className={`w-11 h-11 rounded-xl ${link.color} flex items-center justify-center`}>
                <link.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">{link.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Goal Dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Meta de {monthNames[month]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>¿Cuánto quieres ganar este mes?</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  value={goalInput || ''}
                  onChange={(e) => setGoalInput(Number(e.target.value) || 0)}
                  placeholder="10,000"
                  className="pl-7"
                />
              </div>
            </div>
            <Button onClick={saveMonthlyGoal} className="w-full bg-navy text-primary-foreground">
              Guardar meta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
