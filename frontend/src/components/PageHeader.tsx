import type { ReactNode } from 'react';

interface PageHeaderProps {
  surTitre?: string;
  titre: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ surTitre, titre, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
      <div className="min-w-0">
        {surTitre ? <p className="eyebrow">{surTitre}</p> : null}
        <h1 className="mt-2 text-[30px] leading-[1.1] text-ink sm:text-[38px]">{titre}</h1>
        {description ? (
          <div className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
