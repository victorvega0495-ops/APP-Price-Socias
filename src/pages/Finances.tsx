import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Target, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface WeekData {
  week: number;
  total_sales: number;
  product_cost: number;
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

  // Goals
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [monthTotalSales, setMonthTotalSales] = useState(0);

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
        setMonthTotalSales(mapped.reduce((s, w) => s + w.total_sales, 0));
      }
      const { data: goalData } = await supabase
        .from('monthly_goals')
        .select('target_income')
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (goalData) setMonthlyTarget(Number(goalData.target_income));
    };
    load();
  }, [user, year, month]);

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
      const newTotal = weeks.reduce((s, w) => s + (w.week === weekData.week ? weekData.total_sales : w.total_sales), 0);
      setMonthTotalSales(newTotal);
    }
  };

  const saveMonthlyGoal = async () => {
    if (!user) return;
    await supabase
      .from('monthly_goals')
      .upsert({ user_id: user.id, year, month, target_income: monthlyTarget }, { onConflict: 'user_id,year,month' });
    toast({ title: 'Meta guardada ✅' });
  };

  const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const monthTotal = weeks.reduce((s, w) => s + w.total_sales, 0);
  const goalProgress = monthlyTarget > 0 ? Math.min(100, (monthTotalSales / monthlyTarget) * 100) : 0;
  const weeklyNeeded = monthlyTarget > 0 ? monthlyTarget / 4 : 0;
  const dailyNeeded = weeklyNeeded / 7;

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-foreground mb-1">Finanzas</h1>
      <p className="text-sm text-muted-foreground mb-4">{monthNames[month]} {year}</p>

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted rounded-xl h-10">
          <TabsTrigger value="weekly" className="text-xs rounded-lg data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> Semanal
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-xs rounded-lg data-[state=active]:bg-navy data-[state=active]:text-primary-foreground">
            <Target className="w-3.5 h-3.5 mr-1" /> Metas
          </TabsTrigger>
        </TabsList>

        {/* Tab A: Weekly */}
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
                      ⚠️ Tu precio de venta está muy bajo. No estás cubriendo el costo de tu producto. Acércate al equipo del Reto para aprender a calcular mejor tu precio.
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

        {/* Tab B: Monthly Goals */}
        <TabsContent value="goals" className="mt-4 space-y-4">
          <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
            <div>
              <Label>Meta de ingreso mensual</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={monthlyTarget || ''}
                  onChange={(e) => setMonthlyTarget(Number(e.target.value) || 0)}
                  placeholder="$10,000"
                />
                <Button onClick={saveMonthlyGoal} className="bg-navy text-primary-foreground shrink-0">
                  Guardar
                </Button>
              </div>
            </div>

            {monthlyTarget > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Para llegar necesitas vender:</p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-muted rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Por semana</p>
                      <p className="text-lg font-bold text-navy">{formatCurrency(weeklyNeeded)}</p>
                    </div>
                    <div className="bg-muted rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Por día</p>
                      <p className="text-lg font-bold text-navy">{formatCurrency(dailyNeeded)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progreso del mes</span>
                    <span className="font-semibold">{Math.round(goalProgress)}%</span>
                  </div>
                  <Progress value={goalProgress} className="h-3 bg-muted [&>div]:bg-gradient-gold" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatCurrency(monthTotalSales)}</span>
                    <span>{formatCurrency(monthlyTarget)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
