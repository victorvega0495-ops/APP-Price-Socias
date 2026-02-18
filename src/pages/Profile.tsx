import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { UserCircle, ArrowLeft, AlertTriangle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partnerNumber, setPartnerNumber] = useState('');
  const [metodologia, setMetodologia] = useState('recomendada');
  const [pctReposicion, setPctReposicion] = useState(65);
  const [pctGanancia, setPctGanancia] = useState(30);
  const [pctAhorro, setPctAhorro] = useState(20);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setPhone(profile.phone ?? '');
      setPartnerNumber(profile.partner_number ?? '');
      setMetodologia(profile.metodologia ?? 'recomendada');
      setPctReposicion(profile.pct_reposicion ?? 65);
      setPctGanancia(profile.pct_ganancia ?? 30);
      setPctAhorro(profile.pct_ahorro ?? 20);
    }
  }, [profile]);

  const pctGastos = Math.max(0, 100 - pctReposicion - pctGanancia);
  const pctNecesidades = (100 - pctAhorro) * 0.625;
  const pctDeseos = (100 - pctAhorro) * 0.375;

  // Distribution per $1000
  const base = 1000;
  const dReposicion = base * (pctReposicion / 100);
  const dGanancia = base * (pctGanancia / 100);
  const dGastos = base * (pctGastos / 100);
  const dNecesidades = dGanancia * (pctNecesidades / 100);
  const dDeseos = dGanancia * (pctDeseos / 100);
  const dAhorro = dGanancia * (pctAhorro / 100);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({
      name,
      phone,
      partner_number: partnerNumber,
      metodologia,
      pct_reposicion: pctReposicion,
      pct_ganancia: pctGanancia,
      pct_ahorro: pctAhorro,
    }).eq('user_id', user.id);
    await refreshProfile();
    setSaving(false);
    toast({ title: '¡Perfil actualizado! ✅' });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <UserCircle className="w-6 h-6 text-gold" />
        <h1 className="text-xl font-bold">Mi Cuenta</h1>
      </div>

      {/* Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-5 shadow-card space-y-4"
      >
        <h2 className="text-sm font-semibold text-foreground">Mi información</h2>
        <div>
          <Label className="text-xs">Nombre</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Teléfono</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5512345678" />
        </div>
        <div>
          <Label className="text-xs">Número de socia</Label>
          <Input value={partnerNumber} onChange={(e) => setPartnerNumber(e.target.value)} placeholder="Ej: PS-12345" />
        </div>
      </motion.div>

      {/* Methodology Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl p-5 shadow-card space-y-4"
      >
        <h2 className="text-sm font-semibold text-foreground">Mi metodología financiera</h2>

        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="metodologia"
              checked={metodologia === 'recomendada'}
              onChange={() => setMetodologia('recomendada')}
              className="accent-gold w-4 h-4"
            />
            <span className="text-sm">✅ Recomendada por Price Shoes</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="metodologia"
              checked={metodologia === 'personalizada'}
              onChange={() => setMetodologia('personalizada')}
              className="accent-gold w-4 h-4"
            />
            <span className="text-sm">⚙️ Personalizada</span>
          </label>
        </div>

        {metodologia === 'personalizada' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-5 pt-2"
          >
            {/* Slider 1: Reposición */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Producto / CrediPrice</Label>
                <span className="text-xs font-bold text-navy">{pctReposicion}%</span>
              </div>
              <Slider
                value={[pctReposicion]}
                onValueChange={([v]) => setPctReposicion(v)}
                min={50}
                max={80}
                step={1}
                className="[&_[role=slider]]:bg-navy"
              />
              {pctReposicion < 65 && (
                <div className="flex items-start gap-2 bg-gold/10 rounded-lg p-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-gold-dark shrink-0 mt-0.5" />
                  <p className="text-[11px] text-foreground">⚠️ Bajar de 65% puede comprometer tu inventario</p>
                </div>
              )}
            </div>

            {/* Slider 2: Ganancia */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Tu ganancia personal</Label>
                <span className="text-xs font-bold text-navy">{pctGanancia}%</span>
              </div>
              <Slider
                value={[pctGanancia]}
                onValueChange={([v]) => setPctGanancia(v)}
                min={10}
                max={40}
                step={1}
                className="[&_[role=slider]]:bg-navy"
              />
              <p className="text-[11px] text-muted-foreground">
                Gastos del negocio: {pctGastos}%
              </p>
            </div>

            {/* Slider 3: Ahorro */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">De tu ganancia, ¿cuánto ahorras?</Label>
                <span className="text-xs font-bold text-navy">{pctAhorro}%</span>
              </div>
              <Slider
                value={[pctAhorro]}
                onValueChange={([v]) => setPctAhorro(v)}
                min={5}
                max={50}
                step={1}
                className="[&_[role=slider]]:bg-navy"
              />
            </div>

            {/* Distribution Panel */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gradient-navy rounded-xl p-4 space-y-2"
            >
              <p className="text-xs text-primary-foreground/70 font-medium">
                Así se distribuye cada $1,000 que vendes:
              </p>
              <div className="space-y-1.5 text-sm text-primary-foreground">
                <p>💼 Producto/CrediPrice: <span className="font-semibold">{formatCurrency(Math.round(dReposicion))}</span></p>
                <p>💰 Tu ganancia: <span className="font-semibold">{formatCurrency(Math.round(dGanancia))}</span></p>
                <div className="pl-5 space-y-0.5 text-xs text-primary-foreground/80">
                  <p>🏠 Necesidades ({Math.round(pctNecesidades)}%): {formatCurrency(Math.round(dNecesidades))}</p>
                  <p>✨ Deseos ({Math.round(pctDeseos)}%): {formatCurrency(Math.round(dDeseos))}</p>
                  <p>⭐ Ahorro/Sueños ({pctAhorro}%): {formatCurrency(Math.round(dAhorro))}</p>
                </div>
                <p>📊 Gastos negocio: <span className="font-semibold">{formatCurrency(Math.round(dGastos))}</span></p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-gradient-gold text-accent-foreground font-semibold h-12 rounded-xl"
      >
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </Button>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground py-3"
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </div>
  );
}
