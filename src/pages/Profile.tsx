import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { ArrowLeft, AlertTriangle, LogOut, HelpCircle, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partnerNumber, setPartnerNumber] = useState('');
  const [metodologia, setMetodologia] = useState('recomendada');
  const [pctReposicion, setPctReposicion] = useState(65);
  const [pctGanancia, setPctGanancia] = useState(30);
  const [pctAhorro, setPctAhorro] = useState(20);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setPhone(profile.phone ?? '');
      setPartnerNumber(profile.partner_number ?? '');
      setMetodologia(profile.metodologia ?? 'recomendada');
      setPctReposicion(profile.pct_reposicion ?? 65);
      setPctGanancia(profile.pct_ganancia ?? 30);
      setPctAhorro(profile.pct_ahorro ?? 20);
      setAvatarPreview(profile.avatar_url ?? null);
    }
  }, [profile]);

  const initials = (profile?.name || 'S')
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);

    try {
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl + '?t=' + Date.now();

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
      await refreshProfile();
      toast({ title: '¡Foto actualizada! 📷' });
    } catch (err: any) {
      toast({ title: 'Error al subir foto', description: err.message, variant: 'destructive' });
      setAvatarPreview(profile?.avatar_url ?? null);
    } finally {
      setUploadingAvatar(false);
    }
  };

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
        <h1 className="text-xl font-bold" style={{ color: '#2D1B69' }}>Mi Cuenta</h1>
      </div>

      {/* Avatar Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="relative">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover"
              style={{ border: '4px solid #E8D5F5' }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #C06DD6, #9B59B6)',
                border: '4px solid #E8D5F5',
              }}
            >
              <span className="text-white font-bold text-2xl" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {initials}
              </span>
            </div>
          )}
          {uploadingAvatar && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: '#6B2FA0' }}
        >
          <Camera className="w-4 h-4" />
          Cambiar foto
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </motion.div>

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
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Mi metodología financiera</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px] bg-card text-foreground border border-border z-50">
                <p className="text-xs">
                  <strong>Recomendada:</strong> 65% va a Price Shoes · 30% es tu ganancia · 5% son gastos
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="metodologia" checked={metodologia === 'recomendada'} onChange={() => setMetodologia('recomendada')} className="accent-gold w-4 h-4" />
            <span className="text-sm">✅ Recomendada por Price Shoes</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="metodologia" checked={metodologia === 'personalizada'} onChange={() => setMetodologia('personalizada')} className="accent-gold w-4 h-4" />
            <span className="text-sm">⚙️ Personalizada</span>
          </label>
        </div>

        {metodologia === 'personalizada' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-5 pt-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Producto / CrediPrice</Label>
                <span className="text-xs font-bold" style={{ color: '#2D1B69' }}>{pctReposicion}%</span>
              </div>
              <Slider value={[pctReposicion]} onValueChange={([v]) => setPctReposicion(v)} min={50} max={80} step={1} className="[&_[role=slider]]:bg-navy" />
              {pctReposicion < 65 && (
                <div className="flex items-start gap-2 rounded-lg p-2" style={{ background: 'rgba(192,109,214,0.1)' }}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#6B2FA0' }} />
                  <p className="text-[11px] text-foreground">⚠️ Bajar de 65% puede comprometer tu inventario</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Tu ganancia personal</Label>
                <span className="text-xs font-bold" style={{ color: '#2D1B69' }}>{pctGanancia}%</span>
              </div>
              <Slider value={[pctGanancia]} onValueChange={([v]) => setPctGanancia(v)} min={10} max={40} step={1} className="[&_[role=slider]]:bg-navy" />
              <p className="text-[11px] text-muted-foreground">Gastos del negocio: {pctGastos}%</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">De tu ganancia, ¿cuánto ahorras?</Label>
                <span className="text-xs font-bold" style={{ color: '#2D1B69' }}>{pctAhorro}%</span>
              </div>
              <Slider value={[pctAhorro]} onValueChange={([v]) => setPctAhorro(v)} min={5} max={50} step={1} className="[&_[role=slider]]:bg-navy" />
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-4 space-y-2" style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}>
              <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Así se distribuye cada $1,000 que vendes:
              </p>
              <div className="space-y-1.5 text-sm text-white">
                <p>💼 Producto/CrediPrice: <span className="font-semibold">{formatCurrency(Math.round(dReposicion))}</span></p>
                <p>💰 Tu ganancia: <span className="font-semibold">{formatCurrency(Math.round(dGanancia))}</span></p>
                <div className="pl-5 space-y-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
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
        className="w-full font-semibold h-12 rounded-xl text-white"
        style={{ background: 'linear-gradient(135deg, #C06DD6, #9B59B6)' }}
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
