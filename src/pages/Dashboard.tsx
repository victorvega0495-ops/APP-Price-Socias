import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Users, Trophy, AlertTriangle, Clock, Settings, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

import { formatCurrency, daysRemaining, progressPercentage } from '@/lib/format';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ChallengeGoal {
  id: string;
  target_amount: number;
  deadline: string;
  monthly_sales_needed: number | null;
  target_name: string | null;
  target_type: string | null;
}

interface DashboardData {
  totalSales: number;
  targetAmount: number;
  deadline: string;
  overdueCredits: number;
  inactiveClients: number;
}

const quickLinks = [
  { to: '/finanzas', icon: DollarSign, label: 'Finanzas' },
  { to: '/clientas', icon: Users, label: 'Mis Clientas' },
  { to: '/mis-metas', icon: Trophy, label: 'Metas' },
  { to: '/tips', icon: Lightbulb, label: 'Tips' },
];

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({
    totalSales: 0, targetAmount: 10000, deadline: '', overdueCredits: 0, inactiveClients: 0,
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [monthTotalSales, setMonthTotalSales] = useState(0);
  const [activeGoals, setActiveGoals] = useState<ChallengeGoal[]>([]);
  const [showOtherGoals, setShowOtherGoals] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState(0);

  const pctGanancia = (profile?.pct_ganancia ?? 30) / 100;

  const [totalRealMes, setTotalRealMes] = useState(0);
  const [margenPromedio, setMargenPromedio] = useState(pctGanancia);
  const [montoPendienteCredito, setMontoPendienteCredito] = useState(0);
  const [lastPurchaseDaysAgo, setLastPurchaseDaysAgo] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const todayStr = now.toISOString().split('T')[0];
      const { data: goalsData } = await supabase
        .from('challenge_goals')
        .select('id, target_amount, deadline, monthly_sales_needed, target_name, target_type')
        .eq('user_id', user.id)
        .gte('deadline', todayStr)
        .order('created_at', { ascending: false });
      const goals: ChallengeGoal[] = (goalsData || []).map(g => ({
        ...g,
        target_amount: Number(g.target_amount),
        monthly_sales_needed: g.monthly_sales_needed ? Number(g.monthly_sales_needed) : null,
      }));
      setActiveGoals(goals);

      const goal = goals.length > 0 ? goals[0] : null;

      const { data: finances } = await supabase
        .from('weekly_finances')
        .select('total_sales')
        .eq('user_id', user.id);
      const totalSales = finances?.reduce((sum, f) => sum + Number(f.total_sales), 0) || 0;

      const { data: monthFinances } = await supabase
        .from('weekly_finances')
        .select('total_sales')
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('month', month);
      const mSales = monthFinances?.reduce((sum, f) => sum + Number(f.total_sales), 0) || 0;
      setMonthTotalSales(mSales);

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

      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('amount, is_credit, credit_paid, purchase_date, cost_price')
        .eq('user_id', user.id)
        .gte('purchase_date', monthStart);
      const realMes = purchasesData?.reduce((s, p) => s + Number(p.amount), 0) || 0;
      setTotalRealMes(realMes);

      const ventasConCosto = purchasesData?.filter(p => p.cost_price && Number(p.cost_price) > 0) || [];
      const avgMargen = ventasConCosto.length > 0
        ? ventasConCosto.reduce((s, p) => s + (Number(p.amount) - Number(p.cost_price)) / Number(p.amount), 0) / ventasConCosto.length
        : pctGanancia;
      setMargenPromedio(avgMargen);

      if (purchasesData && purchasesData.length > 0) {
        const sorted = [...purchasesData].sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
        const lastDate = new Date(sorted[0].purchase_date + 'T12:00:00');
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        setLastPurchaseDaysAgo(diffDays);
      } else {
        setLastPurchaseDaysAgo(999);
      }

      const { data: pendingCredits } = await supabase
        .from('purchases')
        .select('amount, credit_paid_amount')
        .eq('user_id', user.id)
        .eq('is_credit', true)
        .eq('credit_paid', false);
      const pendingTotal = pendingCredits?.reduce((s, p) => s + Number(p.amount) - Number(p.credit_paid_amount || 0), 0) || 0;
      setMontoPendienteCredito(pendingTotal);

      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const { count: overdueCredits } = await supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_credit', true)
        .eq('credit_paid', false)
        .lt('credit_due_date', fifteenDaysAgo.toISOString().split('T')[0]);

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

  const goalsWithProgress = activeGoals.map(g => {
    const pct = g.monthly_sales_needed && g.monthly_sales_needed > 0
      ? Math.min(100, (totalRealMes / g.monthly_sales_needed) * 100)
      : progressPercentage(data.totalSales, g.target_amount);
    const daysLeft = daysRemaining(g.deadline);
    return { ...g, pct, daysLeft };
  }).sort((a, b) => b.pct - a.pct);

  const primaryGoal = goalsWithProgress.length > 0 ? goalsWithProgress[0] : null;
  const otherGoals = goalsWithProgress.slice(1);

  const goalEmoji = (type: string | null) => {
    switch (type) {
      case 'coche': return '🚗';
      case 'casa': return '🏠';
      case 'vacaciones': return '✈️';
      case 'capricho': return '🎁';
      default: return '🏆';
    }
  };

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
  const monthAbbr = monthNames[month]?.substring(0, 3).toUpperCase() || '';

  // Avatar initials
  const initials = (profile?.name || 'S')
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="pb-4">
      {/* ===== PURPLE GRADIENT HEADER ===== */}
      <div
        className="px-5 pt-5 pb-6 space-y-4"
        style={{ background: 'linear-gradient(145deg, #2D1B69 0%, #6B2FA0 45%, #C06DD6 100%)' }}
      >
        {/* Profile row */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/perfil')} className="shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={firstName}
                className="w-14 h-14 rounded-full object-cover"
                style={{ border: '3px solid rgba(255,255,255,0.3)' }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #C06DD6, #9B59B6)',
                  border: '3px solid rgba(255,255,255,0.3)',
                }}
              >
                <span className="text-white font-bold text-lg" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  {initials}
                </span>
              </div>
            )}
          </button>
          <div>
            <h1 className="text-[22px] font-bold text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Hola, {firstName} 👋
            </h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Tu negocio te está esperando
            </p>
          </div>
        </div>

        {/* Glassmorphism business card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4"
          style={{
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
          }}
        >
          <p style={{ fontSize: '9px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em' }}>
            MI NEGOCIO — {monthAbbr} {year}
          </p>
          <p className="text-white mt-1" style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '36px', lineHeight: 1.1 }}>
            {formatCurrency(totalRealMes)}
          </p>

          {/* Progress bar */}
          {primaryGoal && primaryGoal.monthly_sales_needed && primaryGoal.monthly_sales_needed > 0 ? (
            <div className="mt-3">
              <div className="flex justify-between mb-1" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                <span>{Math.round(Math.min(100, (totalRealMes / primaryGoal.monthly_sales_needed) * 100))}%</span>
                <span>Meta: {formatCurrency(primaryGoal.monthly_sales_needed)}</span>
              </div>
              <div className="w-full h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (totalRealMes / primaryGoal.monthly_sales_needed) * 100)}%`,
                    background: 'linear-gradient(90deg, #C06DD6, #E8A5F0)',
                    boxShadow: '0 0 12px rgba(192,109,214,0.5)',
                  }}
                />
              </div>
            </div>
          ) : monthlyTarget > 0 ? (
            <div className="mt-3">
              <div className="flex justify-between mb-1" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                <span>{Math.round(goalProgress)}%</span>
                <span>Meta: {formatCurrency(metaVentas)}</span>
              </div>
              <div className="w-full h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${goalProgress}%`,
                    background: 'linear-gradient(90deg, #C06DD6, #E8A5F0)',
                    boxShadow: '0 0 12px rgba(192,109,214,0.5)',
                  }}
                />
              </div>
            </div>
          ) : totalRealMes === 0 ? (
            <div className="mt-3 text-sm text-center" style={{ color: 'rgba(255,255,255,0.7)' }}>
              ¡Bienvenida! <Link to="/mis-metas" className="font-semibold underline" style={{ color: '#E8A5F0' }}>Configura tu meta</Link> 🚀
            </div>
          ) : (
            <Link to="/mis-metas" className="block mt-3 text-sm font-semibold underline" style={{ color: '#E8A5F0' }}>
              Configura tu meta →
            </Link>
          )}

          {/* Stats line */}
          <p className="mt-3 flex items-center gap-1 flex-wrap" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
            💜 Ganancia: <span className="font-semibold" style={{ color: '#E8A5F0' }}>{formatCurrency(gananciaAcumulada)}</span>
            {monthlyTarget > 0 && (
              <>
                <span className="mx-1">·</span>
                🎯 Meta: <span className="font-semibold text-white">{formatCurrency(monthlyTarget)}</span>
                <button
                  onClick={() => { setGoalInput(monthlyTarget); setGoalDialogOpen(true); }}
                  className="ml-0.5"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  <Settings className="w-2.5 h-2.5" />
                </button>
              </>
            )}
            {!monthlyTarget && (
              <>
                <span className="mx-1">·</span>
                <button
                  onClick={() => setGoalDialogOpen(true)}
                  className="font-semibold underline"
                  style={{ color: '#E8A5F0' }}
                >
                  Configura meta →
                </button>
              </>
            )}
          </p>
        </motion.div>
      </div>

      {/* ===== BODY — #F5F5F7 ===== */}
      <div className="px-4 pt-5 space-y-5" style={{ background: '#F5F5F7', minHeight: 'calc(100vh - 300px)' }}>

        {/* Active goals section */}
        {activeGoals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[18px] p-4 space-y-3"
            style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}
          >
            {primaryGoal && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(192,109,214,0.25)', color: '#E8A5F0' }}>
                    {goalEmoji(primaryGoal.target_type)} {primaryGoal.target_name || 'Mi Meta'}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <div className="h-full rounded-full" style={{ width: `${primaryGoal.pct}%`, background: 'linear-gradient(90deg, #C06DD6, #E8A5F0)' }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    <span className="font-semibold text-white">{formatCurrency(data.totalSales)}</span> de {formatCurrency(primaryGoal.target_amount)}
                  </p>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" style={{ color: '#E8A5F0' }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{primaryGoal.daysLeft} días</span>
                  </div>
                </div>
              </>
            )}

            {otherGoals.length > 0 && (
              <>
                <button
                  onClick={() => setShowOtherGoals(!showOtherGoals)}
                  className="flex items-center gap-1 text-[11px] mt-1"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  {showOtherGoals ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showOtherGoals ? 'Ocultar' : `+ Ver mis otras metas (${otherGoals.length})`}
                </button>
                <AnimatePresence>
                  {showOtherGoals && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-2"
                    >
                      {otherGoals.map(g => (
                        <div key={g.id} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.8)' }}>{goalEmoji(g.target_type)} {g.target_name || 'Meta'}</span>
                            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{g.daysLeft} días</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <div className="h-full rounded-full" style={{ width: `${g.pct}%`, background: 'rgba(192,109,214,0.7)' }} />
                          </div>
                          <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {formatCurrency(data.totalSales)} de {formatCurrency(g.target_amount)} · {Math.round(g.pct)}%
                          </p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}

        {/* Smart Notes */}
        {smartNotes.length > 0 && (
          <div className="space-y-2">
            {smartNotes.map((note, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="bg-white rounded-xl p-3 text-sm"
                style={{
                  borderLeft: '4px solid #C06DD6',
                  border: '1px solid #E8D5F5',
                  borderLeftWidth: '4px',
                  borderLeftColor: '#C06DD6',
                  color: '#2D1B69',
                }}
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
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: 'rgba(192,109,214,0.08)' }}
              >
                <Users className="w-5 h-5 flex-shrink-0" style={{ color: '#6B2FA0' }} />
                <p className="text-sm" style={{ color: '#2D1B69' }}>
                  <strong>{data.inactiveClients}</strong> clienta{data.inactiveClients > 1 ? 's' : ''} sin comprar en +30 días
                </p>
              </motion.div>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div>
          <p className="text-[9px] uppercase tracking-widest mb-2 font-semibold" style={{ color: '#999' }}>
            ACCESOS RÁPIDOS
          </p>
          <div className="grid grid-cols-4 gap-3">
            {quickLinks.map((link, i) => (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <Link
                  to={link.to}
                  className="flex flex-col items-center justify-center gap-2 bg-white rounded-2xl p-4"
                  style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#F0E6F6' }}>
                    <link.icon className="w-5 h-5" style={{ color: '#6B2FA0' }} />
                  </div>
                  <span className="font-bold" style={{ fontSize: '10px', color: '#2D1B69', fontFamily: 'Nunito, sans-serif' }}>
                    {link.label}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Price Shoes footer */}
        <div className="flex flex-col items-center gap-1 pt-4 pb-8">
          <span className="text-[10px]" style={{ color: '#999' }}>Herramienta oficial de</span>
          <img src="/logo-price.png" alt="Price Shoes" className="h-7 object-contain opacity-60" />
        </div>
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
            <Button onClick={saveMonthlyGoal} className="w-full" style={{ background: '#2D1B69', color: 'white' }}>
              Guardar meta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
