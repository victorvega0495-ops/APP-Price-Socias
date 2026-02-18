import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Phone, Plus, MessageCircle, CreditCard, AlertTriangle, Check, Clock } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const HEADER_GRADIENT = 'linear-gradient(145deg, #2D1B69 0%, #6B2FA0 45%, #C06DD6 100%)';
const PILL_BG = 'rgba(255,255,255,0.15)';
const PILL_ACTIVE = { background: 'white', color: '#2D1B69' };
const PILL_INACTIVE = { background: 'transparent', color: 'rgba(255,255,255,0.7)' };
const CARD_SHADOW = '0 2px 12px rgba(0,0,0,0.07)';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'd MMM yyyy', { locale: es }); } catch { return dateStr; }
}

interface Client {
  id: string;
  name: string;
  phone: string | null;
  last_purchase_date: string | null;
  pending_balance?: number;
  credit_due_date_earliest?: string | null;
  total_cobrado?: number;
  last_paid_date?: string | null;
}

interface Purchase {
  id: string;
  amount: number;
  description: string | null;
  is_credit: boolean;
  credit_due_date: string | null;
  credit_paid: boolean;
  credit_paid_amount: number;
  purchase_date: string;
}

export default function Clients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<'all' | 'cobranza' | 'cobrado'>('all');
  const [addOpen, setAddOpen] = useState(searchParams.get('add') === 'true');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saleOpen, setSaleOpen] = useState(false);
  const [saleAmount, setSaleAmount] = useState(0);
  const [saleDesc, setSaleDesc] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [creditDueDate, setCreditDueDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadClients = async () => {
    if (!user) return;
    const { data } = await supabase.from('clients').select('*').eq('user_id', user.id).order('name');
    if (data) {
      const clientsWithBalance = await Promise.all(data.map(async (c) => {
        const { data: creditData } = await supabase.from('purchases').select('amount, credit_paid_amount, credit_due_date').eq('client_id', c.id).eq('is_credit', true).eq('credit_paid', false);
        const pending = creditData?.reduce((s, p) => s + (Number(p.amount) - Number(p.credit_paid_amount || 0)), 0) || 0;
        const earliestDue = creditData?.filter(p => p.credit_due_date).sort((a, b) => (a.credit_due_date || '').localeCompare(b.credit_due_date || ''))[0]?.credit_due_date || null;
        const { data: paidData } = await supabase.from('purchases').select('amount, purchase_date').eq('client_id', c.id).eq('is_credit', true).eq('credit_paid', true);
        const totalCobrado = paidData?.reduce((s, p) => s + Number(p.amount), 0) || 0;
        const lastPaidDate = paidData?.map(p => p.purchase_date).sort().reverse()[0] || null;
        return { ...c, pending_balance: pending, credit_due_date_earliest: earliestDue, total_cobrado: totalCobrado, last_paid_date: lastPaidDate } as Client;
      }));
      setClients(clientsWithBalance);
    }
  };

  useEffect(() => { loadClients(); }, [user]);

  const addClient = async () => { if (!user || !newName.trim()) return; await supabase.from('clients').insert({ user_id: user.id, name: newName, phone: newPhone || null }); setNewName(''); setNewPhone(''); setAddOpen(false); toast({ title: '¡Clienta agregada! 🎉' }); loadClients(); };
  const selectClient = async (client: Client) => { setSelectedClient(client); const { data } = await supabase.from('purchases').select('*').eq('client_id', client.id).order('purchase_date', { ascending: false }); setPurchases((data as any) || []); };
  const registerSale = async () => { if (!user || !selectedClient || saleAmount <= 0) return; await supabase.from('purchases').insert({ user_id: user.id, client_id: selectedClient.id, amount: saleAmount, description: saleDesc, is_credit: isCredit, credit_due_date: isCredit ? creditDueDate : null }); await supabase.from('clients').update({ last_purchase_date: new Date().toISOString().split('T')[0] }).eq('id', selectedClient.id); setSaleOpen(false); setSaleAmount(0); setSaleDesc(''); setIsCredit(false); toast({ title: '¡Venta registrada! 💰' }); selectClient(selectedClient); loadClients(); };
  const markAsPaid = async (purchaseId: string) => { await supabase.from('purchases').update({ credit_paid: true, credit_paid_amount: 0 }).eq('id', purchaseId); if (selectedClient) selectClient(selectedClient); loadClients(); toast({ title: 'Pago registrado ✅' }); };

  const today = new Date();
  const filteredClients = clients.filter(c => { if (filter === 'cobranza') return (c.pending_balance || 0) > 0; if (filter === 'cobrado') return (c.total_cobrado || 0) > 0; return true; }).filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPending = clients.reduce((s, c) => s + (c.pending_balance || 0), 0);

  const buildWhatsAppUrl = (phone: string, message: string) => `https://wa.me/52${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

  const WhatsAppButton = ({ client, message }: { client: Client; message: string }) => {
    if (!client.phone) {
      return (<TooltipProvider><Tooltip><TooltipTrigger asChild><button disabled className="w-9 h-9 rounded-full flex items-center justify-center opacity-50 cursor-not-allowed" style={{ background: '#F0E6F6' }}><MessageCircle className="w-4 h-4" style={{ color: '#8a8a9a' }} /></button></TooltipTrigger><TooltipContent><p>Sin teléfono registrado</p></TooltipContent></Tooltip></TooltipProvider>);
    }
    return (<a href={buildWhatsAppUrl(client.phone, message)} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#6B2FA0' }} onClick={(e) => e.stopPropagation()}><MessageCircle className="w-4 h-4 text-white" /></a>);
  };

  // --- DETAIL VIEW ---
  if (selectedClient) {
    return (
      <div>
        <div style={{ background: HEADER_GRADIENT, padding: '48px 20px 24px' }}>
          <button onClick={() => setSelectedClient(null)} className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>← Volver a clientas</button>
          <h1 className="text-white" style={{ fontFamily: 'Nunito, sans-serif', fontSize: '26px', fontWeight: 900 }}>{selectedClient.name}</h1>
          {selectedClient.phone && <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{selectedClient.phone}</p>}
        </div>
        <div className="px-4 pt-5 pb-4 space-y-4" style={{ background: '#F5F5F7', minHeight: 'calc(100vh - 160px)' }}>
          <div className="flex gap-2">
            {selectedClient.phone && (<a href={`https://wa.me/52${selectedClient.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: 'hsl(142,71%,35%)' }}><MessageCircle className="w-4 h-4" /> WhatsApp</a>)}
            <Button onClick={() => setSaleOpen(true)} className="flex-1 text-white rounded-xl" style={{ background: '#6B2FA0' }}><Plus className="w-4 h-4 mr-1" /> Venta</Button>
          </div>

          {(selectedClient.pending_balance || 0) > 0 && (
            <div className="bg-destructive/10 rounded-xl p-3 flex items-center gap-2"><CreditCard className="w-5 h-5 text-destructive" /><span className="text-sm font-medium">Saldo pendiente: {formatCurrency(selectedClient.pending_balance || 0)}</span></div>
          )}

          <h3 className="text-sm font-semibold" style={{ color: '#8a8a9a' }}>Historial de compras</h3>
          <div className="space-y-2">
            {purchases.length === 0 && <p className="text-sm text-center py-8" style={{ color: '#8a8a9a' }}>Aún no hay compras registradas</p>}
            {purchases.map(p => {
              const isOverdue = p.is_credit && !p.credit_paid && p.credit_due_date && new Date(p.credit_due_date) < today;
              return (
                <div key={p.id} className="bg-white rounded-2xl p-3" style={{ boxShadow: CARD_SHADOW }}>
                  <div className="flex justify-between items-start">
                    <div><p className="text-sm font-medium" style={{ color: '#2D1B69' }}>{p.description || 'Venta'}</p><p className="text-xs" style={{ color: '#8a8a9a' }}>{formatDate(p.purchase_date)}</p></div>
                    <p className="font-semibold" style={{ color: '#6B2FA0', fontFamily: 'Nunito, sans-serif' }}>{formatCurrency(Number(p.amount))}</p>
                  </div>
                  {p.is_credit && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-xs font-medium flex items-center gap-1 ${p.credit_paid ? 'text-green-600' : isOverdue ? 'text-destructive' : ''}`} style={!p.credit_paid && !isOverdue ? { color: '#6B2FA0' } : {}}>
                        {p.credit_paid ? <Check className="w-3 h-3" /> : isOverdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {p.credit_paid ? 'Pagado' : isOverdue ? `Vencido (${formatDate(p.credit_due_date)})` : `Vence: ${p.credit_due_date ? formatDate(p.credit_due_date) : 'Por acordar'}`}
                      </span>
                      {!p.credit_paid && <Button size="sm" variant="outline" onClick={() => markAsPaid(p.id)} className="h-7 text-xs">Marcar pagado</Button>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Dialog open={saleOpen} onOpenChange={setSaleOpen}>
            <DialogContent className="max-w-sm rounded-2xl">
              <DialogHeader><DialogTitle>Registrar venta</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Monto</Label><Input type="number" value={saleAmount || ''} onChange={(e) => setSaleAmount(Number(e.target.value))} placeholder="$0" /></div>
                <div><Label>Descripción</Label><Input value={saleDesc} onChange={(e) => setSaleDesc(e.target.value)} placeholder="¿Qué vendiste?" /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isCredit} onChange={(e) => setIsCredit(e.target.checked)} className="rounded" />Es venta a crédito</label>
                {isCredit && (<div><Label>Fecha de pago acordada</Label><Input type="date" value={creditDueDate} onChange={(e) => setCreditDueDate(e.target.value)} /></div>)}
                <Button onClick={registerSale} className="w-full text-white" style={{ background: '#6B2FA0' }}>Registrar venta</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div>
      <div style={{ background: HEADER_GRADIENT, padding: '48px 20px 24px' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-white" style={{ fontFamily: 'Nunito, sans-serif', fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>Mis Clientas 👥</h1>
          <Button onClick={() => setAddOpen(true)} size="sm" className="text-white rounded-xl" style={{ background: 'rgba(255,255,255,0.2)' }}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
        </div>
        {totalPending > 0 && <p className="text-sm mt-2" style={{ color: '#D4A0E8' }}>Cartera activa: {formatCurrency(totalPending)}</p>}
        {/* Filter pills */}
        <div className="flex gap-1 mt-4 p-1 rounded-xl" style={{ background: PILL_BG }}>
          {(['all', 'cobranza', 'cobrado'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all" style={filter === f ? PILL_ACTIVE : PILL_INACTIVE}>
              {f === 'all' ? 'Todas' : f === 'cobranza' ? 'Cobranza' : 'Cobrado'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 pb-4" style={{ background: '#F5F5F7', minHeight: 'calc(100vh - 220px)' }}>
        {/* Search */}
        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar clienta..." className="mb-4 rounded-xl" style={{ borderColor: '#E8D5F5' }} />

        <div className="space-y-2">
          {filteredClients.length === 0 && <p className="text-sm text-center py-8" style={{ color: '#8a8a9a' }}>{filter === 'all' ? 'Agrega tu primera clienta 💪' : filter === 'cobrado' ? 'Aún no tienes cobros registrados ✅' : 'No hay clientas en este filtro'}</p>}
          {filteredClients.map((c, i) => {
            const daysAgo = c.last_purchase_date ? differenceInDays(today, parseISO(c.last_purchase_date)) : null;
            const isOverdue = c.credit_due_date_earliest && new Date(c.credit_due_date_earliest) < today;
            const overdueDays = c.credit_due_date_earliest ? differenceInDays(today, parseISO(c.credit_due_date_earliest)) : 0;
            let waMessage = '';
            if (filter === 'cobranza') waMessage = `Hola ${c.name}, te recuerdo amablemente que tienes un saldo pendiente de ${formatCurrency(c.pending_balance || 0)} 😊 ¿Cuándo podemos coordinar tu pago? ¡Gracias!`;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="w-full bg-white rounded-2xl p-3 flex items-center justify-between" style={{ boxShadow: CARD_SHADOW }}>
                <button onClick={() => selectClient(c)} className="flex-1 text-left">
                  <p className="text-sm font-medium" style={{ color: '#2D1B69' }}>{c.name}</p>
                  {filter === 'cobranza' ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-destructive">Pendiente: {formatCurrency(c.pending_balance || 0)}</p>
                      {isOverdue && overdueDays > 0 && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-medium">{overdueDays}d vencido</span>}
                    </div>
                  ) : filter === 'cobrado' ? (
                    <div><p className="text-xs font-semibold text-green-600">Cobrado: {formatCurrency(c.total_cobrado || 0)}</p>{c.last_paid_date && <p className="text-xs" style={{ color: '#8a8a9a' }}>Último cobro: {formatDate(c.last_paid_date)}</p>}</div>
                  ) : (c.pending_balance || 0) > 0 ? (
                    <p className="text-xs font-semibold text-destructive">Debe {formatCurrency(c.pending_balance || 0)}</p>
                  ) : (
                    <p className="text-xs" style={{ color: '#8a8a9a' }}>{c.last_purchase_date ? `Compró · ${formatDate(c.last_purchase_date)}` : 'Sin compras'}</p>
                  )}
                </button>
                <div className="flex items-center gap-2 ml-2">
                  {filter === 'cobranza' && <WhatsAppButton client={c} message={waMessage} />}
                  {filter === 'all' && c.phone && <Phone className="w-3.5 h-3.5" style={{ color: '#8a8a9a' }} />}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Nueva clienta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre de tu clienta" /></div>
            <div><Label>Teléfono (opcional)</Label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="10 dígitos" type="tel" /></div>
            <Button onClick={addClient} className="w-full text-white" style={{ background: '#6B2FA0' }}>Agregar clienta</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
