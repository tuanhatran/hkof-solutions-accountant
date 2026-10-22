import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type VarianteBouton = 'primaire' | 'secondaire' | 'fantome' | 'danger';

interface BoutonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBouton;
  chargement?: boolean;
  icone?: ReactNode;
  petit?: boolean;
}

const CLASSES_VARIANTE: Record<VarianteBouton, string> = {
  primaire: 'btn-primaire',
  secondaire: 'btn-secondaire',
  fantome: 'btn-fantome',
  danger: 'btn-danger',
};

export const Bouton = forwardRef<HTMLButtonElement, BoutonProps>(function Bouton(
  {
    variante = 'secondaire',
    chargement = false,
    icone,
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
      className={cn('btn', CLASSES_VARIANTE[variante], petit && 'btn-petit', className)}
      disabled={disabled || chargement}
      aria-busy={chargement || undefined}
      {...props}
    >
      {chargement ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : icone}
      {children}
    </button>
  );
});
