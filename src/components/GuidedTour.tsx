import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface TourStep {
  selector: string;
  text: string;
}

const TOUR_STEPS: TourStep[] = [
  { selector: '[data-tour="avatar"]', text: 'Toca aquí para editar tu perfil 📸' },
  { selector: '[data-tour="negocio"]', text: 'Aquí ves tus ventas del mes 💰' },
  { selector: '[data-tour="finanzas"]', text: 'Ve cómo se divide tu dinero 📊' },
  { selector: '[data-tour="clientas"]', text: 'Gestiona cobros por aquí 👥' },
  { selector: '[data-tour="fab"]', text: 'Registra una venta rápido aquí 🛍️' },
];

interface GuidedTourProps {
  active: boolean;
  onFinish: () => void;
}

export default function GuidedTour({ active, onFinish }: GuidedTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    if (!active) return;
    const el = document.querySelector(TOUR_STEPS[step]?.selector);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [step, active]);

  useEffect(() => {
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [updateRect]);

  if (!active) return null;

  const isLast = step === TOUR_STEPS.length - 1;
  const currentStep = TOUR_STEPS[step];

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setStep(s => s + 1);
    }
  };

  // Position tooltip below or above the element
  const tooltipTop = rect ? rect.bottom + 12 : '50%';
  const tooltipLeft = rect ? Math.min(rect.left + rect.width / 2, window.innerWidth - 140) : '50%';

  return (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={handleNext}
      >
        {/* Highlight cutout */}
        {rect && (
          <div
            className="absolute rounded-xl"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
              background: 'transparent',
              zIndex: 10000,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute px-4"
          style={{
            top: typeof tooltipTop === 'number' ? tooltipTop : tooltipTop,
            left: 0,
            right: 0,
            zIndex: 10001,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-2xl p-4 mx-auto max-w-xs"
            style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
          >
            <p className="text-sm font-medium mb-3 font-nunito" style={{ color: '#2D1B69' }}>
              {currentStep.text}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: '#8a8a9a' }}>
                {step + 1} / {TOUR_STEPS.length}
              </span>
              <Button
                size="sm"
                className="text-white font-semibold rounded-xl"
                style={{ background: '#2D1B69' }}
                onClick={handleNext}
              >
                {isLast ? '¡Entendido! 🎉' : 'Siguiente →'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
