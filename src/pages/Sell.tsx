import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatCurrencyDecimals } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import { Plus, Sparkles, ShoppingBag, Send, Trash2, Check, Copy, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// --- Types ---
interface ClientOption { id: string; name: string; phone: string | null; }
interface LineItem {
  id: string;
  category: string;
  icon: string;
  quantity: number;
  costPrice: number;
  salePrice: number;
}
interface ReceiptData {
  clientName: string;
  clientPhone: string | null;
  items: LineItem[];
  totalCharged: number;
  totalCost: number;
  isCredit: boolean;
  numPayments: number;
  paymentAmount: number;
  firstPaymentDate: string | null;
  date: string;
}

// --- Category data ---
const CATEGORY_GROUPS = [
  {
    label: 'Calzado',
    items: [
      { icon: '👟', name: 'Tenis' }, { icon: '👢', name: 'Botines' }, { icon: '👢', name: 'Botas' },
      { icon: '👡', name: 'Sandalias' }, { icon: '👠', name: 'Tacones' }, { icon: '🥿', name: 'Flats/Zapatillas' },
      { icon: '👞', name: 'Mocasines' }, { icon: '👶', name: 'Infantil' }, { icon: '🥾', name: 'Zapato casual' },
    ],
  },
  {
    label: 'Ropa dama',
    items: [
      { icon: '👖', name: 'Jeans' }, { icon: '👚', name: 'Blusa' }, { icon: '👗', name: 'Vestido' },
      { icon: '🧥', name: 'Chamarra' }, { icon: '🧶', name: 'Suéter' }, { icon: '🩱', name: 'Lencería' },
      { icon: '👙', name: 'Traje de baño' }, { icon: '😴', name: 'Pijama' }, { icon: '👘', name: 'Falda' },
    ],
  },
  {
    label: 'Ropa caballero',
    items: [
      { icon: '👕', name: 'Playera' }, { icon: '👖', name: 'Jeans hombre' },
      { icon: '🩳', name: 'Bermuda' }, { icon: '🧦', name: 'Calcetines/Boxers' },
    ],
  },
  {
    label: 'Ropa infantil',
    items: [
      { icon: '👶', name: 'Conjunto' }, { icon: '👶', name: 'Overol' }, { icon: '👕', name: 'Playera infantil' },
    ],
  },
  {
    label: 'Accesorios',
    items: [
      { icon: '👜', name: 'Bolso' }, { icon: '⌚', name: 'Reloj' }, { icon: '💍', name: 'Bisutería' },
      { icon: '🌸', name: 'Fragancia' }, { icon: '💄', name: 'Maquillaje' },
    ],
  },
];

const cleanPhone = (phone: string | null): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? digits : null;
};

// Style constants
const HEADER_GRADIENT = 'linear-gradient(145deg, #2D1B69 0%, #6B2FA0 45%, #C06DD6 100%)';
const PILL_BG = 'rgba(255,255,255,0.15)';
const PILL_ACTIVE = { background: 'white', color: '#2D1B69' };
const PILL_INACTIVE = { background: 'transparent', color: 'rgba(255,255,255,0.7)' };
const CARD_SHADOW = '0 2px 12px rgba(0,0,0,0.07)';
const BTN_PRIMARY = { background: '#6B2FA0', color: 'white' };

export default function Sell() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const pctGanancia = profile?.pct_ganancia ?? 30;

  // --- Mode ---
  const [mode, setMode] = useState<'calc' | 'direct'>('calc');

  // ========================
  // Calculator state
  // ========================
  const [partnerPrice, setPartnerPrice] = useState(0);
  const [saleType, setSaleType] = useState<'cash' | 'credit'>('cash');
  const [creditCommission, setCreditCommission] = useState(10);
  const [numPayments, setNumPayments] = useState(1);

  // Calc WhatsApp state
  const [calcWaDialogOpen, setCalcWaDialogOpen] = useState(false);
  const [calcWaClientId, setCalcWaClientId] = useState('');
  const [calcWaManualPhone, setCalcWaManualPhone] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // ========================
  // Registration state
  // ========================
  const [clientsList, setClientsList] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientCollapsed, setClientCollapsed] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  const [regSaleType, setRegSaleType] = useState<'cash' | 'credit'>('cash');
  const [regNumPayments, setRegNumPayments] = useState<number>(2);

  // Line items
  const [items, setItems] = useState<LineItem[]>([]);
  const [addingItem, setAddingItem] = useState(false);
  const [itemCategory, setItemCategory] = useState('');
  const [itemIcon, setItemIcon] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemCostInput, setItemCostInput] = useState('');
  const [itemSaleInput, setItemSaleInput] = useState('');
  const [itemSaleManual, setItemSaleManual] = useState(false);

  // Totals override
  const [totalOverride, setTotalOverride] = useState<number | null>(null);

  const [saleDesc, setSaleDesc] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{ total: number; profit: number } | null>(null);

  // --- Calculator computations (fórmula unificada: costo / pct_reposicion) ---
  const pctReposicionDecimal = (100 - pctGanancia - 5) / 100;
  const calcBasePrice = partnerPrice > 0 ? Math.round(partnerPrice / pctReposicionDecimal) : 0;
  const incrementoSugerido = Math.round((1 / pctReposicionDecimal - 1) * 100);
  const pctProducto = Math.round(pctReposicionDecimal * 100);
  const commissionAmount = saleType === 'credit' ? calcBasePrice * (creditCommission / 100) : 0;
  const clientPrice = saleType === 'credit' ? calcBasePrice + commissionAmount : calcBasePrice;
  const calcPaymentAmount = saleType === 'credit' && numPayments > 1 ? clientPrice / numPayments : clientPrice;
  const c3Product = calcBasePrice * pctReposicionDecimal;
  const c3Profit = calcBasePrice * (pctGanancia / 100);
  const c3Expenses = calcBasePrice * 0.05;

  // --- Registration totals ---
  const sumCost = items.reduce((s, i) => s + i.costPrice * i.quantity, 0);
  const sumSale = items.reduce((s, i) => s + i.salePrice * i.quantity, 0);
  const totalCharged = totalOverride ?? sumSale;
  const profit = totalCharged - sumCost;
  const margin = totalCharged > 0 ? (profit / totalCharged) * 100 : 0;

  // Credit payment dates (every 15 days)
  const creditPaymentDates = useMemo(() => {
    if (regSaleType !== 'credit') return [];
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= regNumPayments; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i * 15);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [regSaleType, regNumPayments]);

  const regPaymentAmt = regSaleType === 'credit' && regNumPayments > 0 ? totalCharged / regNumPayments : totalCharged;

  const selectedClient = clientsList.find(c => c.id === selectedClientId);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clientsList;
    const q = clientSearchQuery.toLowerCase();
    return clientsList.filter(c => c.name.toLowerCase().includes(q));
  }, [clientsList, clientSearchQuery]);

  const loadClients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('clients')
      .select('id, name, phone')
      .eq('user_id', user.id)
      .order('name');
    if (data) setClientsList(data);
  };

  useEffect(() => { loadClients(); }, [user]);

  const addNewClient = async () => {
    if (!user || !newClientName.trim()) return;
    const { data } = await supabase
      .from('clients')
      .insert({ user_id: user.id, name: newClientName, phone: newClientPhone || null })
      .select('id, name, phone')
      .single();
    if (data) {
      setClientsList(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedClientId(data.id);
      setClientCollapsed(true);
    }
    setNewClientName('');
    setNewClientPhone('');
    setAddingClient(false);
    toast({ title: '¡Clienta agregada! 🎉' });
  };

  const addItemToList = () => {
    const costNum = Number(itemCostInput) || 0;
    const saleNum = Number(itemSaleInput) || 0;
    if (!itemCategory || costNum <= 0) return;
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      category: itemCategory,
      icon: itemIcon,
      quantity: itemQty,
      costPrice: costNum,
      salePrice: saleNum,
    }]);
    setItemCategory('');
    setItemIcon('');
    setItemQty(1);
    setItemCostInput('');
    setItemSaleInput('');
    setItemSaleManual(false);
    setAddingItem(false);
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setTotalOverride(null);
  };

  const resetForm = () => {
    setItems([]);
    setSelectedClientId('');
    setClientCollapsed(false);
    setSaleDesc('');
    setReceipt(null);
    setRegSaleType('cash');
    setRegNumPayments(2);
    setTotalOverride(null);
    setAddingItem(false);
    if (mode === 'calc') {
      setPartnerPrice(0);
      setSaleType('cash');
      setCreditCommission(10);
      setNumPayments(1);
    }
  };

  const startSaleFromCalc = () => {
    const cost = partnerPrice;
    const price = calcBasePrice;
    setMode('direct');
    setAddingItem(true);
    setItemCostInput(cost > 0 ? cost.toString() : '');
    setItemSaleInput(price > 0 ? price.toString() : '');
    setItemSaleManual(true);
  };

   const saveSale = async () => {
    if (!user || items.length === 0) return;
    if (!selectedClientId && !newClientName.trim()) {
      toast({ title: 'Selecciona o crea una clienta', variant: 'destructive' });
      return;
    }
    setSaving(true);

    try {
      let clientId = selectedClientId;
      let clientName = clientsList.find(c => c.id === clientId)?.name || '';
      let clientPhone = clientsList.find(c => c.id === clientId)?.phone || null;
      if (!clientId && newClientName.trim()) {
        const { data: nc } = await supabase
          .from('clients')
          .insert({ user_id: user.id, name: newClientName, phone: newClientPhone || null })
          .select('id, name, phone')
          .single();
        if (nc) {
          clientId = nc.id;
          clientName = nc.name;
          clientPhone = nc.phone;
          setClientsList(prev => [...prev, nc].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }

      const { data: purchase, error } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          client_id: clientId || null,
          amount: totalCharged,
          cost_price: sumCost,
          description: saleDesc || items.map(i => `${i.quantity}x ${i.category}`).join(', '),
          is_credit: regSaleType === 'credit',
          purchase_date: new Date().toISOString().split('T')[0],
        })
        .select('id')
        .single();

      if (error || !purchase) throw error;

      await supabase.from('sale_items').insert(
        items.map(i => ({
          purchase_id: purchase.id,
          category: i.category,
          quantity: i.quantity,
        }))
      );

      if (regSaleType === 'credit' && regNumPayments > 0) {
        await supabase.from('credit_payments').insert(
          creditPaymentDates.map((d, idx) => ({
            purchase_id: purchase.id,
            payment_number: idx + 1,
            amount: regPaymentAmt,
            due_date: d,
            paid: false,
          }))
        );
      }

      if (clientId) {
        await supabase.from('clients')
          .update({ last_purchase_date: new Date().toISOString().split('T')[0] })
          .eq('id', clientId);
      }

      const firstPayDate = creditPaymentDates.length > 0 ? creditPaymentDates[0] : null;
      const now = new Date();
      const receiptData: ReceiptData = {
        clientName,
        clientPhone,
        items: [...items],
        totalCharged,
        totalCost: sumCost,
        isCredit: regSaleType === 'credit',
        numPayments: regNumPayments,
        paymentAmount: regPaymentAmt,
        firstPaymentDate: firstPayDate,
        date: now.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
      };

      // Show celebration first
      setCelebrationData({ total: totalCharged, profit });
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        setReceipt(receiptData);
      }, 1800);

      toast({ title: '¡Venta registrada! 💰' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const buildText = () => {
    if (!receipt) return '';
    const itemLines = receipt.items.map(i => `${i.icon} ${i.category} x${i.quantity} — ${formatCurrency(i.salePrice * i.quantity)}`).join('%0A');
    let text = `🧾 Recibo de venta%0A%0AClienta: ${receipt.clientName}%0A%0A${itemLines}%0A%0ATotal: ${formatCurrencyDecimals(receipt.totalCharged)}`;
    if (receipt.isCredit && receipt.numPayments > 0) {
      text += `%0A${receipt.numPayments} pagos de ${formatCurrencyDecimals(receipt.paymentAmount)}`;
      if (receipt.firstPaymentDate) {
        const fp = new Date(receipt.firstPaymentDate + 'T12:00:00');
        text += `%0A1er pago: ${fp.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
    }
    const sociaName = profile?.name || '';
    const sociaPhone = profile?.phone || '';
    if (sociaName) text += `%0A%0A${sociaName}`;
    if (sociaPhone) {
      const clean = sociaPhone.replace(/\D/g, '').slice(-10);
      text += `%0A📱 ${clean.slice(0, 2)}-${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    text += `%0A%0A¡Gracias por tu preferencia! 💛`;
    return text;
  };

  const buildWhatsappUrl = (): string | null => {
    if (!receipt?.clientPhone) return null;
    const clean = cleanPhone(receipt.clientPhone);
    if (!clean) return null;
    return `https://wa.me/52${clean}?text=${buildText()}`;
  };

  const openWhatsapp = () => {
    const url = buildWhatsappUrl();
    if (url) {
      window.open(url, '_blank', 'noopener');
    } else {
      toast({ title: 'Esta clienta no tiene teléfono registrado', variant: 'destructive' });
    }
  };

  // Calc mode WhatsApp
  const sendCalcPriceWa = () => {
    let phone: string | null = null;
    if (calcWaClientId) {
      const c = clientsList.find(cl => cl.id === calcWaClientId);
      phone = cleanPhone(c?.phone || null);
    } else if (calcWaManualPhone) {
      phone = cleanPhone(calcWaManualPhone);
    }
    if (!phone) {
      toast({ title: 'Ingresa un teléfono válido', variant: 'destructive' });
      return;
    }
    const text = `Hola, te comparto el precio: ${formatCurrencyDecimals(clientPrice)} 😊 ¿Te lo apartamos?`;
    window.open(`https://wa.me/52${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    setCalcWaDialogOpen(false);
  };

  const copyCalcPrice = () => {
    navigator.clipboard.writeText(formatCurrencyDecimals(clientPrice));
    toast({ title: 'Precio copiado 📋' });
  };

  // ========================
  // RECEIPT
  // ========================
  const renderReceipt = () => {
    if (!receipt) return null;
    const sociaName = profile?.name || '';
    const sociaPhone = profile?.phone || '';
    const formattedSociaPhone = sociaPhone ? (() => {
      const clean = sociaPhone.replace(/\D/g, '').slice(-10);
      return `${clean.slice(0, 2)}-${clean.slice(2, 6)}-${clean.slice(6)}`;
    })() : '';
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl p-5 text-white space-y-3"
        style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}
      >
        <p className="text-lg font-bold text-center" style={{ fontFamily: 'Nunito, sans-serif' }}>🧾 Recibo de venta</p>
        <div className="space-y-1 text-sm">
          <p><span className="opacity-70">Clienta:</span> {receipt.clientName}</p>
          <div className="space-y-0.5">
            {receipt.items.map(i => (
              <p key={i.id}>{i.icon} {i.category} x{i.quantity} — {formatCurrency(i.salePrice * i.quantity)}</p>
            ))}
          </div>
          <p className="text-2xl font-bold pt-2 text-center" style={{ fontFamily: 'Nunito, sans-serif' }}>Total: {formatCurrencyDecimals(receipt.totalCharged)}</p>
          {receipt.isCredit && receipt.numPayments > 0 && (
            <p className="text-center opacity-80">
              {receipt.numPayments} pagos de {formatCurrencyDecimals(receipt.paymentAmount)}
              {receipt.firstPaymentDate && (() => {
                const fp = new Date(receipt.firstPaymentDate + 'T12:00:00');
                return ` — 1er pago: ${fp.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
              })()}
            </p>
          )}
          <p className="opacity-60 text-xs text-center">{receipt.date}</p>
          <div className="border-t border-white/20 mt-3 pt-3 text-center space-y-0.5">
            <p className="text-sm">Gracias por tu compra 💜</p>
            {sociaName && <p className="text-sm font-semibold">{sociaName}</p>}
            {sociaPhone && <p className="text-xs opacity-80">📱 {formattedSociaPhone}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          {receipt.clientPhone && (
            <button
              onClick={openWhatsapp}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-[hsl(142,71%,35%)] text-white"
            >
              <Send className="w-3.5 h-3.5" /> 📲 WhatsApp
            </button>
          )}
          <button
            onClick={resetForm}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white ${!receipt.clientPhone ? 'col-span-2' : ''}`}
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <Plus className="w-3.5 h-3.5" /> ➕ Nueva venta
          </button>
        </div>
      </motion.div>
    );
  };

  // ========================
  // REGISTRATION MODE
  // ========================
  const renderRegistration = () => (
    <div className="space-y-4 pb-20">
      {/* STEP 1 — ¿A quién? (collapsible) */}
      <div className="bg-white rounded-2xl p-4 space-y-3" style={{ boxShadow: CARD_SHADOW }}>
        <p className="text-sm font-semibold" style={{ color: '#2D1B69' }}>Paso 1 — ¿A quién le vendiste?</p>

        {clientCollapsed && selectedClient ? (
          <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#F0E6F6' }}>
            <span className="text-sm font-medium" style={{ color: '#2D1B69' }}>✓ {selectedClient.name}</span>
            <button
              onClick={() => setClientCollapsed(false)}
              className="text-xs font-medium" style={{ color: '#6B2FA0' }}
            >
              Cambiar
            </button>
          </div>
        ) : (
          <>
            <Input
              value={clientSearchQuery}
              onChange={e => setClientSearchQuery(e.target.value)}
              placeholder="Buscar clienta..."
              className="text-sm rounded-xl"
            />
            <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-xl p-1 bg-background">
              {filteredClients.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedClientId(c.id); setClientCollapsed(true); setClientSearchQuery(''); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors ${selectedClientId === c.id ? 'font-medium' : ''}`}
                  style={selectedClientId === c.id ? { background: '#F0E6F6' } : {}}
                >
                  {c.name}
                </button>
              ))}
              {filteredClients.length === 0 && (
                <p className="text-xs text-center py-2" style={{ color: '#8a8a9a' }}>No se encontró clienta</p>
              )}
            </div>

            <AnimatePresence>
              {addingClient ? (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                  <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Nombre" />
                  <Input value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="Teléfono (10 dígitos)" type="tel" />
                  <div className="flex gap-2">
                    <Button onClick={addNewClient} size="sm" className="text-xs text-white" style={BTN_PRIMARY}>Guardar</Button>
                    <Button onClick={() => setAddingClient(false)} size="sm" variant="ghost" className="text-xs">Cancelar</Button>
                  </div>
                </motion.div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setAddingClient(true)} className="text-xs h-7" style={{ color: '#6B2FA0' }}>
                  <Plus className="w-3 h-3 mr-1" /> Nueva clienta
                </Button>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* STEP 2 — ¿Qué vendiste? */}
      <div className="bg-white rounded-2xl p-4 space-y-3" style={{ boxShadow: CARD_SHADOW }}>
        <p className="text-sm font-semibold" style={{ color: '#2D1B69' }}>Paso 2 — ¿Qué vendiste?</p>

        {/* Existing items as chips */}
        <AnimatePresence>
          {items.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: '#F0E6F6' }}
            >
              <span style={{ color: '#2D1B69' }}>{item.icon} {item.category} x{item.quantity} — {formatCurrency(item.salePrice)}c/u — Total: {formatCurrency(item.salePrice * item.quantity)}</span>
              <button onClick={() => removeItem(item.id)} className="text-destructive ml-2 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add item form */}
        <AnimatePresence>
          {addingItem && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border border-border rounded-xl p-3 space-y-3 overflow-hidden"
            >
              {/* Fields FIRST, then categories */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Cantidad</Label>
                  <Input type="number" value={itemQty} onChange={e => setItemQty(Math.max(1, Number(e.target.value) || 1))} min={1} className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Te costó ($)</Label>
                  <Input type="number" value={itemCostInput} onChange={e => { const raw = e.target.value; setItemCostInput(raw); if (!itemSaleManual) { const num = Number(raw) || 0; const repDec = (100 - pctGanancia - 5) / 100; const suggested = Math.round(num / repDec); setItemSaleInput(suggested > 0 ? suggested.toString() : ''); } }} placeholder="0" className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Le cobras ($)</Label>
                  <div className="flex gap-1 mt-1">
                    <Input type="number" value={itemSaleInput} onChange={e => { setItemSaleInput(e.target.value); setItemSaleManual(true); }} placeholder="0" className="text-sm flex-1" />
                    {itemSaleManual && Number(itemCostInput) > 0 && (
                      <button
                        onClick={() => { const num = Number(itemCostInput) || 0; const repDec = (100 - pctGanancia - 5) / 100; const suggested = Math.round(num / repDec); setItemSaleInput(suggested > 0 ? suggested.toString() : ''); setItemSaleManual(false); }}
                        className="text-[10px] shrink-0 px-1" style={{ color: '#6B2FA0' }}
                        title="Recalcular"
                      >↺</button>
                    )}
                  </div>
                  {(() => {
                    const costNum = Number(itemCostInput) || 0;
                    const saleNum = Number(itemSaleInput) || 0;
                    if (costNum <= 0 || saleNum <= 0) return null;
                    const repDec = (100 - pctGanancia - 5) / 100;
                    const recommended = Math.round(costNum / repDec);
                    if (saleNum >= recommended) return null;
                    return (
                      <p className="text-[10px] mt-1" style={{ color: '#C06DD6' }}>
                        ⚠️ Con este precio no cubres tu metodología 3C. Te recomendamos cobrar al menos {formatCurrency(recommended)} para mantener tu ganancia del {pctGanancia}%.
                      </p>
                    );
                  })()}
                </div>
              </div>
              {Number(itemCostInput) > 0 && !itemSaleManual && (
                <p className="text-[10px]" style={{ color: '#8a8a9a' }}>Auto: Producto {pctProducto}% · Ganancia {pctGanancia}% · Gastos 5%</p>
              )}

              {/* Category grid BELOW fields */}
              {CATEGORY_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-medium mb-1.5" style={{ color: '#8a8a9a' }}>{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map(item => (
                      <button
                        key={item.name}
                        onClick={() => { setItemCategory(item.name); setItemIcon(item.icon); }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        style={itemCategory === item.name ? { borderColor: '#6B2FA0', background: '#6B2FA0', color: 'white' } : { borderColor: '#e5e5e5', background: '#F0E6F6', color: '#2D1B69' }}
                      >
                        {item.icon} {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <Button
                onClick={addItemToList}
                disabled={!itemCategory || Number(itemCostInput) <= 0}
                size="sm"
                className="w-full text-white"
                style={BTN_PRIMARY}
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Agregar artículo
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!addingItem && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingItem(true)}
            className="w-full border-dashed"
            style={{ borderColor: '#C06DD6', color: '#6B2FA0' }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Agregar artículo
          </Button>
        )}
      </div>

      {/* TOTALS */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white rounded-2xl p-4 space-y-2" style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="flex justify-between text-sm"><span style={{ color: '#8a8a9a' }}>Te costó:</span><span className="font-semibold" style={{ color: '#2D1B69' }}>{formatCurrency(sumCost)}</span></div>
            <div className="flex justify-between text-sm items-center"><span style={{ color: '#8a8a9a' }}>Le cobras:</span><div className="relative w-28"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#8a8a9a' }}>$</span><Input type="number" value={totalOverride ?? sumSale} onChange={e => setTotalOverride(Number(e.target.value) || 0)} className="pl-5 h-8 text-sm text-right font-semibold" /></div></div>
            <div className="flex justify-between text-sm"><span style={{ color: '#8a8a9a' }}>Tu ganancia:</span><span className="font-bold" style={{ color: '#C06DD6' }}>{formatCurrency(profit)}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: '#8a8a9a' }}>Margen real:</span><span className="font-semibold" style={{ color: '#2D1B69' }}>{margin.toFixed(0)}%</span></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STEP 3 — ¿Cómo paga? */}
      <div className="bg-white rounded-2xl p-4 space-y-3" style={{ boxShadow: CARD_SHADOW }}>
        <p className="text-sm font-semibold" style={{ color: '#2D1B69' }}>Paso 3 — ¿Cómo paga?</p>

        <div className="grid grid-cols-2 gap-2">
          {(['cash', 'credit'] as const).map(t => (
            <button
              key={t}
              onClick={() => setRegSaleType(t)}
              className="py-2.5 rounded-xl text-sm font-medium transition-all border-2"
              style={regSaleType === t ? { borderColor: '#6B2FA0', background: '#6B2FA0', color: 'white' } : { borderColor: '#e5e5e5', background: 'white', color: '#2D1B69' }}
            >
              {t === 'cash' ? '💵 Contado' : '💳 Crédito'}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {regSaleType === 'credit' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
              <Label className="text-sm">¿Cuántos pagos?</Label>
              <div className="flex gap-2">
                {[2, 3, 4, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setRegNumPayments(n)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all"
                    style={regNumPayments === n ? { borderColor: '#6B2FA0', background: '#6B2FA0', color: 'white' } : { borderColor: '#e5e5e5', background: 'white', color: '#2D1B69' }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {creditPaymentDates.length > 0 && totalCharged > 0 && (
                <div className="text-xs space-y-0.5 pt-1" style={{ color: '#8a8a9a' }}>
                  <p className="font-semibold" style={{ color: '#6B2FA0' }}>{regNumPayments} pagos de {formatCurrencyDecimals(regPaymentAmt)}</p>
                  {creditPaymentDates.map((d, i) => {
                    const dt = new Date(d + 'T12:00:00');
                    return <p key={i}>Pago {i + 1}: {dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>;
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optional description */}
        <div>
          <Label className="text-xs" style={{ color: '#8a8a9a' }}>Descripción (opcional)</Label>
          <Input
            value={saleDesc}
            onChange={e => setSaleDesc(e.target.value)}
            placeholder="Ej: Zapatillas negras talla 6"
            className="mt-1 text-sm"
          />
        </div>
      </div>

      {/* STICKY SAVE BUTTON */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 z-30">
        <Button
          onClick={saveSale}
          disabled={items.length === 0 || (!selectedClientId && !newClientName.trim()) || saving}
          className="w-full h-12 rounded-xl text-sm font-semibold text-white shadow-lg"
          style={{ background: '#6B2FA0' }}
        >
          <ShoppingBag className="w-4 h-4 mr-2" />
          {items.length > 0
            ? `Registrar venta · ${formatCurrencyDecimals(totalCharged)}`
            : 'Registrar venta'}
        </Button>
      </div>
    </div>
  );

  // ========================
  // RENDER
  // ========================
  return (
    <div>
      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && celebrationData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            onClick={() => { setShowCelebration(false); }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
            style={{ background: 'linear-gradient(160deg, #2D1B69, #6B2FA0)' }}
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="text-6xl"
            >
              🎉
            </motion.span>
            <p className="text-white mt-4" style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '28px' }}>
              ¡Venta registrada!
            </p>
            <p className="mt-2" style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '42px', color: '#D4A0E8' }}>
              {formatCurrency(celebrationData.total)}
            </p>
            <p className="mt-1" style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>
              Tu ganancia: {formatCurrency(celebrationData.profit)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* HEADER */}
      <div style={{ background: HEADER_GRADIENT, padding: '48px 20px 24px' }}>
        <h1 className="text-white" style={{ fontFamily: 'Nunito, sans-serif', fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
          Vender 🛍️
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Calcula tu precio y registra la venta</p>
        {/* Pill tabs */}
        <div className="flex gap-1 mt-4 p-1 rounded-xl" style={{ background: PILL_BG }}>
          <button onClick={() => { setMode('calc'); setReceipt(null); }} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all" style={mode === 'calc' ? PILL_ACTIVE : PILL_INACTIVE}>
            💰 Calcular precio
          </button>
          <button onClick={() => { setMode('direct'); setReceipt(null); }} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all" style={mode === 'direct' ? PILL_ACTIVE : PILL_INACTIVE}>
            📝 Registrar venta
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="px-4 pt-5 pb-4" style={{ background: '#F5F5F7', minHeight: 'calc(100vh - 200px)' }}>
        {receipt ? (
          renderReceipt()
        ) : (
          <div className="space-y-4">
            {/* MODE 1: Calculator */}
            {mode === 'calc' && (
              <>
                <div className="bg-white rounded-2xl p-5 space-y-4" style={{ boxShadow: CARD_SHADOW }}>
                  {/* Partner price */}
                  <div>
                    <Label className="text-sm font-medium" style={{ color: '#2D1B69' }}>Precio Socia (lo que pagas a Price)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#8a8a9a' }}>$</span>
                      <Input
                        type="number"
                        value={partnerPrice || ''}
                        onChange={e => setPartnerPrice(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                  </div>

                  {/* Suggested increment info */}
                  {partnerPrice > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: '#F0E6F6' }}>
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#6B2FA0' }} />
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#2D1B69' }}>Incremento sugerido: {incrementoSugerido}%</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#8a8a9a' }}>Basado en tu ganancia del {pctGanancia}% + 5% gastos</p>
                      </div>
                    </div>
                  )}

                  {/* Sale type */}
                  <div>
                    <Label className="text-sm font-medium" style={{ color: '#2D1B69' }}>Tipo de venta</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => setSaleType('cash')}
                        className="py-2.5 rounded-xl text-sm font-medium transition-all border-2"
                        style={saleType === 'cash' ? { borderColor: '#6B2FA0', background: '#6B2FA0', color: 'white' } : { borderColor: '#e5e5e5', background: 'white', color: '#2D1B69' }}
                      >💵 Contado</button>
                      <button
                        onClick={() => setSaleType('credit')}
                        className="py-2.5 rounded-xl text-sm font-medium transition-all border-2"
                        style={saleType === 'credit' ? { borderColor: '#6B2FA0', background: '#6B2FA0', color: 'white' } : { borderColor: '#e5e5e5', background: 'white', color: '#2D1B69' }}
                      >💳 Crédito</button>
                    </div>
                  </div>

                  {/* Credit fields */}
                  <AnimatePresence>
                    {saleType === 'credit' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                        <div>
                          <Label className="text-sm" style={{ color: '#2D1B69' }}>Comisión por crédito</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#8a8a9a' }}>%</span>
                            <Input type="number" value={creditCommission || ''} onChange={e => setCreditCommission(Number(e.target.value) || 0)} placeholder="10" className="pl-7" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm">Número de pagos</Label>
                          <Input type="number" value={numPayments || ''} onChange={e => setNumPayments(Math.max(1, Math.round(Number(e.target.value) || 1)))} min={1} className="mt-1" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Result */}
                <AnimatePresence>
                  {partnerPrice > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="space-y-3"
                    >
                      <div className="rounded-xl p-5 text-center text-white" style={{ background: 'linear-gradient(135deg, #2D1B69, #6B2FA0)' }}>
                        <p className="text-xs opacity-70 font-medium">Cóbrale a tu clienta</p>
                        <p className="text-3xl font-bold nunito">{formatCurrencyDecimals(clientPrice)}</p>
                        <p className="text-xs opacity-60 mt-1">
                          Tu ganancia: {formatCurrency(Math.round(c3Profit))} ({pctGanancia}% de {formatCurrency(calcBasePrice)})
                        </p>
                        {saleType === 'credit' && numPayments > 1 && (
                          <p className="text-sm font-semibold mt-2" style={{ color: '#E8A5F0' }}>
                            {numPayments} pagos de {formatCurrencyDecimals(calcPaymentAmount)}
                          </p>
                        )}
                      </div>

                      {/* WhatsApp & Copy buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => setCalcWaDialogOpen(true)} className="text-white text-xs h-10" style={{ background: 'hsl(142,71%,35%)' }}>
                          <MessageCircle className="w-4 h-4 mr-1" /> Compartir por WhatsApp
                        </Button>
                        <Button onClick={copyCalcPrice} variant="outline" className="text-xs h-10">
                          <Copy className="w-4 h-4 mr-1" /> Copiar precio
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white rounded-xl p-3 text-center" style={{ boxShadow: CARD_SHADOW }}>
                          <p className="text-[10px] font-medium" style={{ color: '#6B2FA0' }}>Producto {pctProducto}%</p>
                          <p className="text-sm font-bold nunito" style={{ color: '#2D1B69' }}>{formatCurrency(Math.round(c3Product))}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center" style={{ boxShadow: CARD_SHADOW }}>
                          <p className="text-[10px] font-medium" style={{ color: '#6B2FA0' }}>Ganancia {pctGanancia}%</p>
                          <p className="text-sm font-bold nunito" style={{ color: '#2D1B69' }}>{formatCurrency(Math.round(c3Profit))}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center" style={{ boxShadow: CARD_SHADOW }}>
                          <p className="text-[10px] font-medium" style={{ color: '#6B2FA0' }}>Gastos 5%</p>
                          <p className="text-sm font-bold nunito" style={{ color: '#2D1B69' }}>{formatCurrency(Math.round(c3Expenses))}</p>
                        </div>
                      </div>

                      {/* Educational note */}
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-white" style={{ boxShadow: CARD_SHADOW }}>
                        <span className="text-sm">💡</span>
                        <p className="text-[11px]" style={{ color: '#2D1B69' }}>Este precio cubre el costo del producto, tu ganancia de {pctGanancia}% y un 5% para gastos de tu negocio — exactamente el método 3C.</p>
                      </div>

                      {/* Register sale button */}
                      <Button onClick={startSaleFromCalc} className="w-full h-12 rounded-xl text-white font-semibold" style={{ background: '#6B2FA0' }}>
                        <ShoppingBag className="w-4 h-4 mr-2" /> Registrar esta venta →
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* MODE 2: Registration */}
            {mode === 'direct' && renderRegistration()}
          </div>
        )}
      </div>

      {/* WhatsApp Dialog for Calc mode */}
      <Dialog open={calcWaDialogOpen} onOpenChange={setCalcWaDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>📲 Compartir precio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm" style={{ color: '#8a8a9a' }}>Selecciona una clienta o escribe un número:</p>
            <select
              value={calcWaClientId}
              onChange={e => { setCalcWaClientId(e.target.value); setCalcWaManualPhone(''); }}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecciona clienta</option>
              {clientsList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="text-center text-xs" style={{ color: '#8a8a9a' }}>o</div>
            <Input
              value={calcWaManualPhone}
              onChange={e => { setCalcWaManualPhone(e.target.value); setCalcWaClientId(''); }}
              placeholder="Teléfono (10 dígitos)"
              type="tel"
            />
            <Button
              onClick={sendCalcPriceWa}
              disabled={!calcWaClientId && !calcWaManualPhone}
              className="w-full text-white"
              style={{ background: 'hsl(142,71%,35%)' }}
            >
              <Send className="w-4 h-4 mr-1" /> Enviar por WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
