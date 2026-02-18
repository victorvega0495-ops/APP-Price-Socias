import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { AlertTriangle, LogOut, HelpCircle, Camera, Settings, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OnboardingFlow } from '@/pages/Onboarding';

const HEADER_GRADIENT = 'linear-gradient(145deg, #2D1B69 0%, #6B2FA0 45%, #C06DD6 100%)';
const CARD_SHADOW = '0 2px 12px rgba(0,0,0,0.07)';

const DEFAULT_MSG_COBRANZA = 'Hola [nombre], te recuerdo amablemente que tienes un saldo pendiente de [monto] 🙏 ¿Cuándo podemos coordinar tu pago? ¡Gracias!';
const DEFAULT_MSG_VENTA = 'Hola [nombre]! Te escribo porque acaban de llegar novedades que creo que te van a encantar 😍 ¿Te mando fotos?';
const DEFAULT_MSG_SALUDO = 'Hola [nombre]! ¿Cómo estás? Espero que todo esté muy bien 😊 Cualquier cosa que necesites aquí estoy.';

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
  const [reconfigOpen, setReconfigOpen] = useState(false);

  // WhatsApp message templates
  const [msgCobranza, setMsgCobranza] = useState(DEFAULT_MSG_COBRANZA);
  const [msgVenta, setMsgVenta] = useState(DEFAULT_MSG_VENTA);
  const [msgSaludo, setMsgSaludo] = useState(DEFAULT_MSG_SALUDO);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? ''); setPhone(profile.phone ?? ''); setPartnerNumber(profile.partner_number ?? '');
      setMetodologia(profile.metodologia ?? 'recomendada'); setPctReposicion(profile.pct_reposicion ?? 65);
      setPctGanancia(profile.pct_ganancia ?? 30); setPctAhorro(profile.pct_ahorro ?? 20);
      setAvatarPreview(profile.avatar_url ?? null);
      const p = profile as any;
      setMsgCobranza(p.msg_cobranza || DEFAULT_MSG_COBRANZA);
      setMsgVenta(p.msg_venta || DEFAULT_MSG_VENTA);
      setMsgSaludo(p.msg_saludo || DEFAULT_MSG_SALUDO);
    }
  }, [profile]);

  const initials = (profile?.name || 'S').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);
    try {
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl + '?t=' + Date.now();
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
      await refreshProfile();
      toast({ title: '¡Foto actualizada! 📷' });
    } catch (err: any) {
      toast({ title: 'Error al subir foto', description: err.message, variant: 'destructive' });
      setAvatarPreview(profile?.avatar_url ?? null);
    } finally { setUploadingAvatar(false); }
  };

  const pctGastos = Math.max(0, 100 - pctReposicion - pctGanancia);
  const pctNecesidades = (100 - pctAhorro) * 0.625;
  const pctDeseos = (100 - pctAhorro) * 0.375;
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
      name, phone, partner_number: partnerNumber, metodologia,
      pct_reposicion: pctReposicion, pct_ganancia: pctGanancia, pct_ahorro: pctAhorro,
      msg_cobranza: msgCobranza, msg_venta: msgVenta, msg_saludo: msgSaludo,
    } as any).eq('user_id', user.id);
    await refreshProfile();
    setSaving(false);
    toast({ title: '¡Perfil actualizado! ✅' });
  };

  const handleSignOut = async () => { await signOut(); navigate('/auth'); };

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-col items-center" style={{ background: HEADER_GRADIENT, padding: '48px 20px 28px' }}>
        {/* Avatar */}
        <div className="relative">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="w-24 h-24 rounded-full object-cover" style={{ border: '4px solid rgba(255,255,255,0.3)' }} />
          ) : (
            <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C06DD6, #9B59B6)', border: '4px solid rgba(255,255,255,0.3)' }}>
              <span className="text-white font-bold text-2xl font-nunito">{initials}</span>
            </div>
          )}
          {uploadingAvatar && <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
        </div>
        <h1 className="text-white mt-3 font-nunito" style={{ fontSize: '22px', fontWeight: 900 }}>{profile?.name || 'Socia'}</h1>
        {profile?.partner_number && <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Número de socia: {profile.partner_number}</p>}
        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-sm font-medium mt-3 px-4 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>
          <Camera className="w-4 h-4" /> Cambiar foto
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>

      {/* BODY */}
      <div className="px-4 pt-5 pb-4 space-y-5" style={{ background: '#F5F5F7', minHeight: 'calc(100vh - 260px)' }}>
        {/* Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-5 space-y-4" style={{ boxShadow: CARD_SHADOW }}>
          <h2 className="text-sm font-semibold" style={{ color: '#2D1B69' }}>Mi información</h2>
          <div><Label className="text-xs">Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label className="text-xs">Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5512345678" /></div>
          <div>
            <Label className="text-xs">Número de socia</Label>
            <Input value={partnerNumber} onChange={(e) => setPartnerNumber(e.target.value)} placeholder="Ej: PS-12345" />
            {!partnerNumber && <p className="text-[11px] mt-1" style={{ color: '#8a8a9a' }}>💡 Encuéntralo en tu credencial Price Shoes</p>}
          </div>
        </motion.div>

        {/* Methodology */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-5 space-y-4" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold" style={{ color: '#2D1B69' }}>Mi metodología financiera</h2>
            <TooltipProvider><Tooltip><TooltipTrigger asChild><button style={{ color: '#8a8a9a' }}><HelpCircle className="w-4 h-4" /></button></TooltipTrigger><TooltipContent side="bottom" className="max-w-[250px] bg-white border z-50"><p className="text-xs"><strong>Recomendada:</strong> 65% va a Price Shoes · 30% es tu ganancia · 5% son gastos</p></TooltipContent></Tooltip></TooltipProvider>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer"><input type="radio" name="metodologia" checked={metodologia === 'recomendada'} onChange={() => setMetodologia('recomendada')} className="w-4 h-4" style={{ accentColor: '#6B2FA0' }} /><span className="text-sm">✅ Recomendada por Price Shoes</span></label>
            <label className="flex items-center gap-3 cursor-pointer"><input type="radio" name="metodologia" checked={metodologia === 'personalizada'} onChange={() => setMetodologia('personalizada')} className="w-4 h-4" style={{ accentColor: '#6B2FA0' }} /><span className="text-sm">⚙️ Personalizada</span></label>
          </div>
          <button onClick={() => setReconfigOpen(true)} className="flex items-center gap-2 text-sm font-medium mt-2 px-4 py-2 rounded-xl w-full justify-center" style={{ background: '#F0E6F6', color: '#6B2FA0' }}>
            <Settings className="w-4 h-4" /> Reconfigurar mi metodología
          </button>

          {metodologia === 'personalizada' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-5 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-xs">Producto / CrediPrice</Label><span className="text-xs font-bold" style={{ color: '#2D1B69' }}>{pctReposicion}%</span></div>
                <Slider value={[pctReposicion]} onValueChange={([v]) => setPctReposicion(v)} min={50} max={80} step={1} />
                {pctReposicion < 65 && (<div className="flex items-start gap-2 rounded-lg p-2" style={{ background: '#F0E6F6' }}><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#6B2FA0' }} /><p className="text-[11px]" style={{ color: '#2D1B69' }}>⚠️ Bajar de 65% puede comprometer tu inventario</p></div>)}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-xs">Tu ganancia personal</Label><span className="text-xs font-bold" style={{ color: '#2D1B69' }}>{pctGanancia}%</span></div>
                <Slider value={[pctGanancia]} onValueChange={([v]) => setPctGanancia(v)} min={10} max={40} step={1} />
                <p className="text-[11px]" style={{ color: '#8a8a9a' }}>Gastos del negocio: {pctGastos}%</p>
                {pctGastos < 5 && (
                  <div className="flex items-start gap-2 rounded-lg p-2" style={{ background: '#FFF3E0' }}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                    <p className="text-[11px]" style={{ color: '#2D1B69' }}>⚠️ Recomendamos al menos 5% para gastos de tu negocio (envíos, bolsas, etc.)</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-xs">De tu ganancia, ¿cuánto ahorras?</Label><span className="text-xs font-bold" style={{ color: '#2D1B69' }}>{pctAhorro}%</span></div>
                <Slider value={[pctAhorro]} onValueChange={([v]) => setPctAhorro(v)} min={5} max={50} step={1} />
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-4 space-y-2 text-white" style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}>
                <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Así se distribuye cada $1,000 que vendes:</p>
                <div className="space-y-1.5 text-sm">
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

        {/* WhatsApp message templates */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-5 space-y-4" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" style={{ color: '#6B2FA0' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#2D1B69' }}>Mis mensajes de WhatsApp</h2>
          </div>
          <p className="text-[11px]" style={{ color: '#8a8a9a' }}>Personaliza los mensajes que envías a tus clientas. Usa [nombre] y [monto] como variables.</p>

          <div className="space-y-1">
            <Label className="text-xs">💰 Mensaje de cobranza</Label>
            <Textarea
              value={msgCobranza}
              onChange={e => setMsgCobranza(e.target.value)}
              rows={3}
              className="text-sm rounded-xl resize-none"
              style={{ borderColor: '#E8D5F5' }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">🛍️ Mensaje de venta</Label>
            <Textarea
              value={msgVenta}
              onChange={e => setMsgVenta(e.target.value)}
              rows={3}
              className="text-sm rounded-xl resize-none"
              style={{ borderColor: '#E8D5F5' }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">👋 Mensaje de saludo</Label>
            <Textarea
              value={msgSaludo}
              onChange={e => setMsgSaludo(e.target.value)}
              rows={3}
              className="text-sm rounded-xl resize-none"
              style={{ borderColor: '#E8D5F5' }}
            />
          </div>
        </motion.div>

        <Button onClick={handleSave} disabled={saving} className="w-full font-semibold h-12 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #C06DD6, #9B59B6)' }}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>

        <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 text-sm py-3" style={{ color: '#8a8a9a' }}>
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>

      {/* Reconfig Sheet */}
      <Sheet open={reconfigOpen} onOpenChange={setReconfigOpen}>
        <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-3xl overflow-auto">
          <SheetHeader className="sr-only"><SheetTitle>Reconfigurar metodología</SheetTitle></SheetHeader>
          <OnboardingFlow skipWelcome onComplete={() => setReconfigOpen(false)} initialValues={{ pctGanancia, pctAhorro, pctReposicion }} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
