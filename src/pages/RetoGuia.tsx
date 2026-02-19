import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const HEADER_GRADIENT = 'linear-gradient(145deg, #2D1B69 0%, #6B2FA0 45%, #C06DD6 100%)';
const CARD_SHADOW = '0 2px 12px rgba(0,0,0,0.07)';

interface Task {
  day: number;
  text: string;
  cat: string;
}

const WEEKS: { title: string; tasks: Task[] }[] = [
  {
    title: 'Arranca con todo',
    tasks: [
      { day: 1, text: 'Sube 3 estados a WhatsApp con productos', cat: '📱 Digital' },
      { day: 2, text: 'Prospecta a 3 mamás en tu colonia', cat: '👥 Prospección' },
      { day: 3, text: 'Muestra el catálogo a 5 conocidas', cat: '📦 Producto' },
      { day: 4, text: 'Publica en Facebook Marketplace', cat: '📱 Digital' },
      { day: 5, text: 'Llama a 3 clientas anteriores', cat: '👥 Prospección' },
      { day: 6, text: 'Registra todas tus ventas de la semana', cat: '💰 Ventas' },
      { day: 7, text: 'Revisa tu ganancia de la semana', cat: '🧠 Aprendizaje' },
    ],
  },
  {
    title: 'Construye tu cartera',
    tasks: [
      { day: 1, text: 'Agrega 3 clientas nuevas a la app', cat: '👥 Prospección' },
      { day: 2, text: 'Manda seguimiento a clientas con crédito pendiente', cat: '💰 Ventas' },
      { day: 3, text: 'Sube foto de producto con precio a tus estados', cat: '📱 Digital' },
      { day: 4, text: 'Ofrece plan de crédito a 2 clientas', cat: '💰 Ventas' },
      { day: 5, text: 'Prospecta en grupo de WhatsApp', cat: '📱 Digital' },
      { day: 6, text: 'Revisa quién no ha comprado en 2 semanas', cat: '👥 Prospección' },
      { day: 7, text: 'Calcula tu ganancia acumulada', cat: '🧠 Aprendizaje' },
    ],
  },
  {
    title: 'Acelera',
    tasks: [
      { day: 1, text: 'Crea una oferta especial del día', cat: '💰 Ventas' },
      { day: 2, text: 'Pide 3 referidos a tus mejores clientas', cat: '👥 Prospección' },
      { day: 3, text: 'Actualiza tu catálogo con novedades', cat: '📦 Producto' },
      { day: 4, text: 'Haz un live de WhatsApp mostrando productos', cat: '📱 Digital' },
      { day: 5, text: 'Cobra a clientas con vencimiento esta semana', cat: '💰 Ventas' },
      { day: 6, text: 'Registra todo y revisa semáforo', cat: '🧠 Aprendizaje' },
      { day: 7, text: 'Planea tu pedido de la próxima semana', cat: '📦 Producto' },
    ],
  },
  {
    title: 'Cierra fuerte',
    tasks: [
      { day: 1, text: 'Calcula cuánto te falta para la meta', cat: '🧠 Aprendizaje' },
      { day: 2, text: 'Contacta a tus top 5 clientas', cat: '👥 Prospección' },
      { day: 3, text: 'Liquida productos sin rotación', cat: '💰 Ventas' },
      { day: 4, text: 'Agradece a todas tus clientas del mes', cat: '📱 Digital' },
      { day: 5, text: 'Cobra todos los pendientes', cat: '💰 Ventas' },
      { day: 6, text: 'Registra ventas y revisa ganancia total', cat: '🧠 Aprendizaje' },
      { day: 7, text: 'Celebra y planea el siguiente mes 🎉', cat: '🎉' },
    ],
  },
];

export default function RetoGuia() {
  const { user } = useAuth();
  const now = new Date();
  const currentWeekOfMonth = Math.min(4, Math.ceil(now.getDate() / 7));

  const [openWeek, setOpenWeek] = useState(currentWeekOfMonth);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [materialOpen, setMaterialOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('reto_progress')
        .select('week, day, completed')
        .eq('user_id', user.id);
      if (data) {
        const map: Record<string, boolean> = {};
        data.forEach((r: any) => { if (r.completed) map[`${r.week}-${r.day}`] = true; });
        setProgress(map);
      }
    };
    load();
  }, [user]);

  const toggleTask = async (week: number, day: number) => {
    if (!user) return;
    const key = `${week}-${day}`;
    const wasCompleted = !!progress[key];
    setProgress(prev => ({ ...prev, [key]: !wasCompleted }));

    if (wasCompleted) {
      await supabase.from('reto_progress').delete().eq('user_id', user.id).eq('week', week).eq('day', day);
    } else {
      await supabase.from('reto_progress').upsert(
        { user_id: user.id, week, day, completed: true, completed_at: new Date().toISOString() },
        { onConflict: 'user_id,week,day' }
      );
    }
  };

  const totalPoints = useMemo(() => {
    let pts = 0;
    for (let w = 1; w <= 4; w++) {
      let weekComplete = 0;
      for (let d = 1; d <= 7; d++) {
        if (progress[`${w}-${d}`]) { pts += 10; weekComplete++; }
      }
      if (weekComplete === 7) pts += 30;
    }
    return pts;
  }, [progress]);

  const catColor = (cat: string) => {
    if (cat.includes('Digital')) return '#6B2FA0';
    if (cat.includes('Prospección')) return '#2D1B69';
    if (cat.includes('Ventas')) return '#22c55e';
    if (cat.includes('Producto')) return '#f59e0b';
    if (cat.includes('Aprendizaje')) return '#3b82f6';
    return '#C06DD6';
  };

  return (
    <div>
      {/* HEADER */}
      <div style={{ background: HEADER_GRADIENT, padding: '48px 20px 24px' }}>
        <h1 className="text-white font-nunito" style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
          Guía del Reto 🏆
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Tu plan día a día para llegar a $10,000 de ganancia
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <span className="text-sm">🏆</span>
          <span className="text-sm font-bold text-white font-nunito">{totalPoints} puntos acumulados</span>
        </div>
      </div>

      {/* BODY */}
      <div className="px-4 pt-5 pb-4 space-y-3" style={{ background: '#F5F5F7', minHeight: 'calc(100vh - 200px)' }}>
        {WEEKS.map((week, wi) => {
          const weekNum = wi + 1;
          const isOpen = openWeek === weekNum;
          const completedCount = [1,2,3,4,5,6,7].filter(d => progress[`${weekNum}-${d}`]).length;

          return (
            <div key={weekNum} className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
              <button
                onClick={() => setOpenWeek(isOpen ? 0 : weekNum)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{
                    background: completedCount === 7 ? '#22c55e' : completedCount > 0 ? '#f59e0b' : weekNum <= currentWeekOfMonth ? '#ef4444' : '#d1d5db',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#2D1B69' }}>
                    Semana {weekNum} — {week.title}
                  </p>
                  <p className="text-[10px]" style={{ color: '#8a8a9a' }}>{completedCount}/7 tareas</p>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: '#8a8a9a' }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#8a8a9a' }} />}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {week.tasks.map((task) => {
                        const key = `${weekNum}-${task.day}`;
                        const done = !!progress[key];
                        return (
                          <button
                            key={task.day}
                            onClick={() => toggleTask(weekNum, task.day)}
                            className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all"
                            style={{ background: done ? 'rgba(34,197,94,0.08)' : '#F5F5F7' }}
                          >
                            <div
                              className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                              style={{
                                borderColor: done ? '#22c55e' : '#d1d5db',
                                background: done ? '#22c55e' : 'transparent',
                              }}
                            >
                              {done && <span className="text-white text-xs">✓</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${done ? 'line-through' : ''}`} style={{ color: done ? '#8a8a9a' : '#2D1B69' }}>
                                Día {task.day}: {task.text}
                              </p>
                              <span className="text-[10px] font-medium" style={{ color: catColor(task.cat) }}>
                                {task.cat}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium shrink-0 mt-1" style={{ color: done ? '#22c55e' : '#d1d5db' }}>
                              +10 pts
                            </span>
                          </button>
                        );
                      })}

                      {completedCount === 7 && (
                        <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                          <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>🎉 ¡Semana completa! +30 puntos bonus</p>
                        </div>
                      )}

                      {/* Material */}
                      <button
                        onClick={() => setMaterialOpen(true)}
                        className="w-full rounded-xl p-3 text-center"
                        style={{ background: '#F0E6F6' }}
                      >
                        <p className="text-xs font-semibold" style={{ color: '#6B2FA0' }}>
                          📄 Material de la Semana {weekNum}
                        </p>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <Dialog open={materialOpen} onOpenChange={setMaterialOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>📄 Material de la semana</DialogTitle>
            <DialogDescription>Recursos para tu negocio</DialogDescription>
          </DialogHeader>
          <div className="text-center py-6 space-y-3">
            <p className="text-4xl">🌸</p>
            <p className="text-sm" style={{ color: '#2D1B69' }}>
              Próximamente: materiales exclusivos de Universidad de la Mujer 🌸
            </p>
          </div>
          <Button onClick={() => setMaterialOpen(false)} className="w-full text-white" style={{ background: '#6B2FA0' }}>
            Cerrar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
