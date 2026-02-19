import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { ChevronLeft } from 'lucide-react';

const HEADER_GRADIENT = 'linear-gradient(145deg, #2D1B69 0%, #6B2FA0 45%, #C06DD6 100%)';
const CARD_SHADOW = '0 2px 12px rgba(0,0,0,0.07)';

interface OnboardingFlowProps {
  skipWelcome?: boolean;
  onComplete?: () => void;
  initialValues?: { pctGanancia?: number; pctAhorro?: number; pctReposicion?: number };
}

export function OnboardingFlow({ skipWelcome = false, onComplete, initialValues }: OnboardingFlowProps) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Steps: 0=welcome, 1=compraTipo, 2=metodo explanation, 3=slider+cubetas, 4=resultado, 5=ahorro, 6=summary
  const [step, setStep] = useState(skipWelcome ? 1 : 0);
  const [compraTipo, setCompraTipo] = useState<string | null>(null);
  const [pctGanancia, setPctGanancia] = useState(initialValues?.pctGanancia ?? 30);
  const [wantsToSave, setWantsToSave] = useState<boolean | null>(null);
  const [pctAhorro, setPctAhorro] = useState(initialValues?.pctAhorro ?? 20);
  const [saving, setSaving] = useState(false);

  const totalSteps = skipWelcome ? 6 : 7;
  const pctGastos = 5;
  const pctReposicion = 100 - pctGanancia - pctGastos;

  const base = 1000;
  const costoProducto = base * (pctReposicion / 100);
  const ganancia = base * (pctGanancia / 100);
  const gastos = base * (pctGastos / 100);
  const precioSugerido = costoProducto / (pctReposicion / 100);

  const ahorro = wantsToSave === false ? 0 : pctAhorro;
  const gananciaMonto = base * (pctGanancia / 100);
  const pctNecesidades = (100 - ahorro) * 0.625;
  const pctDeseos = (100 - ahorro) * 0.375;
  const montoNecesidades = gananciaMonto * (pctNecesidades / 100);
  const montoDeseos = gananciaMonto * (pctDeseos / 100);
  const montoAhorro = gananciaMonto * (ahorro / 100);

  const [showTourPrompt, setShowTourPrompt] = useState(false);

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    const finalAhorro = wantsToSave === false ? 0 : pctAhorro;
    await supabase.from('profiles').update({
      metodologia: 'personalizada',
      pct_ganancia: pctGanancia,
      pct_ahorro: finalAhorro,
      pct_reposicion: pctReposicion,
      compra_tipo: compraTipo,
    }).eq('user_id', user.id);
    setSaving(false);
    if (skipWelcome) {
      await refreshProfile();
      toast({ title: '¡Configuración lista! 🎉' });
      if (onComplete) onComplete();
      else navigate('/');
    } else {
      setShowTourPrompt(true);
    }
  };

  const goHome = async (withTour: boolean) => {
    await refreshProfile();
    toast({ title: '¡Configuración lista! 🎉' });
    if (onComplete) {
      onComplete();
    } else {
      navigate(withTour ? '/?tour=true' : '/', { replace: true });
    }
  };

  const canGoNext = () => {
    if (step === 1) return compraTipo !== null;
    if (step === 5) return wantsToSave !== null;
    return true;
  };

  const stepIndex = skipWelcome ? step - 1 : step;
  const progressWidth = ((stepIndex + 1) / totalSteps) * 100;

  const compraOptions = [
    { value: 'contado', emoji: '💵', title: 'Pago de contado', sub: 'Pagas el producto completo' },
    { value: 'crediprice', emoji: '💳', title: 'Con CrediPrice', sub: 'Pagas en parcialidades' },
    { value: 'mixto', emoji: '🔀', title: 'Mitad y mitad', sub: 'Dependiendo del pedido' },
  ];

  const stepTitles: Record<number, string> = {
    1: '¿Cómo compras? 🛒',
    2: 'El método Price Shoes 💡',
    3: 'Ajusta tu negocio 🪣',
    4: 'Tu resultado 🎯',
    5: '¿Quieres ahorrar? ⭐',
    6: 'Tu negocio 🚀',
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F5F7' }}>
      {/* Header */}
      {step > 0 && !showTourPrompt && (
        <div style={{ background: HEADER_GRADIENT, padding: '48px 20px 20px' }}>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setStep(s => s - 1)} className="text-white/70">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-white text-lg font-bold" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {stepTitles[step] || ''}
            </h1>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressWidth}%`, background: 'linear-gradient(90deg, #C06DD6, #E8A5F0)' }} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {/* STEP 0 — Welcome */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center px-6 text-center" style={{ background: HEADER_GRADIENT }}>
              <img src="/logo-price.png" alt="Price Shoes" className="h-14 object-contain mb-8" />
              <svg viewBox="0 0 200 200" className="w-40 h-40 mb-6" style={{ animation: 'float 3s ease-in-out infinite' }}>
                <circle cx="100" cy="100" r="90" fill="#F0E6F6" opacity="0.5" />
                <ellipse cx="100" cy="62" rx="28" ry="30" fill="#2D1B69" />
                <ellipse cx="78" cy="72" rx="10" ry="18" fill="#2D1B69" />
                <ellipse cx="122" cy="72" rx="10" ry="18" fill="#2D1B69" />
                <ellipse cx="100" cy="70" rx="22" ry="24" fill="#F5C6A0" />
                <ellipse cx="92" cy="66" rx="2.5" ry="3" fill="#2D1B69" />
                <ellipse cx="108" cy="66" rx="2.5" ry="3" fill="#2D1B69" />
                <path d="M90 76 Q100 84 110 76" stroke="#2D1B69" strokeWidth="2" fill="none" strokeLinecap="round" />
                <circle cx="86" cy="76" r="4" fill="#E8A5F0" opacity="0.5" />
                <circle cx="114" cy="76" r="4" fill="#E8A5F0" opacity="0.5" />
                <path d="M70 95 Q100 88 130 95 L135 145 Q100 150 65 145 Z" fill="#6B2FA0" />
                <rect x="94" y="90" width="12" height="8" rx="3" fill="#F5C6A0" />
                <path d="M70 100 L45 60" stroke="#F5C6A0" strokeWidth="8" strokeLinecap="round" />
                <circle cx="43" cy="56" r="6" fill="#F5C6A0" />
                <path d="M130 100 L155 60" stroke="#F5C6A0" strokeWidth="8" strokeLinecap="round" />
                <circle cx="157" cy="56" r="6" fill="#F5C6A0" />
                <polygon points="35,42 37,37 42,37 38,34 39,29 35,32 31,29 32,34 28,37 33,37" fill="#D4A017" opacity="0.9">
                  <animateTransform attributeName="transform" type="scale" values="1;1.2;1" dur="1.5s" repeatCount="indefinite" additive="sum" />
                </polygon>
                <polygon points="165,42 167,37 172,37 168,34 169,29 165,32 161,29 162,34 158,37 163,37" fill="#D4A017" opacity="0.9">
                  <animateTransform attributeName="transform" type="scale" values="1;1.2;1" dur="1.8s" repeatCount="indefinite" additive="sum" />
                </polygon>
                <path d="M65 145 Q67 175 75 185 L125 185 Q133 175 135 145 Z" fill="#C06DD6" />
                <ellipse cx="82" cy="188" rx="10" ry="4" fill="#2D1B69" />
                <ellipse cx="118" cy="188" rx="10" ry="4" fill="#2D1B69" />
              </svg>
              <style>{`@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }`}</style>
              <h1 className="text-white text-2xl font-black mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>Bienvenida a tu app de negocio 🎉</h1>
              <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 280 }}>En 3 minutos configuramos cómo vas a manejar tu dinero para que siempre sepas a dónde va cada peso.</p>
              <Button onClick={() => setStep(1)} className="w-full max-w-xs h-14 text-base font-bold rounded-2xl text-white" style={{ background: '#1a103f' }}>¡Empezamos! →</Button>
            </motion.div>
          )}

          {/* STEP 1 — Purchase type */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="flex-1 px-5 pt-6 pb-8 flex flex-col">
              <p className="text-sm font-semibold mb-1" style={{ color: '#2D1B69' }}>Cuando compras a Price Shoes, ¿cómo lo haces normalmente?</p>
              <p className="text-xs mb-5" style={{ color: '#8a8a9a' }}>Esto nos ayuda a darte mejores consejos.</p>
              <div className="space-y-3 flex-1">
                {compraOptions.map(o => (
                  <button key={o.value} onClick={() => setCompraTipo(o.value)} className="w-full text-left p-4 rounded-2xl transition-all" style={{ background: 'white', boxShadow: compraTipo === o.value ? '0 0 0 2px #6B2FA0, ' + CARD_SHADOW : CARD_SHADOW, transform: compraTipo === o.value ? 'scale(1.02)' : 'scale(1)' }}>
                    <span className="text-2xl">{o.emoji}</span>
                    <p className="font-semibold mt-1" style={{ color: '#2D1B69' }}>{o.title}</p>
                    <p className="text-xs" style={{ color: '#8a8a9a' }}>{o.sub}</p>
                  </button>
                ))}
              </div>
              <Button onClick={() => setStep(2)} disabled={!compraTipo} className="w-full h-12 rounded-xl text-white font-semibold mt-4" style={{ background: '#6B2FA0' }}>Siguiente →</Button>
            </motion.div>
          )}

          {/* STEP 2 — Método explanation only (no slider, no buckets) */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="flex-1 px-5 pt-6 pb-8 flex flex-col">
              <p className="text-sm font-semibold mb-1" style={{ color: '#2D1B69' }}>Así funciona tu negocio con Price Shoes</p>
              <p className="text-xs mb-5" style={{ color: '#8a8a9a' }}>Es más fácil de lo que piensas.</p>

              <div className="rounded-2xl p-5 text-white space-y-4" style={{ background: 'linear-gradient(135deg, #1a103f, #2D1B69)' }}>
                <p className="text-lg font-bold" style={{ fontFamily: 'Nunito, sans-serif' }}>El método 65 / 30 / 5</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>Cada peso que cobras a tu clienta se divide en 3 partes:</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <span className="text-2xl">📦</span>
                    <div>
                      <p className="font-bold">65% → Repones tu producto</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Lo que le pagas a Price Shoes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className="font-bold">30% → Tu ganancia</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Lo que te queda a ti</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <span className="text-2xl">📊</span>
                    <div>
                      <p className="font-bold">5% → Gastos del negocio</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Envíos, bolsas, transporte</p>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>💡 Para lograr esto, le cobras a tu clienta un <strong className="text-white">54% más</strong> de lo que te costó.</p>
                  <p className="text-base font-bold mt-2" style={{ color: '#E8A5F0' }}>Ejemplo: si pagaste $650, cóbrale $1,000</p>
                </div>
              </div>

              <div className="flex-1" />
              <Button onClick={() => setStep(3)} className="w-full h-12 rounded-xl text-white font-semibold mt-4" style={{ background: '#6B2FA0' }}>Siguiente →</Button>
            </motion.div>
          )}

          {/* STEP 3 — Slider + Buckets */}
          {step === 3 && (() => {
            const reposicionDecimal = 1 - pctGanancia / 100 - 0.05;
            const incremento = Math.round(((1 / reposicionDecimal) - 1) * 100);
            const incrementoMsg = incremento >= 50
              ? { icon: '✅', text: `Con +${incremento}% de incremento cubres todo: producto, ganancia y gastos. ¡Vas muy bien!`, color: '#22C55E' }
              : incremento >= 35
              ? { icon: '👍', text: `Con +${incremento}% de incremento tendrás ganancia pero ojo: revisa que cubras tus gastos.`, color: '#6B2FA0' }
              : { icon: '⚠️', text: `Con solo +${incremento}% de incremento puede que no alcance para reponer tu producto. Considera subir tu precio de venta.`, color: '#F59E0B' };

            return (
            <motion.div key="s3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="flex-1 px-5 pt-6 pb-8 flex flex-col overflow-y-auto">
              <p className="text-sm font-semibold mb-1" style={{ color: '#2D1B69' }}>Ajusta el slider y ve cómo se mueven las cubetas</p>
              <p className="text-xs mb-4" style={{ color: '#8a8a9a' }}>Juega con el porcentaje para encontrar tu punto ideal.</p>

              <div className="bg-white rounded-2xl p-5 space-y-4" style={{ boxShadow: CARD_SHADOW }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: '#2D1B69' }}>Tu ganancia</span>
                  <span className="text-xl font-black font-nunito" style={{ color: '#6B2FA0' }}>{pctGanancia}%</span>
                </div>
                <Slider value={[pctGanancia]} onValueChange={([v]) => setPctGanancia(v)} min={10} max={50} step={1} />

                {/* 3 Cubetas animadas */}
                <div className="flex gap-2 mt-2">
                  {[
                    { label: '🪣 Producto', pct: pctReposicion, color: '#2D1B69' },
                    { label: '🪣 Ganancia', pct: pctGanancia, color: '#6B2FA0' },
                    { label: '🪣 Gastos', pct: pctGastos, color: '#C06DD6' },
                  ].map((bucket) => (
                    <div key={bucket.label} className="flex-1 text-center">
                      <div className="relative mx-auto w-full h-16 rounded-lg overflow-hidden" style={{ background: '#F0E6F6' }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-b-lg"
                          style={{ height: `${Math.min(100, Math.max(0, bucket.pct))}%`, background: bucket.color, transition: 'height 0.3s ease' }}
                        />
                      </div>
                      <p className="text-[10px] mt-1 font-medium" style={{ color: '#2D1B69' }}>{bucket.label}</p>
                      <p className="text-[10px] font-bold" style={{ color: bucket.color }}>{bucket.pct}%</p>
                    </div>
                  ))}
                </div>
                {pctReposicion >= 50 && pctGanancia >= 10 ? (
                  <p className="text-[11px] text-center" style={{ color: '#22c55e' }}>✅ Las 3 cubetas llenas = negocio sano</p>
                ) : (
                  <p className="text-[11px] text-center" style={{ color: '#f59e0b' }}>⚠️ Una cubeta se vacía — algo se ve afectado</p>
                )}

                {pctGanancia > 30 && (
                  <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background: '#FFF3E0' }}>
                    <span className="text-sm">⚠️</span>
                    <p className="text-[11px]" style={{ color: '#2D1B69' }}>Recomendamos al menos 5% para gastos de tu negocio (envíos, bolsas, etc.). Con {pctGanancia}% de ganancia tu reposición baja a {100 - pctGanancia - 5}%.</p>
                  </div>
                )}
                <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: incrementoMsg.color + '15' }}>
                  <span className="text-lg">{incrementoMsg.icon}</span>
                  <p className="text-xs" style={{ color: '#2D1B69' }}>{incrementoMsg.text}</p>
                </div>
              </div>

              <div className="flex-1" />
              <Button onClick={() => setStep(4)} className="w-full h-12 rounded-xl text-white font-semibold mt-4" style={{ background: '#6B2FA0' }}>Siguiente →</Button>
            </motion.div>
            );
          })()}

          {/* STEP 4 — Result breakdown */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="flex-1 px-5 pt-6 pb-8 flex flex-col overflow-y-auto">
              <p className="text-sm font-semibold mb-1" style={{ color: '#2D1B69' }}>Esto es lo que ganas por cada venta de $1,000</p>
              <p className="text-xs mb-5" style={{ color: '#8a8a9a' }}>Con tu configuración del {pctGanancia}% de ganancia.</p>

              <div className="rounded-2xl p-5 text-white space-y-3" style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between"><span>💼 Producto/CrediPrice</span><span className="font-bold">{formatCurrency(Math.round(costoProducto))} ({pctReposicion}%)</span></div>
                  <div className="flex justify-between"><span>💰 Tu ganancia</span><span className="font-bold">{formatCurrency(Math.round(ganancia))} ({pctGanancia}%)</span></div>
                  <div className="flex justify-between"><span>📊 Gastos negocio</span><span className="font-bold">{formatCurrency(Math.round(gastos))} ({pctGastos}%)</span></div>
                </div>
                <div className="pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>🏷️ Por cada ${Math.round(costoProducto)} que pagas a Price, le cobras a tu clienta:</p>
                  <p className="text-2xl font-black font-nunito mt-1">{formatCurrency(Math.round(precioSugerido))}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl p-4 text-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>💪 ¡Con esto tu negocio funciona! Ahora veamos si quieres ahorrar.</p>
              </div>

              <div className="flex-1" />
              <Button onClick={() => setStep(5)} className="w-full h-12 rounded-xl text-white font-semibold mt-4" style={{ background: '#6B2FA0' }}>Siguiente →</Button>
            </motion.div>
          )}

          {/* STEP 5 — Savings */}
          {step === 5 && (() => {
            // Fixed example: $10,000 in SALES
            const ventaEjemplo = 10000;
            const gananciaBruta = ventaEjemplo * (pctGanancia / 100); // e.g. 3000 at 30%
            const ahorroMes = gananciaBruta * (pctAhorro / 100); // e.g. 600 at 20%
            const necesidadesMes = gananciaBruta * 0.5;
            const deseosMes = gananciaBruta * 0.3;

            // Vacation mini demo
            const metaVacaciones = 15000;
            const mesesConAhorro = ahorroMes > 0 ? Math.ceil(metaVacaciones / ahorroMes) : 999;
            const ahorroParaDoce = metaVacaciones / 12;
            const gananciaNecesariaDoce = ahorroParaDoce / (pctAhorro / 100);
            const ventaNecesariaDoce = gananciaNecesariaDoce / (pctGanancia / 100);
            const paresParaDoce = Math.ceil(ventaNecesariaDoce / 850);

            return (
            <motion.div key="s5" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="flex-1 px-5 pt-6 pb-8 flex flex-col overflow-y-auto">
              <p className="text-sm font-semibold mb-1" style={{ color: '#2D1B69' }}>De tu ganancia del {pctGanancia}%, ¿cuánto quieres apartar para tus sueños?</p>
              <p className="text-xs mb-5" style={{ color: '#8a8a9a' }}>El ahorro te acerca a lo que más quieres.</p>

              <div className="space-y-3">
                <button onClick={() => setWantsToSave(true)} className="w-full text-left p-4 rounded-2xl transition-all" style={{ background: 'white', boxShadow: wantsToSave === true ? '0 0 0 2px #6B2FA0, ' + CARD_SHADOW : CARD_SHADOW }}>
                  <span className="text-2xl">⭐</span>
                  <p className="font-semibold mt-1" style={{ color: '#2D1B69' }}>Sí, quiero ahorrar</p>
                  <p className="text-xs" style={{ color: '#8a8a9a' }}>Aparto un porcentaje para mis sueños</p>
                </button>
                <button onClick={() => setWantsToSave(false)} className="w-full text-left p-4 rounded-2xl transition-all" style={{ background: 'white', boxShadow: wantsToSave === false ? '0 0 0 2px #6B2FA0, ' + CARD_SHADOW : CARD_SHADOW }}>
                  <span className="text-2xl">📦</span>
                  <p className="font-semibold mt-1" style={{ color: '#2D1B69' }}>Por ahora no, todo a necesidades</p>
                  <p className="text-xs" style={{ color: '#8a8a9a' }}>Mi ganancia completa va a gastos del hogar</p>
                </button>
              </div>

              {wantsToSave === true && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                  <div className="bg-white rounded-2xl p-5 space-y-4" style={{ boxShadow: CARD_SHADOW }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: '#2D1B69' }}>¿Cuánto ahorras?</span>
                      <span className="text-xl font-black font-nunito" style={{ color: '#6B2FA0' }}>{pctAhorro}%</span>
                    </div>
                    <Slider value={[pctAhorro]} onValueChange={([v]) => setPctAhorro(v)} min={5} max={50} step={1} />
                    <div className="rounded-xl p-4 space-y-2" style={{ background: '#F0E6F6' }}>
                      <p className="text-xs font-semibold" style={{ color: '#2D1B69' }}>Si vendes {formatCurrency(ventaEjemplo)} al mes:</p>
                      <div className="space-y-1 text-xs" style={{ color: '#2D1B69' }}>
                        <p>💰 Tu ganancia ({pctGanancia}%): <strong>{formatCurrency(Math.round(gananciaBruta))}</strong></p>
                        <p>🏠 Necesidades (50%): <strong>{formatCurrency(Math.round(necesidadesMes))}</strong></p>
                        <p>✨ Deseos (30%): <strong>{formatCurrency(Math.round(deseosMes))}</strong></p>
                        <p>⭐ Ahorro ({pctAhorro}%): <strong>{formatCurrency(Math.round(ahorroMes))}</strong></p>
                      </div>
                      <div className="pt-2 border-t" style={{ borderColor: 'rgba(45,27,105,0.1)' }}>
                        <p className="text-sm font-bold text-center" style={{ color: '#6B2FA0' }}>
                          Si vendes {formatCurrency(ventaEjemplo)} al mes, ahorras {formatCurrency(Math.round(ahorroMes))} para tus sueños 🌟
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {wantsToSave === false && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                  <div className="rounded-2xl p-4" style={{ background: '#F0E6F6' }}>
                    <p className="text-xs" style={{ color: '#2D1B69' }}>Sin problema. Toda tu ganancia va a necesidades y deseos. Puedes activar el ahorro cuando quieras desde <strong>Mi Cuenta</strong>.</p>
                  </div>
                </motion.div>
              )}

              {/* Mini demo ahorro — vacaciones */}
              {wantsToSave === true && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
                  <div className="rounded-2xl p-5 space-y-3" style={{ background: 'linear-gradient(135deg, #1a103f, #2D1B69)' }}>
                    <p className="text-sm font-bold text-white">💡 Ejemplo: ¿Quieres irte de vacaciones?</p>
                    <div className="space-y-2 text-xs text-white/80">
                      <p>🏖️ Meta: <strong className="text-white">Vacaciones $15,000</strong></p>
                      <p>⭐ Con {formatCurrency(Math.round(ahorroMes))}/mes de ahorro lo logras en <strong className="text-white">{mesesConAhorro} meses</strong></p>
                      <p>🚀 ¿Quieres lograrlo en <strong className="text-white">12 meses</strong>? Necesitas vender <strong className="text-white">{formatCurrency(Math.round(ventaNecesariaDoce))}/mes</strong></p>
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>~{paresParaDoce} pares a costo promedio de $850</p>
                    </div>
                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-white/60">
                        <span>Tu ahorro mensual</span>
                        <span>{formatCurrency(Math.round(ahorroMes))} / {formatCurrency(Math.round(ahorroParaDoce))} necesario</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, #D4A017, #E8A5F0)' }}
                          initial={{ width: '0%' }}
                          animate={{ width: `${Math.min(100, (ahorroMes / ahorroParaDoce) * 100)}%` }}
                          transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="text-[10px] text-center font-medium" style={{ color: '#D4A017' }}>¡Tú puedes lograrlo! 💪</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="flex-1" />
              <Button onClick={() => setStep(6)} disabled={wantsToSave === null} className="w-full h-12 rounded-xl text-white font-semibold mt-4" style={{ background: '#6B2FA0' }}>Siguiente →</Button>
            </motion.div>
            );
          })()}

          {/* STEP 6 — Summary */}
          {step === 6 && (
            <motion.div key="s6" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="flex-1 px-5 pt-6 pb-8 flex flex-col">
              <p className="text-sm font-semibold mb-1" style={{ color: '#2D1B69' }}>Así se ve tu negocio 🚀</p>
              <p className="text-xs mb-5" style={{ color: '#8a8a9a' }}>Este es el desglose de cada $1,000 que vendas.</p>

              <div className="rounded-2xl p-5 text-white space-y-3" style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between"><span>💼 Producto/CrediPrice</span><span className="font-bold">{formatCurrency(Math.round(costoProducto))} ({pctReposicion}%)</span></div>
                  <div className="flex justify-between"><span>💰 Tu ganancia</span><span className="font-bold">{formatCurrency(Math.round(ganancia))} ({pctGanancia}%)</span></div>
                  <div className="pl-5 space-y-1 text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    <div className="flex justify-between"><span>🏠 Necesidades</span><span>{formatCurrency(Math.round(montoNecesidades))}</span></div>
                    <div className="flex justify-between"><span>✨ Deseos</span><span>{formatCurrency(Math.round(montoDeseos))}</span></div>
                    <div className="flex justify-between"><span>⭐ Ahorro/Sueños</span><span>{formatCurrency(Math.round(montoAhorro))}</span></div>
                  </div>
                  <div className="flex justify-between"><span>📊 Gastos negocio</span><span className="font-bold">{formatCurrency(Math.round(gastos))} ({pctGastos}%)</span></div>
                  <div className="pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                    <div className="flex justify-between items-center">
                      <span>🏷️ Precio sugerido</span>
                      <span className="text-lg font-black" style={{ fontFamily: 'Nunito, sans-serif' }}>{formatCurrency(Math.round(precioSugerido))}</span>
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>por cada ${Math.round(costoProducto)} que pagas a Price</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-center mt-4 px-4" style={{ color: '#8a8a9a' }}>
                Puedes cambiar esto cuando quieras en <strong>Mi Cuenta → Metodología</strong>
              </p>

              {skipWelcome && (
                <div className="flex items-start gap-2 mt-4 p-3 rounded-xl" style={{ background: '#FFF3E0' }}>
                  <span>⚠️</span>
                  <p className="text-xs" style={{ color: '#2D1B69' }}>Este cambio aplica a ventas futuras. Tus registros anteriores no se modifican.</p>
                </div>
              )}

              <div className="flex-1" />
              <Button onClick={handleFinish} disabled={saving} className="w-full h-14 rounded-xl text-white font-bold text-base mt-4" style={{ background: 'linear-gradient(135deg, #C06DD6, #9B59B6)' }}>
                {saving ? 'Guardando...' : skipWelcome ? 'Guardar cambios' : '¡Listo, a vender! 🎉'}
              </Button>
            </motion.div>
          )}

          {/* Tour prompt */}
          {showTourPrompt && (
            <motion.div key="tour-prompt" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center px-6 text-center" style={{ background: HEADER_GRADIENT }}>
              <p className="text-5xl mb-4">🗺️</p>
              <h2 className="text-white text-xl font-bold font-nunito mb-2">¿Quieres un recorrido rápido?</h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 280 }}>Te mostramos en 2 minutos cómo funciona cada sección de tu app</p>
              <Button onClick={() => goHome(true)} className="w-full max-w-xs h-14 text-base font-bold rounded-2xl text-white mb-3" style={{ background: '#1a103f' }}>¡Sí, muéstrame! →</Button>
              <button onClick={() => goHome(false)} className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Ya sé usarla, entrar directo</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Onboarding() {
  return <OnboardingFlow />;
}
