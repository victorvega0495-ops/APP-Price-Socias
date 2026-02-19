import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTour, STEP_ROUTES } from '@/contexts/TourContext';
import { formatCurrency } from '@/lib/format';

const OVERLAY_BG = 'rgba(0,0,0,0.7)';

function WelcomeModal() {
  const { nextStep, skipTour } = useTour();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
      style={{ background: OVERLAY_BG }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-6 max-w-sm w-full text-center"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <p className="text-4xl mb-3">🎉</p>
        <h2 className="text-xl font-bold font-nunito mb-2" style={{ color: '#2D1B69' }}>
          ¡Tu app está lista!
        </h2>
        <p className="text-sm mb-6" style={{ color: '#8a8a9a' }}>
          Vamos a explorarla juntas. Te enseño cómo funciona cada sección en 2 minutos.
        </p>
        <Button
          onClick={nextStep}
          className="w-full h-12 rounded-xl text-white font-bold mb-3"
          style={{ background: '#6B2FA0' }}
        >
          ¡Vamos! →
        </Button>
        <button onClick={skipTour} className="text-sm font-medium" style={{ color: '#8a8a9a' }}>
          Saltar tour
        </button>
      </motion.div>
    </motion.div>
  );
}

function FinalModal() {
  const { nextStep } = useTour();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
      style={{ background: OVERLAY_BG }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-6 max-w-sm w-full text-center"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
      >
        <p className="text-4xl mb-3">🎊</p>
        <h2 className="text-xl font-bold font-nunito mb-2" style={{ color: '#2D1B69' }}>
          ¡Listo! Ya conoces tu app
        </h2>
        <p className="text-sm mb-6" style={{ color: '#8a8a9a' }}>
          Ahora sí, ¡a vender! 💪
        </p>
        <Button
          onClick={nextStep}
          className="w-full h-12 rounded-xl text-white font-bold"
          style={{ background: '#6B2FA0' }}
        >
          Empezar 🚀
        </Button>
      </motion.div>
    </motion.div>
  );
}

// Demo data cards for each section
function FinanzasDemo() {
  const { nextStep, skipTour } = useTour();
  return (
    <DemoOverlay
      title="Finanzas 💰"
      description="Aquí controlas tu dinero. Mira cómo funciona:"
      onNext={nextStep}
      onSkip={skipTour}
      stepLabel="1 de 4"
    >
      <div className="rounded-xl p-4 text-white text-sm space-y-2" style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}>
        <p className="text-xs opacity-70">Demo: Simulador de precio</p>
        <div className="space-y-1.5">
          <div className="flex justify-between"><span>👟 Costo Price:</span><span className="font-bold">$850</span></div>
          <div className="flex justify-between"><span>📈 Incremento 54%:</span><span className="font-bold">+$459</span></div>
          <div className="flex justify-between"><span>💰 Precio cliente:</span><span className="font-bold text-lg">{formatCurrency(1309)}</span></div>
        </div>
        <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
          <p className="text-xs opacity-70">Desglose 3C:</p>
          <div className="flex gap-2 mt-1">
            <div className="flex-1 rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <p className="text-[10px] opacity-70">Producto 65%</p>
              <p className="font-bold text-xs">{formatCurrency(851)}</p>
            </div>
            <div className="flex-1 rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <p className="text-[10px] opacity-70">Ganancia 30%</p>
              <p className="font-bold text-xs">{formatCurrency(393)}</p>
            </div>
            <div className="flex-1 rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <p className="text-[10px] opacity-70">Gastos 5%</p>
              <p className="font-bold text-xs">{formatCurrency(65)}</p>
            </div>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-center mt-2" style={{ color: '#8a8a9a' }}>
        ⚡ Esto es una demo — no se guarda en tu cuenta
      </p>
    </DemoOverlay>
  );
}

function VenderDemo() {
  const { nextStep, skipTour } = useTour();
  return (
    <DemoOverlay
      title="Vender 🛍️"
      description="Aquí registras cada venta que hagas."
      onNext={nextStep}
      onSkip={skipTour}
      stepLabel="2 de 4"
    >
      <div className="bg-white rounded-xl p-4 space-y-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <p className="text-xs font-semibold" style={{ color: '#6B2FA0' }}>Venta demo pre-llenada:</p>
        <div className="space-y-2 text-sm" style={{ color: '#2D1B69' }}>
          <div className="flex justify-between"><span>👩 Clienta:</span><span className="font-semibold">María ejemplo</span></div>
          <div className="flex justify-between"><span>👟 Producto:</span><span>1 par de tenis</span></div>
          <div className="flex justify-between"><span>💵 Costo Price:</span><span>$850</span></div>
          <div className="flex justify-between"><span>💰 Precio venta:</span><span className="font-bold" style={{ color: '#6B2FA0' }}>{formatCurrency(1309)}</span></div>
          <div className="flex justify-between"><span>📊 Tu ganancia:</span><span className="font-bold text-green-600">{formatCurrency(459)}</span></div>
        </div>
        <div className="rounded-lg p-2.5 text-center text-xs font-medium" style={{ background: '#F0E6F6', color: '#6B2FA0' }}>
          Tipo: Contado ✅
        </div>
      </div>
      <p className="text-[10px] text-center mt-2" style={{ color: '#8a8a9a' }}>
        ⚡ Esto es una demo — no se guarda en tu cuenta
      </p>
    </DemoOverlay>
  );
}

function ClientasDemo() {
  const { nextStep, skipTour } = useTour();
  return (
    <DemoOverlay
      title="Mis Clientas 👥"
      description="Aquí llevas el control de tus clientas, qué compran y quién te debe."
      onNext={nextStep}
      onSkip={skipTour}
      stepLabel="3 de 4"
    >
      <div className="bg-white rounded-xl p-4 space-y-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <p className="text-xs font-semibold" style={{ color: '#6B2FA0' }}>Clienta demo:</p>
        <div className="flex items-center gap-3 py-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#F0E6F6' }}>
            <span className="font-bold text-sm" style={{ color: '#6B2FA0' }}>ME</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm" style={{ color: '#2D1B69' }}>María ejemplo</p>
            <p className="text-xs" style={{ color: '#8a8a9a' }}>📱 55-1234-5678</p>
          </div>
        </div>
        <div className="rounded-lg p-2.5 text-xs space-y-1" style={{ background: '#F0FDF4' }}>
          <div className="flex justify-between" style={{ color: '#2D1B69' }}><span>Última compra:</span><span className="font-semibold">Hoy</span></div>
          <div className="flex justify-between" style={{ color: '#2D1B69' }}><span>Total comprado:</span><span className="font-semibold">{formatCurrency(1309)}</span></div>
          <div className="flex justify-between text-green-600"><span>Estado:</span><span className="font-semibold">Al corriente ✅</span></div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg py-2 text-center text-xs font-medium text-white" style={{ background: 'hsl(142,71%,35%)' }}>
            📱 WhatsApp
          </div>
          <div className="flex-1 rounded-lg py-2 text-center text-xs font-medium text-white" style={{ background: '#6B2FA0' }}>
            + Venta
          </div>
        </div>
      </div>
      <p className="text-[10px] text-center mt-2" style={{ color: '#8a8a9a' }}>
        ⚡ Esto es una demo — no se guarda en tu cuenta
      </p>
    </DemoOverlay>
  );
}

function RetoDemo() {
  const { nextStep, skipTour } = useTour();
  return (
    <DemoOverlay
      title="Tu Reto 🏆"
      description="Aquí ves tu progreso en el Reto de 0 a 10K. ¡Esta es tu meta!"
      onNext={nextStep}
      onSkip={skipTour}
      stepLabel="4 de 4"
      nextLabel="¡Entendido! 🎉"
    >
      <div className="rounded-xl p-4 text-white space-y-3" style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="font-bold">Reto 0 a 10,000</p>
            <p className="text-[10px] opacity-60">Programa oficial de Price Shoes</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs opacity-70"><span>Progreso demo</span><span>45%</span></div>
          <div className="w-full h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <div className="h-full rounded-full" style={{ width: '45%', background: 'linear-gradient(90deg, #C06DD6, #E8A5F0)' }} />
          </div>
          <p className="text-sm">{formatCurrency(4500)} vendido de {formatCurrency(10000)} necesario</p>
        </div>
        <div className="rounded-lg p-2.5 text-xs" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <p className="font-semibold">💪 ¡Casi lo tienes! Sigue así 🔥</p>
          <p className="opacity-70 mt-0.5">Te faltan {formatCurrency(5500)} · 15 días restantes</p>
        </div>
      </div>
      <p className="text-[10px] text-center mt-2" style={{ color: '#8a8a9a' }}>
        ⚡ Esto es una demo — no se guarda en tu cuenta
      </p>
    </DemoOverlay>
  );
}

// Shared overlay wrapper
function DemoOverlay({
  title,
  description,
  children,
  onNext,
  onSkip,
  stepLabel,
  nextLabel = 'Siguiente →',
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onNext: () => void;
  onSkip: () => void;
  stepLabel: string;
  nextLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: OVERLAY_BG }}
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pt-16 pb-32">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl font-bold font-nunito text-white mb-1">{title}</h2>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.7)' }}>{description}</p>
          {children}
        </motion.div>
      </div>

      {/* Fixed bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.9) 30%)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{stepLabel}</span>
          <button onClick={onSkip} className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Saltar tour
          </button>
        </div>
        <Button
          onClick={onNext}
          className="w-full h-12 rounded-xl text-white font-bold"
          style={{ background: '#6B2FA0' }}
        >
          {nextLabel}
        </Button>
      </div>
    </motion.div>
  );
}

export default function InteractiveTour() {
  const { tourStep, isTourActive } = useTour();
  const navigate = useNavigate();

  // Navigate to the correct route when step changes
  useEffect(() => {
    if (!isTourActive) return;
    const route = STEP_ROUTES[tourStep];
    if (route) {
      navigate(route, { replace: true });
    }
  }, [tourStep, isTourActive, navigate]);

  if (!isTourActive) return null;

  return (
    <AnimatePresence mode="wait">
      {tourStep === 'welcome' && <WelcomeModal key="welcome" />}
      {tourStep === 'finanzas' && <FinanzasDemo key="finanzas" />}
      {tourStep === 'vender' && <VenderDemo key="vender" />}
      {tourStep === 'clientas' && <ClientasDemo key="clientas" />}
      {tourStep === 'reto' && <RetoDemo key="reto" />}
      {tourStep === 'final' && <FinalModal key="final" />}
    </AnimatePresence>
  );
}
