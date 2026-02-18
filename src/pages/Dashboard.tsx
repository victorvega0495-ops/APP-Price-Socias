import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Users, Trophy, AlertTriangle, Clock, Target, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ProgressRing from '@/components/ProgressRing';
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

  // Monthly goal state
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [monthTotalSales, setMonthTotalSales] = useState(0);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState(0);

  // Calibration state
  const [precioSocia, setPrecioSocia] = useState(() => {
    const saved = localStorage.getItem('socia_precio');
    return saved ? Number(saved) : 350;
  });
  const [pctGanancia, setPctGanancia] = useState(() => {
    const saved = localStorage.getItem('socia_pct');
    return saved ? Number(saved) : 54;
  });
  const [showCalibrar, setShowCalibrar] = useState(false);

  // Smart reto state
  const [totalRealMes, setTotalRealMes] = useState(0);
  const [montoPendienteCredito, setMontoPendienteCredito] = useState(0);
  const [lastPurchaseDaysAgo, setLastPurchaseDaysAgo] = useState(0);

  const handlePrecioChange = (val: number) => {
    setPrecioSocia(val);
    localStorage.setItem('socia_precio', String(val));
  };
  const handlePctChange = (val: number) => {
    setPctGanancia(val);
    localStorage.setItem('socia_pct', String(val));
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get challenge goal
      const { data: goal } = await supabase
        .from('challenge_goals')
        .select('target_amount, deadline')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get total sales (all time for reto)
      const { data: finances } = await supabase
        .from('weekly_finances')
        .select('total_sales')
        .eq('user_id', user.id);
      const totalSales = finances?.reduce((sum, f) => sum + Number(f.total_sales), 0) || 0;

      // Monthly sales
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

      // Purchases this month (for smart reto)
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('amount, is_credit, credit_paid, purchase_date')
        .eq('user_id', user.id)
        .gte('purchase_date', monthStart);
      const realMes = purchasesData?.reduce((s, p) => s + Number(p.amount), 0) || 0;
      setTotalRealMes(realMes);

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

  const goalProgress = monthlyTarget > 0 ? Math.min(100, (monthTotalSales / monthlyTarget) * 100) : 0;
  const daysLeftInMonth = (() => {
    const lastDay = new Date(year, month, 0).getDate();
    const today = now.getDate();
    return Math.max(1, lastDay - today);
  })();
  const dailyNeeded = monthlyTarget > 0 ? Math.max(0, (monthlyTarget - monthTotalSales) / daysLeftInMonth) : 0;

  // Smart reto calculations
  const precioCliente = precioSocia * (1 + pctGanancia / 100);
  const gananciaPorVenta = precioCliente * 0.30;
  const paresVendidos = totalRealMes > 0 ? Math.round(totalRealMes / precioCliente) : 0;
  const diasTranscurridos = Math.max(1, now.getDate());
  const ritmoActual = paresVendidos / diasTranscurridos;
  const metaVenta = data.targetAmount / 0.30;
  const retoProgress = progressPercentage(totalRealMes, metaVenta);
  const paresNecesariosDia = gananciaPorVenta > 0
    ? Math.ceil((metaVenta - totalRealMes) / gananciaPorVenta / Math.max(1, daysLeftInMonth))
    : 0;

  // Smart notes (max 2)
  const smartNotes: { text: string; type: 'warn' | 'success' }[] = [];
  if (data.overdueCredits > 0 && montoPendienteCredito > 0) {
    const extraPct = metaVenta > 0 ? Math.round((montoPendienteCredito / metaVenta) * 100) : 0;
    smartNotes.push({
      text: `💰 Tienes ${formatCurrency(montoPendienteCredito)} sin cobrar. ¡Recupéralos y ya llevas ${extraPct}% más del reto!`,
      type: 'warn',
    });
  }
  if (lastPurchaseDaysAgo >= 3 && smartNotes.length < 2) {
    smartNotes.push({
      text: `⏰ Llevas ${lastPurchaseDaysAgo}+ días sin registrar ventas. ¿Ya vendiste algo? Tócalo en Vender 👇`,
      type: 'warn',
    });
  }
  if (smartNotes.length === 0 && ritmoActual >= paresNecesariosDia * 1.1 && paresVendidos > 0) {
    smartNotes.push({
      text: '🚀 ¡Vas muy bien! A este ritmo llegas antes de tu fecha límite.',
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

      {/* Progress Card - Reto */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-navy rounded-2xl p-5 shadow-elevated"
      >
        <div className="flex items-start justify-between mb-1">
          <p className="text-primary-foreground/70 text-xs font-medium uppercase tracking-wider">Reto 0 a 10,000</p>
          <button
            onClick={() => setShowCalibrar(!showCalibrar)}
            className="text-primary-foreground/50 hover:text-primary-foreground/80 text-[10px] flex items-center gap-0.5"
          >
            <Settings className="w-3 h-3" /> Calibrar
          </button>
        </div>

        {/* Calibration panel */}
        <AnimatePresence>
          {showCalibrar && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-primary-foreground/10 rounded-xl p-3 mb-3 space-y-2">
                <div>
                  <label className="text-[10px] text-primary-foreground/70">Precio promedio que pagas a Price ($)</label>
                  <Input
                    type="number"
                    value={precioSocia || ''}
                    onChange={(e) => handlePrecioChange(Number(e.target.value) || 0)}
                    className="h-7 text-xs bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-primary-foreground/70">% que le subes a tus clientes</label>
                  <Input
                    type="number"
                    value={pctGanancia || ''}
                    onChange={(e) => handlePctChange(Number(e.target.value) || 0)}
                    className="h-7 text-xs bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground mt-0.5"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowCalibrar(false)}
                  className="w-full h-7 text-xs bg-gold text-navy font-semibold"
                >
                  Listo
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-3xl font-bold text-primary-foreground mt-1">
              {formatCurrency(data.totalSales)}
            </p>
            <p className="text-sm text-primary-foreground/60 mt-0.5">
              de {formatCurrency(data.targetAmount)}
            </p>
            <p className="text-xs text-gold mt-1">~{paresVendidos} pares vendidos</p>
            {data.deadline && (
              <div className="flex items-center gap-1.5 mt-2">
                <Clock className="w-3.5 h-3.5 text-gold" />
                <span className="text-xs text-primary-foreground/80">
                  {days} días restantes
                </span>
              </div>
            )}
          </div>
          <ProgressRing percentage={retoProgress} size={100} strokeWidth={8} />
        </div>

        {/* Pares/día needed */}
        {paresNecesariosDia > 0 && totalRealMes < metaVenta && (
          <p className="text-xs text-primary-foreground/70 mt-2">
            Necesitas <span className="font-semibold text-gold">{paresNecesariosDia} pares/día</span> para llegar
          </p>
        )}

        {/* Ritmo indicator */}
        {paresVendidos > 0 && (
          <div className={`mt-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
            ritmoActual >= paresNecesariosDia
              ? 'bg-green-500/20 text-green-200'
              : 'bg-yellow-500/20 text-yellow-200'
          }`}>
            {ritmoActual >= paresNecesariosDia
              ? `✅ Vas a buen ritmo (${ritmoActual.toFixed(1)}/día)`
              : `⚡ Ritmo actual: ${ritmoActual.toFixed(1)}/día`
            }
          </div>
        )}

        {!data.deadline && (
          <Link
            to="/mi-reto"
            className="mt-3 block text-center text-sm text-gold font-semibold hover:underline"
          >
            Configura tu meta del Reto →
          </Link>
        )}
      </motion.div>

      {/* Smart Notes */}
      {smartNotes.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {smartNotes.slice(0, 2).map((note, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl p-3 text-xs ${
                  note.type === 'warn'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                }`}
              >
                {note.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Monthly Goal Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-2xl p-5 shadow-card"
      >
        {/* ... keep existing code (monthly goal card content) */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-navy" />
            <h3 className="text-sm font-semibold text-foreground">Meta del mes — {monthNames[month]}</h3>
          </div>
        </div>

        {monthlyTarget > 0 ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Progreso</span>
                <span className="font-semibold">{Math.round(goalProgress)}%</span>
              </div>
              <Progress value={goalProgress} className="h-3 bg-muted [&>div]:bg-gradient-gold" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatCurrency(monthTotalSales)}</span>
                <span>{formatCurrency(monthlyTarget)}</span>
              </div>
            </div>

            {monthTotalSales < monthlyTarget && (
              <p className="text-xs text-muted-foreground text-center">
                Necesitas vender <span className="font-semibold text-navy">{formatCurrency(dailyNeeded)}</span> por día para llegar
              </p>
            )}
            {monthTotalSales >= monthlyTarget && (
              <p className="text-xs text-center font-semibold text-accent-foreground">🎉 ¡Meta alcanzada!</p>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setGoalInput(monthlyTarget); setGoalDialogOpen(true); }}
              className="w-full text-xs text-navy h-7"
            >
              Editar meta
            </Button>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground mb-3">Configura cuánto quieres vender este mes</p>
            <Button
              onClick={() => setGoalDialogOpen(true)}
              className="bg-navy text-primary-foreground"
              size="sm"
            >
              <Target className="w-3.5 h-3.5 mr-1" /> Configurar meta
            </Button>
          </div>
        )}
      </motion.div>

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
              <Label>¿Cuánto quieres vender este mes?</Label>
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
