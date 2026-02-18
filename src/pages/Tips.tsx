import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';

const cleanPhone = (phone: string | null): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? digits : null;
};

const waUrl = (phone: string | null, text: string): string | null => {
  const clean = cleanPhone(phone);
  if (!clean) return null;
  return `https://wa.me/52${clean}?text=${encodeURIComponent(text)}`;
};

const CATEGORY_SUGGESTIONS: Record<string, string> = {
  'Tenis': 'Bolso, Blusa o Jeans',
  'Botines': 'Bolso, Blusa o Jeans',
  'Botas': 'Bolso, Blusa o Jeans',
  'Tacones': 'Bolso, Blusa o Jeans',
  'Sandalias': 'Bolso, Blusa o Jeans',
  'Flats/Zapatillas': 'Bolso, Blusa o Jeans',
  'Mocasines/Loafers': 'Bolso, Blusa o Jeans',
  'Zapato casual': 'Bolso, Blusa o Jeans',
  'Infantil': 'Bolso, Blusa o Jeans',
  'Jeans': 'Botines, Tacones o Bolso',
  'Blusa/Top': 'Botines, Tacones o Bolso',
  'Vestido': 'Botines, Tacones o Bolso',
  'Falda': 'Botines, Tacones o Bolso',
  'Chamarra/Chaqueta': 'Jeans, Botas o Blusa',
  'Suéter/Hoodie': 'Jeans, Botas o Blusa',
  'Bolso/Mochila': 'Blusa o Vestido',
  'Bisutería/Accesorios': 'Blusa o Vestido',
  'Reloj': 'Blusa o Vestido',
  'Lencería': 'Fragancia o Maquillaje',
  'Pijama': 'Fragancia o Maquillaje',
  'Traje de baño': 'Fragancia o Maquillaje',
  'Playera': 'Tenis o Chamarra',
  'Jeans hombre': 'Tenis o Chamarra',
  'Bermuda/Short': 'Tenis o Chamarra',
};

const getSuggestion = (category: string): string => {
  return CATEGORY_SUGGESTIONS[category] || 'algo nuevo de temporada';
};

const MEDAL = ['🥇', '🥈', '🥉'];
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface ClientInfo { id: string; name: string; phone: string | null; }

export default function Tips() {
  const { user } = useAuth();
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
      setClients(cRes.data || []);
      setPurchases(pRes.data || []);
      setAllPurchases(apRes.data || []);
      setSaleItems(siRes.data || []);
      setLoading(false);
    };
    load();
  }, [user, monthStart]);

  const clientMap = useMemo(() => {
    const m: Record<string, ClientInfo> = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  // SECTION 1 — Top clientas
  const topClients = useMemo(() => {
    const grouped: Record<string, { total: number; count: number }> = {};
    purchases.forEach(p => {
      if (!p.client_id) return;
      if (!grouped[p.client_id]) grouped[p.client_id] = { total: 0, count: 0 };
      grouped[p.client_id].total += Number(p.amount);
      grouped[p.client_id].count += 1;
    });
    return Object.entries(grouped)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 3)
      .map(([clientId, data]) => ({ client: clientMap[clientId], ...data }))
      .filter(x => x.client);
  }, [purchases, clientMap]);

  // SECTION 2 — Cycle clientas
  const cycleClients = useMemo(() => {
    const byClient: Record<string, string[]> = {};
    allPurchases.forEach(p => {
      if (!p.client_id) return;
      if (!byClient[p.client_id]) byClient[p.client_id] = [];
      byClient[p.client_id].push(p.purchase_date);
    });

    const results: { client: ClientInfo; cycleDays: number; daysUntilNext: number }[] = [];
    const today = new Date();

    Object.entries(byClient).forEach(([clientId, dates]) => {
      if (dates.length < 2) return;
      const sorted = dates.sort();
      let totalGap = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalGap += (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
      }
      const cycleDays = Math.round(totalGap / (sorted.length - 1));
      const lastDate = new Date(sorted[sorted.length - 1]);
      const daysSinceLast = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilNext = cycleDays - daysSinceLast;

      if (daysUntilNext >= -3 && daysUntilNext <= 3 && clientMap[clientId]) {
        results.push({ client: clientMap[clientId], cycleDays, daysUntilNext });
      }
    });
    return results;
  }, [allPurchases, clientMap]);

  // SECTION 3 — Cross-sell
  const crossSell = useMemo(() => {
    const purchaseMap: Record<string, any> = {};
    allPurchases.forEach(p => { purchaseMap[p.id] = p; });

    const clientLastCategory: Record<string, { category: string; date: string; purchaseId: string }> = {};
    saleItems.forEach(si => {
      const purchase = purchaseMap[si.purchase_id];
      if (!purchase || !purchase.client_id) return;
      const cid = purchase.client_id;
      if (!clientLastCategory[cid] || purchase.purchase_date > clientLastCategory[cid].date) {
        clientLastCategory[cid] = { category: si.category, date: purchase.purchase_date, purchaseId: si.purchase_id };
      }
    });

    return Object.entries(clientLastCategory)
      .sort((a, b) => b[1].date.localeCompare(a[1].date))
      .slice(0, 3)
      .map(([clientId, data]) => {
        const client = clientMap[clientId];
        if (!client) return null;
        const daysAgo = Math.round((new Date().getTime() - new Date(data.date).getTime()) / (1000 * 60 * 60 * 24));
        return { client, category: data.category, daysAgo, suggestion: getSuggestion(data.category) };
      })
      .filter(Boolean) as { client: ClientInfo; category: string; daysAgo: number; suggestion: string }[];
  }, [allPurchases, saleItems, clientMap]);

  // SECTION 4 — Stats
  const stats = useMemo(() => {
    // Top category
    const catCount: Record<string, number> = {};
    const monthPurchaseIds = new Set(purchases.map(p => p.id));
    saleItems.forEach(si => {
      if (monthPurchaseIds.has(si.purchase_id)) {
        catCount[si.category] = (catCount[si.category] || 0) + 1;
      }
    });
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

    // Best day
    const dayCount: Record<number, number> = {};
    purchases.forEach(p => {
      const d = new Date(p.purchase_date).getDay();
      dayCount[d] = (dayCount[d] || 0) + 1;
    });
    const bestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];

    // Margin
    const withCost = purchases.filter(p => p.cost_price && Number(p.cost_price) > 0);
    let avgMargin: number | null = null;
    if (withCost.length > 0) {
      const totalMargin = withCost.reduce((acc, p) => {
        return acc + ((Number(p.amount) - Number(p.cost_price)) / Number(p.amount)) * 100;
      }, 0);
      avgMargin = Math.round(totalMargin / withCost.length);
    }

    // Active clients
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeIds = new Set<string>();
    purchases.forEach(p => {
      if (p.client_id && new Date(p.purchase_date) >= thirtyDaysAgo) activeIds.add(p.client_id);
    });

    return { topCat, bestDay, avgMargin, activeClients: activeIds.size };
  }, [purchases, saleItems]);

  const openWa = (phone: string | null, text: string) => {
    const url = waUrl(phone, text);
    if (!url) {
      toast({ title: 'Sin teléfono', description: 'Esta clienta no tiene teléfono registrado', variant: 'destructive' });
      return;
    }
    window.open(url, '_blank', 'noopener');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const marginColor = stats.avgMargin === null ? 'text-muted-foreground' : stats.avgMargin >= 54 ? 'text-green-600' : stats.avgMargin >= 40 ? 'text-yellow-600' : 'text-red-600';
  const marginIcon = stats.avgMargin === null ? '' : stats.avgMargin >= 54 ? '✅' : stats.avgMargin >= 40 ? '⚠️' : '🔴';
  const marginLabel = stats.avgMargin === null ? '' : stats.avgMargin >= 54 ? '¡Excelente margen!' : stats.avgMargin >= 40 ? 'Puedes mejorar' : 'Revisa tus precios';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">💡 Tips</h1>
        <p className="text-sm text-muted-foreground">Tu negocio en datos</p>
      </div>

      {/* SECTION 1 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-navy">🏅 Tus mejores clientas este mes</h2>
        {topClients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no tienes ventas registradas este mes</p>
        ) : (
          topClients.map((tc, i) => (
            <Card key={tc.client.id} className="overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-2xl">{MEDAL[i]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{tc.client.name}</p>
                  <p className="text-gold font-bold text-base">{formatCurrency(tc.total)}</p>
                  <p className="text-xs text-muted-foreground">{tc.count} compra{tc.count !== 1 ? 's' : ''}</p>
                </div>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                  onClick={() => openWa(tc.client.phone, `Hola ${tc.client.name}, ¡gracias por tu preferencia! Eres una de mis mejores clientas este mes 😊 ¡Siempre tengo lo mejor para ti!`)}
                >
                  <MessageCircle className="w-4 h-4 mr-1" /> Agradécele 💛
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* SECTION 2 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-navy">⏰ Momento de escribirles</h2>
        {cycleClients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todas tus clientas están al día por ahora 👍</p>
        ) : (
          cycleClients.map(cc => (
            <Card key={cc.client.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-2">
                <p className="font-medium text-sm">{cc.client.name}</p>
                {cc.daysUntilNext >= 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Suele comprarte cada {cc.cycleDays} días. ¡En {cc.daysUntilNext} días es su momento! 🎯
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Lleva {Math.abs(cc.daysUntilNext)} días extra sin comprar. ¡Escríbele hoy! ⏰
                  </p>
                )}
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => openWa(cc.client.phone, `Hola ${cc.client.name}, ¡ya tengo novedades que te van a encantar! ¿Cuándo te puedo mostrar lo nuevo? 😊`)}
                >
                  <MessageCircle className="w-4 h-4 mr-1" /> Escribirle
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* SECTION 3 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-navy">🛍️ Oportunidades de venta</h2>
        {crossSell.length === 0 ? (
          <p className="text-sm text-muted-foreground">Registra más ventas con categoría para ver sugerencias</p>
        ) : (
          <>
            {crossSell.map(cs => (
              <Card key={cs.client.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-2">
                  <p className="font-medium text-sm">{cs.client.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {cs.client.name} compró {cs.category} hace {cs.daysAgo} días.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Podrías ofrecerle <span className="font-medium text-foreground">{cs.suggestion}</span> para complementar su look 👗
                  </p>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => openWa(cs.client.phone, `Hola ${cs.client.name}, vi que te llevaste ${cs.category} y tengo algo que te va a encantar para complementarlo 😍 ¿Te cuento?`)}
                  >
                    <MessageCircle className="w-4 h-4 mr-1" /> Ofrecerle
                  </Button>
                </CardContent>
              </Card>
            ))}
            <p className="text-[10px] text-muted-foreground">💡 Próximamente: recomendaciones personalizadas de Price Shoes</p>
          </>
        )}
      </section>

      {/* SECTION 4 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-navy">📊 Tu resumen del mes</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground">Producto estrella</p>
              {stats.topCat ? (
                <p className="font-bold text-sm text-navy">{stats.topCat[0]}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">Registra ventas para ver tu producto estrella</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground">Día con más ventas</p>
              {stats.bestDay ? (
                <p className="font-bold text-sm text-navy">Vendes más los {DAY_NAMES[Number(stats.bestDay[0])]}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">Próximamente</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground">Margen promedio</p>
              {stats.avgMargin !== null ? (
                <>
                  <p className={`font-bold text-lg ${marginColor}`}>{stats.avgMargin}%</p>
                  <p className="text-[10px]">{marginIcon} {marginLabel}</p>
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground">Agrega costos al registrar ventas para ver tu margen</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center space-y-1">
              <p className="text-xs text-muted-foreground">Clientas activas</p>
              <p className="font-bold text-lg text-navy">{stats.activeClients}</p>
              <p className="text-[10px] text-muted-foreground">clientas activas este mes</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </motion.div>
  );
}
