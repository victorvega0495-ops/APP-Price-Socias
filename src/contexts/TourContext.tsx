import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type TourStep = 'idle' | 'welcome' | 'finanzas' | 'vender' | 'clientas' | 'reto' | 'final';

interface TourContextType {
  tourStep: TourStep;
  isTourActive: boolean;
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

const STEP_ORDER: TourStep[] = ['welcome', 'finanzas', 'vender', 'clientas', 'reto', 'final'];
const STEP_ROUTES: Record<string, string> = {
  finanzas: '/finanzas',
  vender: '/vender',
  clientas: '/clientas',
  reto: '/reto-guia',
  final: '/',
};

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [tourStep, setTourStep] = useState<TourStep>('idle');
  const { user, refreshProfile } = useAuth();

  const isTourActive = tourStep !== 'idle';

  const startTour = useCallback(() => {
    setTourStep('welcome');
  }, []);

  const completeTour = useCallback(async () => {
    setTourStep('idle');
    if (user) {
      await supabase.from('profiles').update({ tour_completed: true }).eq('user_id', user.id);
      await refreshProfile();
    }
  }, [user, refreshProfile]);

  const nextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(tourStep);
    if (currentIndex < 0) return;
    if (currentIndex >= STEP_ORDER.length - 1) {
      // Was on 'final', complete
      completeTour();
      return;
    }
    const next = STEP_ORDER[currentIndex + 1];
    setTourStep(next);
  }, [tourStep, completeTour]);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  return (
    <TourContext.Provider value={{ tourStep, isTourActive, startTour, nextStep, skipTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}

export { STEP_ROUTES };
