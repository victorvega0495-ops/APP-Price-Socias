import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, daysRemaining, progressPercentage } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import ProgressRing from '@/components/ProgressRing';
import { Trophy, TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

export default function Challenge() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [targetAmount, setTargetAmount] = useState(10000);
  const [deadline, setDeadline] = useState('');
  const [totalSales, setTotalSales] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ name: string; ventas: number }[]>([]);
  const [hasGoal, setHasGoal] = useState(false);
  const [goalId, setGoalId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Load goal
      const { data: goal } = await supabase
        .from('challenge_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (goal) {
        setTargetAmount(Number(goal.target_amount));
        setDeadline(goal.deadline);
        setHasGoal(true);
        setGoalId(goal.id);
      }

      // Load all weekly finances for chart
      const { data: finances } = await supabase
        .from('weekly_finances')
        .select('year, month, week, total_sales')
        .eq('user_id', user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true })
        .order('week', { ascending: true });

      if (finances) {
        const total = finances.reduce((s, f) => s + Number(f.total_sales), 0);
        setTotalSales(total);
        const chartData = finances.slice(-8).map(f => ({
          name: `S${f.week} M${f.month}`,
          ventas: Number(f.total_sales),
        }));
        setWeeklyData(chartData);
      }
    };
    load();
  }, [user]);

  const saveGoal = async () => {
    if (!user || !deadline) return;
    if (goalId) {
      await supabase.from('challenge_goals').update({ target_amount: targetAmount, deadline }).eq('id', goalId);
    } else {
      await supabase.from('challenge_goals').insert({ user_id: user.id, target_amount: targetAmount, deadline });
    }
    setHasGoal(true);
    toast({ title: '¡Meta guardada! 🎯' });
  };

  const progress = progressPercentage(totalSales, targetAmount);
  const remaining = targetAmount - totalSales;
  const days = deadline ? daysRemaining(deadline) : 0;
  const weeksLeft = Math.ceil(days / 7);
  const weeklyAvg = weeklyData.length > 0 ? totalSales / weeklyData.length : 0;
  const projectedTotal = weeksLeft > 0 ? totalSales + weeklyAvg * weeksLeft : totalSales;
  const onTrack = projectedTotal >= targetAmount;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-6 h-6 text-gold" />
        <h1 className="text-xl font-bold">Mi Reto</h1>
      </div>

      {!hasGoal ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl p-5 shadow-card space-y-4">
          <h2 className="text-lg font-semibold">Configura tu meta del Reto</h2>
          <p className="text-sm text-muted-foreground">Define cuánto quieres ganar y para cuándo</p>
          <div>
            <Label>Monto objetivo</Label>
            <Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(Number(e.target.value) || 0)} placeholder="$10,000" />
          </div>
          <div>
            <Label>Fecha límite</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <Button onClick={saveGoal} className="w-full bg-gradient-gold text-accent-foreground font-semibold h-12 rounded-xl">
            ¡Comenzar mi Reto! 🚀
          </Button>
        </motion.div>
      ) : (
        <>
          {/* Big Progress */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-navy rounded-2xl p-6 flex flex-col items-center shadow-elevated"
          >
            <ProgressRing percentage={progress} size={140} strokeWidth={12} />
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-primary-foreground">{formatCurrency(totalSales)}</p>
              <p className="text-sm text-primary-foreground/60">de {formatCurrency(targetAmount)}</p>
            </div>
            <div className="flex gap-4 mt-4 w-full">
              <div className="flex-1 bg-primary-foreground/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-primary-foreground/60">Falta</p>
                <p className="text-sm font-bold text-primary-foreground">{formatCurrency(Math.max(0, remaining))}</p>
              </div>
              <div className="flex-1 bg-primary-foreground/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-primary-foreground/60">Días</p>
                <p className="text-sm font-bold text-primary-foreground">{days}</p>
              </div>
              <div className="flex-1 bg-primary-foreground/10 rounded-xl p-3 text-center">
                <p className="text-[10px] text-primary-foreground/60">Promedio/sem</p>
                <p className="text-sm font-bold text-primary-foreground">{formatCurrency(weeklyAvg)}</p>
              </div>
            </div>
          </motion.div>

          {/* Projection */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-xl p-4 flex items-center gap-3 ${onTrack ? 'bg-gold/10' : 'bg-destructive/10'}`}
          >
            {onTrack ? <TrendingUp className="w-5 h-5 text-gold-dark" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
            <p className="text-sm text-foreground">
              {onTrack
                ? `¡Vas excelente! 🎉 A tu ritmo llegarás a ${formatCurrency(Math.round(projectedTotal))}`
                : `Necesitas aumentar tu ritmo. A este paso llegarás a ${formatCurrency(Math.round(projectedTotal))} para tu fecha límite.`
              }
            </p>
          </motion.div>

          {/* Chart */}
          {weeklyData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-4 shadow-card"
            >
              <h3 className="text-sm font-semibold mb-3">Ventas semanales</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Bar dataKey="ventas" radius={[4, 4, 0, 0]}>
                    {weeklyData.map((_, index) => (
                      <Cell key={index} fill={index === weeklyData.length - 1 ? 'hsl(51 100% 50%)' : 'hsl(232 66% 30%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Edit goal */}
          <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
            <h3 className="text-sm font-semibold">Ajustar meta</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Monto</Label>
                <Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(Number(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">Fecha límite</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>
            <Button onClick={saveGoal} size="sm" className="w-full bg-navy text-primary-foreground">
              Actualizar meta
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
