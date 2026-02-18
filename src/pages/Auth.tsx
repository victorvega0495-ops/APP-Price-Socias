import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partnerNumber, setPartnerNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        if (!name.trim() || !phone.trim()) {
          toast({ title: 'Completa todos los campos', variant: 'destructive' });
          return;
        }
        const { error } = await signUp(email, password, name, phone, partnerNumber);
        if (error) throw error;
        toast({
          title: '¡Registro exitoso! 🎉',
          description: 'Revisa tu correo para confirmar tu cuenta.',
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-navy">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/logo-um.png" alt="Universidad de la Mujer" className="h-10 object-contain mx-auto mb-3" />
            <img src="/logo-price.png" alt="Price Shoes" className="h-20 object-contain mx-auto mb-3" />
            <p className="text-xs text-primary-foreground/60 font-medium uppercase tracking-wider">App para Socias</p>
            <h1 className="text-2xl font-bold text-primary-foreground mt-2">Mi Negocio Price</h1>
            <p className="text-sm text-primary-foreground/70 mt-1">
              Tu herramienta para el Reto 0 a 10,000
            </p>
          </div>

          {/* Form */}
          <div className="bg-card rounded-2xl p-6 shadow-elevated">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <Label htmlFor="name">Tu nombre</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: María López"
                      required={!isLogin}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10 dígitos"
                      type="tel"
                      required={!isLogin}
                    />
                  </div>
                  <div>
                    <Label htmlFor="partner">Número de socia Price Shoes</Label>
                    <Input
                      id="partner"
                      value={partnerNumber}
                      onChange={(e) => setPartnerNumber(e.target.value)}
                      placeholder="Tu número de socia"
                    />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-navy hover:opacity-90 text-primary-foreground font-semibold h-12 rounded-xl"
                disabled={loading}
              >
                {loading ? 'Cargando...' : isLogin ? 'Entrar' : 'Registrarme'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-navy font-semibold hover:underline"
              >
                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
