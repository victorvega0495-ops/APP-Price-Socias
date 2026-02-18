import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatCurrencyDecimals } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Plus, Sparkles, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ClientOption {
  id: string;
  name: string;
}

export default function Sell() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Simulator state
  const [partnerPrice, setPartnerPrice] = useState(0);
  const [saleType, setSaleType] = useState<'cash' | 'credit' | null>(null);
  const [incrementMode, setIncrementMode] = useState<'percent' | 'amount'>('percent');
  const [incrementValue, setIncrementValue] = useState(0);
  const [creditCommission, setCreditCommission] = useState(0);
  const [numPayments, setNumPayments] = useState(1);

  // Sale registration
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [clientsList, setClientsList] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [saleDesc, setSaleDesc] = useState('');
  const [saleCreditDueDate, setSaleCreditDueDate] = useState('');
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [isCreditOverride, setIsCreditOverride] = useState(false);

  const loadClients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name');
    if (data) setClientsList(data);
  };

  // --- Simulator calculations ---
  const incrementAmount = incrementMode === 'percent'
    ? partnerPrice * (incrementValue / 100)
    : incrementValue;
  const priceWithProfit = partnerPrice + incrementAmount;
  const commissionAmount = saleType === 'credit' ? priceWithProfit * (creditCommission / 100) : 0;
  const clientPrice = saleType === 'credit' ? priceWithProfit + commissionAmount : priceWithProfit;
  const paymentAmount = saleType === 'credit' && numPayments > 0 ? clientPrice / numPayments : 0;

  // 3C breakdown
  const c3Product = clientPrice * 0.65;
  const c3Profit = clientPrice * 0.30;
  const c3Expenses = clientPrice * 0.05;

  // 50-30-20 of 30% profit
  const needs = c3Profit * 0.50;
  const wants = c3Profit * 0.30;
  const savings = c3Profit * 0.20;

  const hasValidPrice = partnerPrice > 0 && saleType !== null && clientPrice > 0;

  const openSaleDialog = () => {
    loadClients();
    setSelectedClientId('');
    setSaleDesc('');
    setSaleCreditDueDate('');
    setSaleSuccess(false);
    setIsCreditOverride(saleType === 'credit');
    setSaleDialogOpen(true);
  };

  const addNewClient = async () => {
    if (!user || !newClientName.trim()) return;
    const { data } = await supabase
      .from('clients')
      .insert({ user_id: user.id, name: newClientName, phone: newClientPhone || null })
      .select('id, name')
      .single();
    if (data) {
      setClientsList(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedClientId(data.id);
    }
    setNewClientName('');
    setNewClientPhone('');
    setAddClientOpen(false);
    toast({ title: '¡Clienta agregada! 🎉' });
  };

  const registerSale = async () => {
    if (!user || !selectedClientId || clientPrice <= 0) return;
    await supabase.from('purchases').insert({
      user_id: user.id,
      client_id: selectedClientId,
      amount: clientPrice,
      description: saleDesc,
      is_credit: isCreditOverride,
      credit_due_date: isCreditOverride && saleCreditDueDate ? saleCreditDueDate : null,
    });
    await supabase.from('clients').update({ last_purchase_date: new Date().toISOString().split('T')[0] }).eq('id', selectedClientId);
    setSaleSuccess(true);
    toast({ title: '¡Venta registrada! 💰' });
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-foreground mb-1">Vender</h1>
      <p className="text-sm text-muted-foreground mb-4">Calcula tu precio y registra la venta</p>

      <div className="space-y-4">
        <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
          {/* 1. Precio Socia */}
          <div>
            <Label className="text-sm font-medium">Precio Socia (lo que pagas a Price)</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                value={partnerPrice || ''}
                onChange={(e) => setPartnerPrice(Number(e.target.value) || 0)}
                placeholder="0"
                className="pl-7"
              />
            </div>
          </div>

          {/* 2. Tipo de venta */}
          <div>
            <Label className="text-sm font-medium">Tipo de venta</Label>
            <motion.div
              className="grid grid-cols-2 gap-2 mt-1"
              animate={partnerPrice > 0 && !saleType ? { scale: [1, 1.02, 1] } : {}}
              transition={{ repeat: partnerPrice > 0 && !saleType ? Infinity : 0, duration: 1.5 }}
            >
              <button
                onClick={() => setSaleType('cash')}
                className={`py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                  saleType === 'cash'
                    ? 'border-navy bg-navy text-primary-foreground'
                    : 'border-border bg-muted text-foreground hover:border-navy/50'
                }`}
              >
                💵 Contado
              </button>
              <button
                onClick={() => setSaleType('credit')}
                className={`py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                  saleType === 'credit'
                    ? 'border-navy bg-navy text-primary-foreground'
                    : 'border-border bg-muted text-foreground hover:border-navy/50'
                }`}
              >
                💳 Crédito
              </button>
            </motion.div>
          </div>

          {/* 3. Incremento de ganancia */}
          <div>
            <Label className="text-sm font-medium">Incremento de ganancia</Label>
            <div className="flex gap-1 mt-1 mb-2">
              <button
                onClick={() => setIncrementMode('percent')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  incrementMode === 'percent' ? 'bg-navy text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                En %
              </button>
              <button
                onClick={() => setIncrementMode('amount')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  incrementMode === 'amount' ? 'bg-navy text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                En $
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {incrementMode === 'percent' ? '%' : '$'}
              </span>
              <Input
                type="number"
                value={incrementValue || ''}
                onChange={(e) => setIncrementValue(Number(e.target.value) || 0)}
                placeholder="0"
                className="pl-7"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIncrementMode('percent'); setIncrementValue(54); }}
              className="mt-1.5 text-xs text-accent-foreground h-7"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Incremento sugerido (54%)
            </Button>
          </div>

          {/* 4. Campos de crédito */}
          <AnimatePresence>
            {saleType === 'credit' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div>
                  <Label className="text-sm">% de comisión por crédito</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    <Input
                      type="number"
                      value={creditCommission || ''}
                      onChange={(e) => setCreditCommission(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="pl-7"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Número de pagos</Label>
                  <Input
                    type="number"
                    value={numPayments || ''}
                    onChange={(e) => setNumPayments(Math.max(1, Math.round(Number(e.target.value) || 1)))}
                    placeholder="1"
                    className="mt-1"
                    min={1}
                    step={1}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- OUTPUTS --- */}
        <AnimatePresence>
          {hasValidPrice && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="space-y-3"
            >
              {/* Precio al Cliente */}
              <div className="bg-gradient-gold rounded-xl p-5 text-center">
                <p className="text-xs text-accent-foreground/70 font-medium">Precio al Cliente</p>
                <p className="text-3xl font-bold text-accent-foreground">{formatCurrencyDecimals(clientPrice)}</p>
                {saleType === 'credit' && commissionAmount > 0 && (
                  <p className="text-xs text-accent-foreground/60 mt-1">
                    Incluye {formatCurrency(commissionAmount)} de comisión por crédito
                  </p>
                )}
              </div>

              {/* Monto por pago (crédito) */}
              {saleType === 'credit' && numPayments > 1 && (
                <div className="bg-card rounded-xl p-4 shadow-card text-center">
                  <p className="text-xs text-muted-foreground">Monto por pago ({numPayments} pagos)</p>
                  <p className="text-xl font-bold text-navy">{formatCurrencyDecimals(paymentAmount)}</p>
                </div>
              )}

              {/* Desglose 3C */}
              <div className="bg-card rounded-xl p-4 shadow-card">
                <p className="text-xs font-semibold text-foreground mb-2">Desglose 3C</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground">Producto 65%</p>
                    <p className="text-sm font-semibold">{formatCurrency(c3Product)}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground">Ganancia 30%</p>
                    <p className="text-sm font-semibold text-navy">{formatCurrency(c3Profit)}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground">Gastos 5%</p>
                    <p className="text-sm font-semibold">{formatCurrency(c3Expenses)}</p>
                  </div>
                </div>
              </div>

              {/* Desglose 50-30-20 */}
              <div className="bg-card rounded-xl p-4 shadow-card">
                <p className="text-xs font-semibold text-foreground mb-2">Tu ganancia ({formatCurrency(c3Profit)}) se divide así:</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground">Necesidades 50%</p>
                    <p className="text-sm font-semibold">{formatCurrency(needs)}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground">Deseos 30%</p>
                    <p className="text-sm font-semibold">{formatCurrency(wants)}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground">Ahorro 20%</p>
                    <p className="text-sm font-semibold text-accent-foreground">{formatCurrency(savings)}</p>
                  </div>
                </div>
                <p className="text-xs text-center mt-3 text-muted-foreground">
                  Por cada venta, <span className="font-semibold text-accent-foreground">{formatCurrency(savings)}</span> van a tu sueño ⭐
                </p>
              </div>

              {/* Botón Registrar Venta */}
              <Button
                onClick={openSaleDialog}
                className="w-full h-12 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 text-white"
              >
                <ShoppingBag className="w-4 h-4 mr-2" /> 💰 Registrar esta venta
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sale Registration Dialog */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          {saleSuccess ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-4xl">🎉</p>
              <p className="text-lg font-bold text-foreground">¡Venta registrada!</p>
              <p className="text-sm text-muted-foreground">El monto de {formatCurrencyDecimals(clientPrice)} fue guardado correctamente.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/clientas')}
                  className="text-xs"
                >
                  Ver en Mis Clientas →
                </Button>
                <Button
                  onClick={() => {
                    setSaleDialogOpen(false);
                    setPartnerPrice(0);
                    setSaleType(null);
                    setIncrementValue(0);
                    setCreditCommission(0);
                    setNumPayments(1);
                  }}
                  className="bg-navy text-primary-foreground text-xs"
                >
                  Hacer otra venta
                </Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Registrar venta — {formatCurrencyDecimals(clientPrice)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Clienta</Label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                  >
                    <option value="">Selecciona una clienta</option>
                    {clientsList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddClientOpen(true)}
                    className="mt-1 text-xs text-navy h-7"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Nueva clienta
                  </Button>
                </div>

                <div>
                  <Label className="text-sm">Descripción</Label>
                  <Input
                    value={saleDesc}
                    onChange={(e) => setSaleDesc(e.target.value)}
                    placeholder="Ej: Zapatillas negras talla 6"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isCreditOverride}
                    onChange={(e) => setIsCreditOverride(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">Es venta a crédito</span>
                </div>
                {isCreditOverride && (
                  <div>
                    <Label className="text-sm">Fecha de pago acordada</Label>
                    <Input
                      type="date"
                      value={saleCreditDueDate}
                      onChange={(e) => setSaleCreditDueDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                <Button
                  onClick={registerSale}
                  disabled={!selectedClientId}
                  className="w-full bg-navy text-primary-foreground"
                >
                  Guardar venta
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Client Sub-Dialog */}
      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva clienta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Nombre de tu clienta" />
            </div>
            <div>
              <Label>Teléfono (opcional)</Label>
              <Input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="10 dígitos" type="tel" />
            </div>
            <Button onClick={addNewClient} className="w-full bg-navy text-primary-foreground">
              Agregar clienta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
