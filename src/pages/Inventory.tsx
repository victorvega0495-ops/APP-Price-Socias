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
import { Plus, Package, AlertTriangle, Pencil, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  partner_price: number;
  sale_price: number;
}

export default function Inventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(searchParams.get('add') === 'true');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', description: '', quantity: 0, partner_price: 0, sale_price: 0 });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setProducts(data as any);
  };

  useEffect(() => { load(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;
    if (editingProduct) {
      await supabase.from('inventory').update({
        name: form.name, description: form.description || null,
        quantity: form.quantity, partner_price: form.partner_price, sale_price: form.sale_price,
      }).eq('id', editingProduct.id);
      toast({ title: 'Producto actualizado ✅' });
    } else {
      await supabase.from('inventory').insert({
        user_id: user.id, name: form.name, description: form.description || null,
        quantity: form.quantity, partner_price: form.partner_price, sale_price: form.sale_price,
      });
      toast({ title: '¡Producto agregado! 📦' });
    }
    setDialogOpen(false);
    setEditingProduct(null);
    setForm({ name: '', description: '', quantity: 0, partner_price: 0, sale_price: 0 });
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('inventory').delete().eq('id', id);
    toast({ title: 'Producto eliminado' });
    load();
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({ name: p.name, description: p.description || '', quantity: p.quantity, partner_price: Number(p.partner_price), sale_price: Number(p.sale_price) });
    setDialogOpen(true);
  };

  const totalValue = products.reduce((s, p) => s + p.quantity * Number(p.sale_price), 0);

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Mi Inventario</h1>
          <p className="text-sm text-muted-foreground">{products.length} productos</p>
        </div>
        <Button onClick={() => { setEditingProduct(null); setForm({ name: '', description: '', quantity: 0, partner_price: 0, sale_price: 0 }); setDialogOpen(true); }} size="sm" className="bg-navy text-primary-foreground">
          <Plus className="w-4 h-4 mr-1" /> Agregar
        </Button>
      </div>

      <div className="space-y-2">
        {products.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Agrega tu primer producto 📦</p>
        )}
        {products.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card rounded-xl p-4 shadow-card"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">{p.name}</h3>
                  {p.quantity <= 2 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-destructive font-medium">
                      <AlertTriangle className="w-3 h-3" /> Pocas unidades
                    </span>
                  )}
                </div>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="p-1.5 text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
              <div className="bg-muted rounded-lg py-1.5">
                <p className="text-[10px] text-muted-foreground">Cantidad</p>
                <p className="text-sm font-semibold">{p.quantity}</p>
              </div>
              <div className="bg-muted rounded-lg py-1.5">
                <p className="text-[10px] text-muted-foreground">P. Socia</p>
                <p className="text-sm font-semibold">{formatCurrency(Number(p.partner_price))}</p>
              </div>
              <div className="bg-muted rounded-lg py-1.5">
                <p className="text-[10px] text-muted-foreground">P. Venta</p>
                <p className="text-sm font-semibold text-navy">{formatCurrency(Number(p.sale_price))}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {products.length > 0 && (
        <div className="bg-gradient-navy rounded-xl p-4 text-center mt-4">
          <p className="text-xs text-primary-foreground/70">Valor total del inventario</p>
          <p className="text-2xl font-bold text-primary-foreground">{formatCurrency(totalValue)}</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Zapato Dama #24" />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Color, talla, etc." />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Cantidad</Label>
                <Input type="number" value={form.quantity || ''} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs">P. Socia</Label>
                <Input type="number" value={form.partner_price || ''} onChange={(e) => setForm({ ...form, partner_price: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs">P. Venta</Label>
                <Input type="number" value={form.sale_price || ''} onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-navy text-primary-foreground">
              {editingProduct ? 'Guardar cambios' : 'Agregar producto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
