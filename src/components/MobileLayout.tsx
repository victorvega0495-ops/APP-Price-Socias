import { NavLink, useLocation } from 'react-router-dom';
import { Home, DollarSign, Users, ShoppingBag, Trophy, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const tabs = [
  { to: '/', icon: Home, label: 'Inicio' },
  { to: '/finanzas', icon: DollarSign, label: 'Finanzas' },
  { to: '/vender', icon: ShoppingBag, label: 'Vender' },
  { to: '/clientas', icon: Users, label: 'Clientas' },
  { to: '/mi-reto', icon: Trophy, label: 'Mi Reto' },
];

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);

  const fabActions = [
    { label: 'Registrar venta', path: '/vender', icon: ShoppingBag },
    { label: 'Agregar clienta', path: '/clientas?add=true', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="max-w-lg mx-auto">{children}</main>

      {/* FAB */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col-reverse items-end gap-2">
        {fabOpen && fabActions.map((action) => (
          <button
            key={action.label}
            onClick={() => { navigate(action.path); setFabOpen(false); }}
            className="flex items-center gap-2 bg-card shadow-elevated rounded-full pl-4 pr-3 py-2.5 text-sm font-medium text-foreground animate-slide-up"
          >
            {action.label}
            <action.icon className="w-4 h-4 text-navy" />
          </button>
        ))}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className={`w-14 h-14 rounded-full bg-gradient-gold shadow-gold flex items-center justify-center transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`}
        >
          <Plus className="w-6 h-6 text-accent-foreground" />
        </button>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated z-40">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.to || 
              (tab.to !== '/' && location.pathname.startsWith(tab.to));
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-0"
              >
                <tab.icon
                  className={`w-5 h-5 transition-colors ${isActive ? 'text-navy' : 'text-muted-foreground'}`}
                />
                <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-navy' : 'text-muted-foreground'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-gold mt-0.5" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
