import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';

const HEADER_GRADIENT = 'linear-gradient(145deg, #2D1B69 0%, #6B2FA0 45%, #C06DD6 100%)';
const CARD_SHADOW = '0 2px 12px rgba(0,0,0,0.07)';

const cleanPhone = (phone: string | null): string | null => { if (!phone) return null; const digits = phone.replace(/\D/g, '').slice(-10); return digits.length === 10 ? digits : null; };
const waUrl = (phone: string | null, text: string): string | null => { const clean = cleanPhone(phone); if (!clean) return null; return `https://wa.me/52${clean}?text=${encodeURIComponent(text)}`; };

const CATEGORY_SUGGESTIONS: Record<string, string> = {
  'Tenis': 'Bolso, Blusa o Jeans', 'Botines': 'Bolso, Blusa o Jeans', 'Botas': 'Bolso, Blusa o Jeans', 'Tacones': 'Bolso, Blusa o Jeans', 'Sandalias': 'Bolso, Blusa o Jeans', 'Flats/Zapatillas': 'Bolso, Blusa o Jeans', 'Mocasines/Loafers': 'Bolso, Blusa o Jeans', 'Zapato casual': 'Bolso, Blusa o Jeans', 'Infantil': 'Bolso, Blusa o Jeans', 'Jeans': 'Botines, Tacones o Bolso', 'Blusa/Top': 'Botines, Tacones o Bolso', 'Vestido': 'Botines, Tacones o Bolso', 'Falda': 'Botines, Tacones o Bolso', 'Chamarra/Chaqueta': 'Jeans, Botas o Blusa', 'Suéter/Hoodie': 'Jeans, Botas o Blusa', 'Bolso/Mochila': 'Blusa o Vestido', 'Bisutería/Accesorios': 'Blusa o Vestido', 'Reloj': 'Blusa o Vestido', 'Lencería': 'Fragancia o Maquillaje', 'Pijama': 'Fragancia o Maquillaje', 'Traje de baño': 'Fragancia o Maquillaje', 'Playera': 'Tenis o Chamarra', 'Jeans hombre': 'Tenis o Chamarra', 'Bermuda/Short': 'Tenis o Chamarra',
};
const getSuggestion = (category: string): string => CATEGORY_SUGGESTIONS[category] || 'algo nuevo de temporada';
const MEDAL = ['🥇', '🥈', '🥉'];
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
interface ClientInfo { id: string; name: string; phone: string | null; }

export default function Tips() {
  const { user, profile } = useAuth();
  const pctGanancia = (profile?.pct_ganancia ?? 30) / 100;
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [allPurchases, setAllPurchases] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [cRes, pRes, apRes, siRes] = await Promise.all([
        supabase.from('clients').select('id, name, phone').eq('user_id', user.id),
        supabase.from('purchases').select('id, client_id, amount, purchase_date, cost_price').eq('user_id', user.id).gte('purchase_date', monthStart),
        supabase.from('purchases').select('id, client_id, purchase_date').eq('user_id', user.id).order('purchase_date', { ascending: true }),
        supabase.from('sale_items').select('purchase_id, category, created_at'),
      ]);
      setClients(cRes.data || []); setPurchases(pRes.data || []); setAllPurchases(apRes.data || []); setSaleItems(siRes.data || []); setLoading(false);
    };
    load();
  }, [user, monthStart]);

  const clientMap = useMemo(() => { const m: Record<string, ClientInfo> = {}; clients.forEach(c => { m[c.id] = c; }); return m; }, [clients]);

  const topClients = useMemo(() => {
    const grouped: Record<string, { total: number; count: number }> = {};
    purchases.forEach(p => { if (!p.client_id) return; if (!grouped[p.client_id]) grouped[p.client_id] = { total: 0, count: 0 }; grouped[p.client_id].total += Number(p.amount); grouped[p.client_id].count += 1; });
    return Object.entries(grouped).sort((a, b) => b[1].total - a[1].total).slice(0, 3).map(([clientId, data]) => ({ client: clientMap[clientId], ...data })).filter(x => x.client);
  }, [purchases, clientMap]);

  const cycleClients = useMemo(() => {
    const byClient: Record<string, string[]> = {};
    allPurchases.forEach(p => { if (!p.client_id) return; if (!byClient[p.client_id]) byClient[p.client_id] = []; byClient[p.client_id].push(p.purchase_date); });
    const results: { client: ClientInfo; cycleDays: number; daysUntilNext: number }[] = [];
    const today = new Date();
    Object.entries(byClient).forEach(([clientId, dates]) => {
      if (dates.length < 2) return; const sorted = dates.sort(); let totalGap = 0;
      for (let i = 1; i < sorted.length; i++) totalGap += (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
      const cycleDays = Math.round(totalGap / (sorted.length - 1)); if (cycleDays <= 0) return;
      const lastDate = new Date(sorted[sorted.length - 1]); const daysSinceLast = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)); const daysUntilNext = cycleDays - daysSinceLast;
      if (daysUntilNext >= -3 && daysUntilNext <= 3 && clientMap[clientId]) results.push({ client: clientMap[clientId], cycleDays, daysUntilNext });
    });
    return results;
  }, [allPurchases, clientMap]);

  const crossSell = useMemo(() => {
    const purchaseMap: Record<string, any> = {}; allPurchases.forEach(p => { purchaseMap[p.id] = p; });
    const clientLastCategory: Record<string, { category: string; date: string }> = {};
    saleItems.forEach(si => { const purchase = purchaseMap[si.purchase_id]; if (!purchase || !purchase.client_id) return; const cid = purchase.client_id; if (!clientLastCategory[cid] || purchase.purchase_date > clientLastCategory[cid].date) clientLastCategory[cid] = { category: si.category, date: purchase.purchase_date }; });
    return Object.entries(clientLastCategory).sort((a, b) => b[1].date.localeCompare(a[1].date)).slice(0, 3).map(([clientId, data]) => { const client = clientMap[clientId]; if (!client) return null; const daysAgo = Math.round((new Date().getTime() - new Date(data.date).getTime()) / (1000 * 60 * 60 * 24)); return { client, category: data.category, daysAgo, suggestion: getSuggestion(data.category) }; }).filter(Boolean) as { client: ClientInfo; category: string; daysAgo: number; suggestion: string }[];
  }, [allPurchases, saleItems, clientMap]);

  const stats = useMemo(() => {
    const catCount: Record<string, number> = {}; const monthPurchaseIds = new Set(purchases.map(p => p.id));
    saleItems.forEach(si => { if (monthPurchaseIds.has(si.purchase_id)) catCount[si.category] = (catCount[si.category] || 0) + 1; });
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
    const dayCount: Record<number, number> = {}; purchases.forEach(p => { const d = new Date(p.purchase_date).getDay(); dayCount[d] = (dayCount[d] || 0) + 1; }); const bestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
    const withCost = purchases.filter(p => p.cost_price && Number(p.cost_price) > 0); let avgMargin: number | null = null;
    if (withCost.length > 0) { const totalMargin = withCost.reduce((acc, p) => acc + ((Number(p.amount) - Number(p.cost_price)) / Number(p.amount)) * 100, 0); avgMargin = Math.round(totalMargin / withCost.length); }
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); const activeIds = new Set<string>(); purchases.forEach(p => { if (p.client_id && new Date(p.purchase_date) >= thirtyDaysAgo) activeIds.add(p.client_id); });
    return { topCat, bestDay, avgMargin, activeClients: activeIds.size };
  }, [purchases, saleItems]);

  const openWa = (phone: string | null, text: string) => { const url = waUrl(phone, text); if (!url) { toast({ title: 'Sin teléfono', description: 'Esta clienta no tiene teléfono registrado', variant: 'destructive' }); return; } window.open(url, '_blank', 'noopener'); };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: '#C06DD6', borderTopColor: 'transparent' }} /></div>;

  const targetMargin = Math.round(pctGanancia * 100);
  const marginColor = stats.avgMargin === null ? '#8a8a9a' : stats.avgMargin >= targetMargin ? '#16a34a' : stats.avgMargin >= targetMargin - 14 ? '#ca8a04' : '#dc2626';
  const marginIcon = stats.avgMargin === null ? '' : stats.avgMargin >= targetMargin ? '✅' : stats.avgMargin >= targetMargin - 14 ? '⚠️' : '🔴';
  const marginLabel = stats.avgMargin === null ? '' : stats.avgMargin >= targetMargin ? '¡Excelente margen!' : stats.avgMargin >= targetMargin - 14 ? 'Puedes mejorar' : 'Revisa tus precios';

  return (
    <div>
      {/* HEADER */}
      <div style={{ background: HEADER_GRADIENT, padding: '48px 20px 24px' }}>
        <div className="flex items-center gap-2 mb-2">
          <img src="/logo-um.png" alt="UM" className="h-10 object-contain" />
          <span className="font-nunito font-semibold" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inteligencia de negocio</span>
        </div>
        <h1 className="text-white" style={{ fontFamily: 'Nunito, sans-serif', fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>Mis Tips 💡</h1>
      </div>

      {/* BODY */}
      <div className="px-4 pt-5 pb-4 space-y-8" style={{ background: '#F5F5F7', minHeight: 'calc(100vh - 140px)' }}>
        {/* Top clientas */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: '#2D1B69' }}>🏅 Tus mejores clientas este mes</h2>
          {topClients.length === 0 ? <p className="text-sm" style={{ color: '#8a8a9a' }}>Aún no tienes ventas registradas este mes</p> : (
            topClients.map((tc, i) => (
              <div key={tc.client.id} className="bg-white rounded-2xl p-4 flex items-center gap-3" style={{ boxShadow: CARD_SHADOW }}>
                <span className="text-2xl">{MEDAL[i]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: '#2D1B69' }}>{tc.client.name}</p>
                  <p className="font-bold text-base" style={{ color: '#C06DD6', fontFamily: 'Nunito, sans-serif' }}>{formatCurrency(tc.total)}</p>
                  <p className="text-xs" style={{ color: '#8a8a9a' }}>{tc.count} compra{tc.count !== 1 ? 's' : ''}</p>
                </div>
                <Button size="sm" className="text-white shrink-0" style={{ background: 'hsl(142,71%,35%)' }} onClick={() => openWa(tc.client.phone, `Hola ${tc.client.name}, ¡gracias por tu preferencia! Eres una de mis mejores clientas este mes 😊 ¡Siempre tengo lo mejor para ti!`)}>
                  <MessageCircle className="w-4 h-4 mr-1" /> Agradécele 💜
                </Button>
              </div>
            ))
          )}
        </section>

        {/* Cycle */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: '#2D1B69' }}>⏰ Momento de escribirles</h2>
          {cycleClients.length === 0 ? <p className="text-sm" style={{ color: '#8a8a9a' }}>Aún no hay suficiente historial para detectar patrones. ¡Sigue registrando tus ventas! 📊</p> : (
            cycleClients.map(cc => (
              <div key={cc.client.id} className="bg-white rounded-2xl p-4 space-y-2" style={{ boxShadow: CARD_SHADOW }}>
                <p className="font-medium text-sm" style={{ color: '#2D1B69' }}>{cc.client.name}</p>
                {cc.daysUntilNext >= 0 ? <p className="text-xs" style={{ color: '#8a8a9a' }}>Suele comprarte cada {cc.cycleDays} días. ¡En {cc.daysUntilNext} días es su momento! 🎯</p> : <p className="text-xs" style={{ color: '#8a8a9a' }}>Lleva {Math.abs(cc.daysUntilNext)} días extra sin comprar. ¡Escríbele hoy! ⏰</p>}
                <Button size="sm" className="text-white" style={{ background: 'hsl(142,71%,35%)' }} onClick={() => openWa(cc.client.phone, `Hola ${cc.client.name}, ¡ya tengo novedades que te van a encantar! ¿Cuándo te puedo mostrar lo nuevo? 😊`)}>
                  <MessageCircle className="w-4 h-4 mr-1" /> Escribirle
                </Button>
              </div>
            ))
          )}
        </section>

        {/* Cross-sell */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: '#2D1B69' }}>🛍️ Oportunidades de venta</h2>
          {crossSell.length === 0 ? <p className="text-sm" style={{ color: '#8a8a9a' }}>Registra más ventas con categoría para ver sugerencias</p> : (
            <>
              {crossSell.map(cs => (
                <div key={cs.client.id} className="bg-white rounded-2xl p-4 space-y-2" style={{ boxShadow: CARD_SHADOW }}>
                  <p className="font-medium text-sm" style={{ color: '#2D1B69' }}>{cs.client.name}</p>
                  <p className="text-xs" style={{ color: '#8a8a9a' }}>{cs.client.name} compró {cs.category} {cs.daysAgo === 1 ? 'hace 1 día' : `hace ${cs.daysAgo} días`}.</p>
                  <p className="text-xs" style={{ color: '#8a8a9a' }}>Podrías ofrecerle <span className="font-medium" style={{ color: '#2D1B69' }}>{cs.suggestion}</span> para complementar su look 👗</p>
                  <Button size="sm" className="text-white" style={{ background: 'hsl(142,71%,35%)' }} onClick={() => openWa(cs.client.phone, `Hola ${cs.client.name}, vi que te llevaste ${cs.category} y tengo algo que te va a encantar para complementarlo 😍 ¿Te cuento?`)}>
                    <MessageCircle className="w-4 h-4 mr-1" /> Ofrecerle
                  </Button>
                </div>
              ))}
              <p className="text-[10px]" style={{ color: '#8a8a9a' }}>💡 Próximamente: recomendaciones personalizadas de Price Shoes</p>
            </>
          )}
        </section>

        {/* Stats */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: '#2D1B69' }}>📊 Tu resumen del mes</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center space-y-1" style={{ boxShadow: CARD_SHADOW }}>
              <p className="text-xs" style={{ color: '#8a8a9a' }}>Producto estrella</p>
              {stats.topCat ? <p className="font-bold text-sm" style={{ color: '#2D1B69' }}>{stats.topCat[0]}</p> : <p className="text-[10px]" style={{ color: '#8a8a9a' }}>Registra ventas con categorías ⭐</p>}
            </div>
            <div className="bg-white rounded-2xl p-4 text-center space-y-1" style={{ boxShadow: CARD_SHADOW }}>
              <p className="text-xs" style={{ color: '#8a8a9a' }}>Día con más ventas</p>
              {stats.bestDay ? <p className="font-bold text-sm" style={{ color: '#2D1B69' }}>Vendes más los {DAY_NAMES[Number(stats.bestDay[0])]}</p> : <p className="text-[10px]" style={{ color: '#8a8a9a' }}>Próximamente</p>}
            </div>
            <div className="bg-white rounded-2xl p-4 text-center space-y-1" style={{ boxShadow: CARD_SHADOW }}>
              <p className="text-xs" style={{ color: '#8a8a9a' }}>Margen promedio</p>
              {stats.avgMargin !== null ? (<><p className="font-bold text-lg" style={{ color: marginColor, fontFamily: 'Nunito, sans-serif' }}>{stats.avgMargin}%</p><p className="text-[10px]">{marginIcon} {marginLabel}</p></>) : <p className="text-[10px]" style={{ color: '#8a8a9a' }}>Agrega costo al registrar 💡</p>}
            </div>
            <div className="bg-white rounded-2xl p-4 text-center space-y-1" style={{ boxShadow: CARD_SHADOW }}>
              <p className="text-xs" style={{ color: '#8a8a9a' }}>Clientas activas</p>
              <p className="font-bold text-lg" style={{ color: '#2D1B69', fontFamily: 'Nunito, sans-serif' }}>{stats.activeClients}</p>
              <p className="text-[10px]" style={{ color: '#8a8a9a' }}>clientas activas este mes</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
