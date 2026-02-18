import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatCurrencyDecimals } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Plus, Sparkles, ShoppingBag, Settings, Send, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// --- Types ---
interface ClientOption { id: string; name: string; phone: string | null; }
interface SelectedCategory { category: string; quantity: number; }
interface ReceiptData {
  clientName: string;
  clientPhone: string | null;
  categories: SelectedCategory[];
  total: number;
  isCredit: boolean;
  numPayments: number;
  paymentAmount: number;
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

export default function Sell() {
  const { user } = useAuth();
  const { toast } = useToast();

  // --- Mode ---
  const [mode, setMode] = useState<'calc' | 'direct'>('calc');

  // --- Calculator state ---
  const [partnerPrice, setPartnerPrice] = useState(0);
  const [incrementMode, setIncrementMode] = useState<'percent' | 'amount'>('percent');
  const [incrementValue, setIncrementValue] = useState(54);
  const [saleType, setSaleType] = useState<'cash' | 'credit'>('cash');
  const [creditCommission, setCreditCommission] = useState(10);
  const [numPayments, setNumPayments] = useState(1);

  // --- Registration state ---
  const [showRegistration, setShowRegistration] = useState(false);
  const [directAmount, setDirectAmount] = useState(0);
  const [directSaleType, setDirectSaleType] = useState<'cash' | 'credit'>('cash');
  const [directCreditCommission, setDirectCreditCommission] = useState(10);
  const [directNumPayments, setDirectNumPayments] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<SelectedCategory[]>([]);
  const [clientsList, setClientsList] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [saleDesc, setSaleDesc] = useState('');
  const [saleCreditDueDate, setSaleCreditDueDate] = useState('');
  const [addingClient, setAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [saving, setSaving] = useState(false);

  // --- Calculator computations ---
  const incrementAmount = incrementMode === 'percent'
    ? partnerPrice * (incrementValue / 100)
    : incrementValue;
  const priceWithProfit = partnerPrice + incrementAmount;
  const commissionAmount = saleType === 'credit' ? priceWithProfit * (creditCommission / 100) : 0;
  const clientPrice = saleType === 'credit' ? priceWithProfit + commissionAmount : priceWithProfit;
  const paymentAmount = saleType === 'credit' && numPayments > 1 ? clientPrice / numPayments : clientPrice;
  const c3Product = clientPrice * 0.65;
  const c3Profit = clientPrice * 0.30;
  const c3Expenses = clientPrice * 0.05;

  // --- Direct mode computations ---
  const directClientPrice = directAmount;
  const directCommAmt = directSaleType === 'credit' ? directAmount * (directCreditCommission / 100) : 0;
  const directTotal = directAmount + (directSaleType === 'credit' ? directCommAmt : 0);
  const directPaymentAmt = directSaleType === 'credit' && directNumPayments > 1 ? directTotal / directNumPayments : directTotal;

  // Active values for registration
  const activeIsCredit = mode === 'calc' ? saleType === 'credit' : directSaleType === 'credit';
  const activeTotal = mode === 'calc' ? clientPrice : directTotal;
  const activeNumPayments = mode === 'calc' ? numPayments : directNumPayments;
  const activePaymentAmount = mode === 'calc' ? paymentAmount : directPaymentAmt;

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

  const toggleCategory = (name: string) => {
    setSelectedCategories(prev => {
      const exists = prev.find(c => c.category === name);
      if (exists) return prev.filter(c => c.category !== name);
      return [...prev, { category: name, quantity: 1 }];
    });
  };

  const setCategoryQty = (name: string, qty: number) => {
    setSelectedCategories(prev =>
      prev.map(c => c.category === name ? { ...c, quantity: Math.max(1, qty) } : c)
    );
  };

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
    }
    setNewClientName('');
    setNewClientPhone('');
    setAddingClient(false);
    toast({ title: '¡Clienta agregada! 🎉' });
  };

  const resetForm = () => {
    setSelectedCategories([]);
    setSelectedClientId('');
    setSaleDesc('');
    setSaleCreditDueDate('');
    setShowRegistration(false);
    setReceipt(null);
    if (mode === 'calc') {
      setPartnerPrice(0);
      setIncrementValue(54);
      setSaleType('cash');
      setCreditCommission(10);
      setNumPayments(1);
    } else {
      setDirectAmount(0);
      setDirectSaleType('cash');
      setDirectNumPayments(1);
    }
  };

  const saveSale = async () => {
    if (!user || !selectedClientId || activeTotal <= 0) return;
    setSaving(true);

    try {
      const { data: purchase, error } = await supabase
        .from('purchases')
        .insert({
          user_id: user.id,
          client_id: selectedClientId,
          amount: activeTotal,
          description: saleDesc || selectedCategories.map(c => `${c.quantity}x ${c.category}`).join(', '),
          is_credit: activeIsCredit,
          credit_due_date: activeIsCredit && saleCreditDueDate ? saleCreditDueDate : null,
        })
        .select('id')
        .single();

      if (error || !purchase) throw error;

      // Insert sale_items
      if (selectedCategories.length > 0) {
        await supabase.from('sale_items').insert(
          selectedCategories.map(c => ({
            purchase_id: purchase.id,
            category: c.category,
            quantity: c.quantity,
          }))
        );
      }

      // Insert credit_payments if credit with multiple payments
      if (activeIsCredit && activeNumPayments > 1) {
        const payments = [];
        const today = new Date();
        for (let i = 1; i <= activeNumPayments; i++) {
          const dueDate = new Date(today);
          dueDate.setDate(today.getDate() + i * 15);
          payments.push({
            purchase_id: purchase.id,
            payment_number: i,
            amount: activePaymentAmount,
            due_date: dueDate.toISOString().split('T')[0],
            paid: false,
          });
        }
        await supabase.from('credit_payments').insert(payments);
      }

      // Update client last_purchase_date
      await supabase.from('clients')
        .update({ last_purchase_date: new Date().toISOString().split('T')[0] })
        .eq('id', selectedClientId);

      const client = clientsList.find(c => c.id === selectedClientId);
      const now = new Date();
      setReceipt({
        clientName: client?.name || '',
        clientPhone: client?.phone || null,
        categories: [...selectedCategories],
        total: activeTotal,
        isCredit: activeIsCredit,
        numPayments: activeNumPayments,
        paymentAmount: activePaymentAmount,
        date: now.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
      });

      toast({ title: '¡Venta registrada! 💰' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const whatsappUrl = useMemo(() => {
    if (!receipt) return '';
    const phone = receipt.clientPhone ? `52${receipt.clientPhone.replace(/\D/g, '')}` : '';
    const cats = receipt.categories.map(c => `${c.quantity}x ${c.category}`).join('%0A');
    let text = `Hola+${encodeURIComponent(receipt.clientName)},+aquí+tu+recibo+de+compra+😊%0A%0A${cats}%0ATotal:+${formatCurrencyDecimals(receipt.total)}`;
    if (receipt.isCredit && receipt.numPayments > 1) {
      text += `%0APagos:+${receipt.numPayments}+de+${formatCurrencyDecimals(receipt.paymentAmount)}`;
    }
    text += `%0A%0A¡Gracias+por+tu+compra!+🙏`;
    return `https://wa.me/${phone}?text=${text}`;
  }, [receipt]);

  // --- Registration form (shared between modes) ---
  const renderRegistrationForm = () => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-4 overflow-hidden"
    >
      {/* Sale type for direct mode */}
      {mode === 'direct' && (
        <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
          <div>
            <Label className="text-sm font-medium">Monto cobrado al cliente</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                value={directAmount || ''}
                onChange={e => setDirectAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className="pl-7"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Tipo de venta</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => setDirectSaleType('cash')}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                  directSaleType === 'cash'
                    ? 'border-[hsl(var(--navy))] bg-navy text-primary-foreground'
                    : 'border-border bg-muted text-foreground'
                }`}
              >💵 Contado</button>
              <button
                onClick={() => setDirectSaleType('credit')}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                  directSaleType === 'credit'
                    ? 'border-[hsl(var(--navy))] bg-navy text-primary-foreground'
                    : 'border-border bg-muted text-foreground'
                }`}
              >💳 Crédito</button>
            </div>
          </div>
          <AnimatePresence>
            {directSaleType === 'credit' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                <div>
                  <Label className="text-sm">Número de pagos</Label>
                  <Input type="number" value={directNumPayments || ''} onChange={e => setDirectNumPayments(Math.max(1, Math.round(Number(e.target.value) || 1)))} min={1} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Fecha de pago acordada</Label>
                  <Input type="date" value={saleCreditDueDate} onChange={e => setSaleCreditDueDate(e.target.value)} className="mt-1" />
                </div>
                {directNumPayments > 1 && directAmount > 0 && (
                  <p className="text-sm text-navy font-semibold text-center">{directNumPayments} pagos de {formatCurrencyDecimals(directPaymentAmt)}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Categories */}
      <div className="bg-card rounded-xl p-4 shadow-card">
        <p className="text-sm font-semibold text-foreground mb-3">¿Qué vendiste?</p>
        {CATEGORY_GROUPS.map(group => (
          <div key={group.label} className="mb-3">
            <p className="text-xs text-muted-foreground font-medium mb-1.5">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map(item => {
                const sel = selectedCategories.find(c => c.category === item.name);
                return (
                  <div key={item.name} className="flex items-center gap-1">
                    <button
                      onClick={() => toggleCategory(item.name)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        sel
                          ? 'border-[hsl(var(--navy))] bg-navy text-primary-foreground'
                          : 'border-border bg-muted text-foreground hover:border-[hsl(var(--navy-light))]'
                      }`}
                    >
                      {item.icon} {item.name}
                    </button>
                    {sel && (
                      <Input
                        type="number"
                        value={sel.quantity}
                        onChange={e => setCategoryQty(item.name, Number(e.target.value) || 1)}
                        className="w-12 h-7 text-xs text-center px-1"
                        min={1}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Client */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-2">
        <p className="text-sm font-semibold text-foreground">¿A quién le vendiste?</p>
        <select
          value={selectedClientId}
          onChange={e => setSelectedClientId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Selecciona una clienta</option>
          {clientsList.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <AnimatePresence>
          {addingClient ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
              <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Nombre de tu clienta" />
              <Input value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="Teléfono (10 dígitos)" type="tel" />
              <div className="flex gap-2">
                <Button onClick={addNewClient} size="sm" className="bg-navy text-primary-foreground text-xs">Agregar</Button>
                <Button onClick={() => setAddingClient(false)} size="sm" variant="ghost" className="text-xs">Cancelar</Button>
              </div>
            </motion.div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setAddingClient(true)} className="text-xs text-navy h-7">
              <Plus className="w-3 h-3 mr-1" /> Nueva clienta
            </Button>
          )}
        </AnimatePresence>
      </div>

      {/* Credit fields for calc mode */}
      {mode === 'calc' && activeIsCredit && (
        <div className="bg-card rounded-xl p-4 shadow-card">
          <Label className="text-sm">Fecha de pago acordada</Label>
          <Input type="date" value={saleCreditDueDate} onChange={e => setSaleCreditDueDate(e.target.value)} className="mt-1" />
        </div>
      )}

      {/* Description */}
      <div className="bg-card rounded-xl p-4 shadow-card">
        <Label className="text-sm font-medium">Descripción (opcional)</Label>
        <Input
          value={saleDesc}
          onChange={e => setSaleDesc(e.target.value)}
          placeholder="Ej: Zapatillas negras talla 6"
          className="mt-1"
        />
      </div>

      {/* Save button */}
      <Button
        onClick={saveSale}
        disabled={!selectedClientId || activeTotal <= 0 || saving}
        className="w-full h-12 rounded-xl text-sm font-semibold bg-[hsl(142,71%,35%)] hover:bg-[hsl(142,71%,30%)] text-primary-foreground"
      >
        <ShoppingBag className="w-4 h-4 mr-2" /> 💾 Guardar venta
      </Button>
    </motion.div>
  );

  // --- Receipt card ---
  const renderReceipt = () => {
    if (!receipt) return null;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-navy rounded-xl p-5 text-primary-foreground space-y-3"
      >
        <p className="text-lg font-bold text-center">🧾 Recibo de venta</p>
        <div className="space-y-1 text-sm">
          <p><span className="opacity-70">Clienta:</span> {receipt.clientName}</p>
          {receipt.categories.length > 0 && (
            <div>
              <span className="opacity-70">Productos:</span>
              {receipt.categories.map(c => (
                <p key={c.category} className="ml-2">{c.quantity}x {c.category}</p>
              ))}
            </div>
          )}
          <p className="text-xl font-bold pt-1">Total: {formatCurrencyDecimals(receipt.total)}</p>
          {receipt.isCredit && receipt.numPayments > 1 && (
            <p className="opacity-80">{receipt.numPayments} pagos de {formatCurrencyDecimals(receipt.paymentAmount)}</p>
          )}
          <p className="opacity-60 text-xs">{receipt.date}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          {receipt.clientPhone && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-[hsl(142,71%,35%)] text-primary-foreground"
            >
              <Send className="w-3.5 h-3.5" /> Enviar por WhatsApp
            </a>
          )}
          <button
            onClick={resetForm}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-primary-foreground/20 text-primary-foreground ${!receipt.clientPhone ? 'col-span-2' : ''}`}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Otra venta
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-foreground mb-1">Vender</h1>
      <p className="text-sm text-muted-foreground mb-4">Calcula tu precio y registra la venta</p>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => { setMode('calc'); setShowRegistration(false); setReceipt(null); }}
          className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
            mode === 'calc'
              ? 'border-[hsl(var(--navy))] bg-navy text-primary-foreground'
              : 'border-border bg-muted text-foreground'
          }`}
        >💰 Calcular precio</button>
        <button
          onClick={() => { setMode('direct'); setShowRegistration(false); setReceipt(null); }}
          className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
            mode === 'direct'
              ? 'border-[hsl(var(--navy))] bg-navy text-primary-foreground'
              : 'border-border bg-muted text-foreground'
          }`}
        >📝 Registrar venta</button>
      </div>

      {/* Already showing receipt */}
      {receipt ? (
        renderReceipt()
      ) : (
        <div className="space-y-4">
          {/* MODE 1: Calculator */}
          {mode === 'calc' && (
            <>
              <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
                {/* Partner price */}
                <div>
                  <Label className="text-sm font-medium">Precio Socia (lo que pagas a Price)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      value={partnerPrice || ''}
                      onChange={e => setPartnerPrice(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="pl-7"
                    />
                  </div>
                </div>

                {/* Increment */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Incremento de ganancia</Label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setIncrementMode('percent')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          incrementMode === 'percent' ? 'bg-navy text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >En %</button>
                      <button
                        onClick={() => setIncrementMode('amount')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          incrementMode === 'amount' ? 'bg-navy text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >En $</button>
                    </div>
                  </div>

                  {incrementMode === 'percent' ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-navy">{incrementValue}%</span>
                        {partnerPrice > 0 && (
                          <span className="text-sm text-muted-foreground">+{formatCurrency(incrementAmount)}</span>
                        )}
                      </div>
                      <Slider
                        value={[incrementValue]}
                        onValueChange={v => setIncrementValue(v[0])}
                        min={10}
                        max={100}
                        step={1}
                        className="py-2"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>10%</span><span>100%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number"
                        value={incrementValue || ''}
                        onChange={e => setIncrementValue(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setIncrementMode('percent'); setIncrementValue(54); }}
                    className="mt-1 text-xs text-accent-foreground h-7"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Incremento sugerido 54%
                  </Button>
                </div>

                {/* Sale type */}
                <div>
                  <Label className="text-sm font-medium">Tipo de venta</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      onClick={() => setSaleType('cash')}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                        saleType === 'cash'
                          ? 'border-[hsl(var(--navy))] bg-navy text-primary-foreground'
                          : 'border-border bg-muted text-foreground'
                      }`}
                    >💵 Contado</button>
                    <button
                      onClick={() => setSaleType('credit')}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                        saleType === 'credit'
                          ? 'border-[hsl(var(--navy))] bg-navy text-primary-foreground'
                          : 'border-border bg-muted text-foreground'
                      }`}
                    >💳 Crédito</button>
                  </div>
                </div>

                {/* Credit fields */}
                <AnimatePresence>
                  {saleType === 'credit' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                      <div>
                        <Label className="text-sm">% de comisión por crédito</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
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
                    {/* Client price */}
                    <div className="bg-gradient-navy rounded-xl p-5 text-center text-primary-foreground">
                      <p className="text-xs opacity-70 font-medium">Cóbrale a tu clienta</p>
                      <p className="text-3xl font-bold">{formatCurrencyDecimals(clientPrice)}</p>
                      <p className="text-xs opacity-60 mt-1">
                        Tu ganancia: {formatCurrency(c3Profit)} (30% de {formatCurrency(clientPrice)})
                      </p>
                      {saleType === 'credit' && numPayments > 1 && (
                        <p className="text-sm font-semibold mt-2 text-gold">
                          {numPayments} pagos de {formatCurrencyDecimals(paymentAmount)}
                        </p>
                      )}
                    </div>

                    {/* 3C breakdown */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[hsl(142,71%,93%)] rounded-xl p-3 text-center">
                        <p className="text-[10px] text-[hsl(142,71%,25%)] font-medium">Producto / CrediPrice 65%</p>
                        <p className="text-sm font-bold text-[hsl(142,71%,25%)]">{formatCurrency(c3Product)}</p>
                      </div>
                      <div className="bg-[hsl(232,66%,93%)] rounded-xl p-3 text-center">
                        <p className="text-[10px] text-navy font-medium">Tu ganancia 30%</p>
                        <p className="text-sm font-bold text-navy">{formatCurrency(c3Profit)}</p>
                      </div>
                      <div className="bg-[hsl(30,100%,93%)] rounded-xl p-3 text-center">
                        <p className="text-[10px] text-[hsl(30,100%,30%)] font-medium">Gastos 5%</p>
                        <p className="text-sm font-bold text-[hsl(30,100%,30%)]">{formatCurrency(c3Expenses)}</p>
                      </div>
                    </div>

                    {/* Register button */}
                    {!showRegistration && (
                      <Button
                        onClick={() => setShowRegistration(true)}
                        className="w-full h-12 rounded-xl text-sm font-semibold bg-navy text-primary-foreground hover:bg-[hsl(var(--navy-dark))]"
                      >
                        📝 Registrar esta venta →
                      </Button>
                    )}

                    {/* Registration form */}
                    <AnimatePresence>
                      {showRegistration && renderRegistrationForm()}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* MODE 2: Direct registration */}
          {mode === 'direct' && (
            <AnimatePresence>
              {renderRegistrationForm()}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
