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
}

export function OnboardingFlow({ skipWelcome = false, onComplete }: OnboardingFlowProps) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(skipWelcome ? 1 : 0);
  const [compraTipo, setCompraTipo] = useState<string | null>(null);
  const [pctGanancia, setPctGanancia] = useState(30);
  const [wantsToSave, setWantsToSave] = useState<boolean | null>(null);
  const [pctAhorro, setPctAhorro] = useState(20);
  const [saving, setSaving] = useState(false);

  const totalSteps = skipWelcome ? 4 : 5;
  const pctGastos = 5;
  const pctReposicion = 100 - pctGanancia - pctGastos;

  // Calculations based on $1000 sale
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

  const profitMessage = () => {
    if (pctGanancia >= 35) return { icon: '✅', text: 'Excelente margen. Puedes crecer rápido tu negocio.', color: '#22C55E' };
    if (pctGanancia >= 25) return { icon: '👍', text: 'Buen margen. Competitivo y rentable.', color: '#6B2FA0' };
    if (pctGanancia >= 15) return { icon: '⚠️', text: 'Margen bajo. Necesitarás vender más volumen para alcanzar tus metas.', color: '#F59E0B' };
    return { icon: '🚨', text: 'Margen muy bajo. Con esto será difícil cubrir tus gastos y llegar a tu meta del Reto.', color: '#EF4444' };
  };

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
    await refreshProfile();
    setSaving(false);
    toast({ title: '¡Configuración lista! 🎉' });
    if (onComplete) {
      onComplete();
    } else {
      navigate('/');
    }
  };

  const canGoNext = () => {
    if (step === 1) return compraTipo !== null;
    if (step === 3 && skipWelcome) return wantsToSave !== null;
    if (step === 3 && !skipWelcome) return wantsToSave !== null;
    return true;
  };

  const stepIndex = skipWelcome ? step - 1 : step;
  const progressWidth = ((stepIndex + 1) / totalSteps) * 100;

  const compraOptions = [
    { value: 'contado', emoji: '💵', title: 'Pago de contado', sub: 'Pagas el catálogo completo' },
    { value: 'crediprice', emoji: '💳', title: 'Con CrediPrice', sub: 'Pagas en parcialidades' },
    { value: 'mixto', emoji: '🔀', title: 'Mitad y mitad', sub: 'Dependiendo del pedido' },
  ];

  const msg = profitMessage();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F5F7' }}>
      {/* Header */}
      {step > 0 && (
        <div style={{ background: HEADER_GRADIENT, padding: '48px 20px 20px' }}>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setStep(s => s - 1)} className="text-white/70">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-white text-lg font-bold" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {step === 1 && '¿Cómo compras? 🛒'}
              {step === 2 && 'Tu ganancia 💰'}
              {step === 3 && '¿Quieres ahorrar? ⭐'}
              {step === 4 && 'Tu negocio 🚀'}
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
              <img src="/logo-um.png" alt="UM" className="h-12 object-contain mb-4" />
              <img src="/logo-price.png" alt="Price Shoes" className="h-8 object-contain mb-8" style={{ opacity: 0.7, filter: 'brightness(0) invert(1)' }} />
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

          {/* STEP 2 — Profit percentage */}
          {step === 2 && (() => {
            const reposicionDecimal = 1 - pctGanancia / 100 - 0.05;
            const incremento = Math.round(((1 / reposicionDecimal) - 1) * 100);
            const incrementoMsg = incremento >= 50
              ? { icon: '✅', text: `Con +${incremento}% de incremento cubres todo: producto, ganancia y gastos. ¡Vas muy bien!`, color: '#22C55E' }
              : incremento >= 35
              ? { icon: '👍', text: `Con +${incremento}% de incremento tendrás ganancia pero ojo: revisa que cubras tus gastos.`, color: '#6B2FA0' }
              : { icon: '⚠️', text: `Con solo +${incremento}% de incremento puede que no alcance para reponer tu producto. Considera subir tu precio de venta.`, color: '#F59E0B' };

            return (
            <motion.div key="s2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="flex-1 px-5 pt-6 pb-8 flex flex-col overflow-y-auto">
              <p className="text-sm font-semibold mb-1" style={{ color: '#2D1B69' }}>Primero separemos tu negocio</p>
              <p className="text-xs mb-4" style={{ color: '#8a8a9a' }}>Ajusta el slider y ve el impacto en tiempo real.</p>

              {/* Explicación método recomendado */}
              <div className="rounded-2xl p-4 mb-4 text-white text-xs space-y-2" style={{ background: 'linear-gradient(135deg, #1a103f, #2D1B69)' }}>
                <p className="font-semibold text-sm">💡 El método recomendado por Price Shoes:</p>
                <div className="space-y-1 pl-1">
                  <p>• 65% → Repones tu producto (CrediPrice)</p>
                  <p>• 30% → Es tu ganancia personal</p>
                  <p>• 5% → Gastos de tu negocio</p>
                </div>
                <p className="pt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Para lograr esto, debes cobrarle a tu clienta un 54% más de lo que te costó el producto.</p>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Ejemplo: si pagaste $650, cóbrale $1,000</p>
              </div>

              <div className="bg-white rounded-2xl p-5 space-y-4" style={{ boxShadow: CARD_SHADOW }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: '#2D1B69' }}>Tu ganancia</span>
                  <span className="text-xl font-black font-nunito" style={{ color: '#6B2FA0' }}>{pctGanancia}%</span>
                </div>
                <Slider value={[pctGanancia]} onValueChange={([v]) => setPctGanancia(v)} min={10} max={50} step={1} />
                {pctGanancia > 30 && (
                  <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background: '#FFF3E0' }}>
                    <span className="text-sm">⚠️</span>
                    <p className="text-[11px]" style={{ color: '#2D1B69' }}>Recomendamos al menos 5% para gastos de tu negocio (envíos, bolsas, etc.). Con {pctGanancia}% de ganancia tu reposición baja a {100 - pctGanancia - 5}%.</p>
                  </div>
                )}
                {/* Incremento dinámico */}
                <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: incrementoMsg.color + '15' }}>
                  <span className="text-lg">{incrementoMsg.icon}</span>
                  <p className="text-xs" style={{ color: '#2D1B69' }}>{incrementoMsg.text}</p>
                </div>
              </div>

              {/* Impact card */}
              <div className="mt-4 rounded-2xl p-5 text-white space-y-3" style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}>
                <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>Si vendes $1,000:</p>
                <div className="space-y-2 text-sm">
                  <p>💼 Producto/CrediPrice: <span className="font-bold">{formatCurrency(Math.round(costoProducto))}</span></p>
                  <p>💰 Tu ganancia: <span className="font-bold">{formatCurrency(Math.round(ganancia))}</span></p>
                  <p>📊 Gastos negocio: <span className="font-bold">{formatCurrency(Math.round(gastos))}</span></p>
                </div>
                <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>🏷️ Por cada ${Math.round(costoProducto)} que pagas a Price, le cobras a tu clienta:</p>
                  <p className="text-lg font-black font-nunito mt-1">{formatCurrency(Math.round(precioSugerido))}</p>
                </div>
              </div>

              <div className="flex-1" />
              <Button onClick={() => setStep(3)} className="w-full h-12 rounded-xl text-white font-semibold mt-4" style={{ background: '#6B2FA0' }}>Siguiente →</Button>
            </motion.div>
            );
          })()}

          {/* STEP 3 — Savings */}
          {step === 3 && (() => {
            const metaVentasMes = 33333;
            const gananciaMes = metaVentasMes * (pctGanancia / 100);
            const ahorroMes = gananciaMes * (pctAhorro / 100);

            return (
            <motion.div key="s3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="flex-1 px-5 pt-6 pb-8 flex flex-col overflow-y-auto">
              <p className="text-sm font-semibold mb-1" style={{ color: '#2D1B69' }}>De tu ganancia del {pctGanancia}%, ¿cuánto quieres apartar para tus sueños?</p>
              <p className="text-xs mb-5" style={{ color: '#8a8a9a' }}>Ahorrar te acerca a tu Reto más rápido.</p>

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
                      <p className="text-xs font-semibold" style={{ color: '#2D1B69' }}>Si vendes {formatCurrency(metaVentasMes)} al mes (meta del Reto):</p>
                      <div className="space-y-1 text-xs" style={{ color: '#2D1B69' }}>
                        <p>⭐ Ahorras: <strong>{formatCurrency(Math.round(ahorroMes))}</strong> al mes</p>
                        <p>📅 En 12 meses: <strong>{formatCurrency(Math.round(ahorroMes * 12))}</strong></p>
                        <p>🏆 Tu Reto te da: <strong>{formatCurrency(Math.round(ahorroMes))}</strong> directo a tus sueños este mes</p>
                      </div>
                      <div className="pt-2 border-t" style={{ borderColor: 'rgba(45,27,105,0.1)' }}>
                        <p className="text-[11px]" style={{ color: '#8a8a9a' }}>
                          🏠 Necesidades {formatCurrency(Math.round(montoNecesidades))} · ✨ Deseos {formatCurrency(Math.round(montoDeseos))} · ⭐ Ahorro {formatCurrency(Math.round(montoAhorro))}
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

              <div className="flex-1" />
              <Button onClick={() => setStep(4)} disabled={wantsToSave === null} className="w-full h-12 rounded-xl text-white font-semibold mt-4" style={{ background: '#6B2FA0' }}>Siguiente →</Button>
            </motion.div>
            );
          })()}

          {/* STEP 4 — Summary */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="flex-1 px-5 pt-6 pb-8 flex flex-col">
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
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Onboarding() {
  return <OnboardingFlow />;
}
