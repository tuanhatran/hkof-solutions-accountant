import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type VarianteBouton = 'primaire' | 'secondaire' | 'fantome' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBouton;
  chargement?: boolean;
  icone?: ReactNode;
  petit?: boolean;
}

const VARIANT_CLASS_NAMES: Record<VarianteBouton, string> = {
  primaire: 'btn-primaire',
  secondaire: 'btn-secondaire',
  fantome: 'btn-fantome',
  danger: 'btn-danger',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Bouton(
  {
    variante = 'secondaire',
    chargement: loading = false,
    icone: icon,
    petit = false,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn('btn', VARIANT_CLASS_NAMES[variante], petit && 'btn-petit', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});
