import {
  Bot,
  FileText,
  History,
  LayoutTemplate,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { DialogueConfirmation } from './DialogueConfirmation';
import { LlmBadge } from './LlmBadge';
import { ToastHost } from './ToastHost';
import { useBlocageBrouillon } from '@/hooks/useBlocageBrouillon';
import { cn } from '@/lib/cn';

const SECTIONS = [
  {
    titre: 'Générer',
    liens: [
      { vers: '/generer/quittance', libelle: 'Quittance de loyer', icone: ReceiptText, dataCy: 'tab-quittance' },
      { vers: '/generer/note-frais', libelle: 'Note de frais', icone: FileText, dataCy: 'tab-note-frais' },
    ],
  },
  {
    titre: 'Suivi',
    liens: [{ vers: '/historique', libelle: 'Historique', icone: History, dataCy: 'tab-historique' }],
  },
  {
    titre: 'Réglages',
    liens: [
      { vers: '/configuration', libelle: 'Configuration', icone: SlidersHorizontal, dataCy: 'tab-configuration' },
      { vers: '/templates', libelle: 'Templates', icone: LayoutTemplate, dataCy: 'tab-templates' },
      { vers: '/admin', libelle: 'Admin IA', icone: Bot, dataCy: 'tab-admin' },
    ],
  },
];

const LIENS_MOBILE = SECTIONS.flatMap((section) => section.liens);

function Marque({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'grid place-items-center rounded-xl bg-[#f4f0e8] font-display font-bold text-accent-strong shadow-sm',
          compact ? 'h-9 w-9 text-lg' : 'h-11 w-11 text-xl',
        )}
        aria-hidden="true"
      >
        F
      </span>
      <div>
        <p className={cn('font-display font-semibold tracking-tight text-white', compact ? 'text-lg' : 'text-xl')}>
          FraisOcc
        </p>
        {!compact ? <p className="text-[11px] text-white/50">Quittances &amp; frais d’occupation</p> : null}
      </div>
    </div>
  );
}

function NavigationLaterale() {
  return (
    <nav className="mt-8 flex-1 space-y-6" aria-label="Navigation principale">
      {SECTIONS.map((section) => (
        <div key={section.titre}>
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">{section.titre}</p>
          <div className="mt-2 space-y-1">
            {section.liens.map((lien) => (
              <NavLink
                key={lien.vers}
                to={lien.vers}
                data-cy={lien.dataCy}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition',
                    isActive
                      ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                      : 'text-white/60 hover:bg-white/[0.06] hover:text-white/90',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <lien.icone
                      size={17}
                      className={cn('shrink-0 transition', isActive ? 'text-[#e7b98f]' : 'text-white/45 group-hover:text-white/70')}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{lien.libelle}</span>
                    {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-[#e7b98f]" aria-hidden="true" /> : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppShell() {
  const blocker = useBlocageBrouillon();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <a
        href="#contenu"
        className="sr-only z-[70] rounded-lg bg-surface px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>

      <aside
        className="sticky top-0 hidden h-screen flex-col overflow-y-auto px-4 py-7 lg:flex"
        style={{
          backgroundImage:
            'linear-gradient(158deg, #164a3c 0%, #113d31 46%, #0c2f27 100%)',
        }}
      >
        <div className="px-2">
          <Marque />
        </div>
        <NavigationLaterale />
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.055] p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
            <ShieldCheck size={14} className="text-[#e7b98f]" aria-hidden="true" />
            Données locales
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-white/45">
            Aucune donnée ne quitte votre machine tant que l’URL du LLM reste locale.
          </p>
          <div className="mt-3">
            <LlmBadge sombre />
          </div>
        </div>
        <p className="mt-5 px-2 text-[10px] text-white/25">FraisOcc · usage personnel</p>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line/80 bg-[#123f33] px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Marque compact />
            <LlmBadge sombre />
          </div>
          <nav className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-0.5" aria-label="Navigation principale mobile">
            {LIENS_MOBILE.map((lien) => (
              <NavLink
                key={lien.vers}
                to={lien.vers}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                    isActive ? 'bg-white/12 text-white' : 'text-white/60 hover:text-white/90',
                  )
                }
              >
                <lien.icone size={13} aria-hidden="true" />
                {lien.libelle}
              </NavLink>
            ))}
          </nav>
        </header>

        <main id="contenu" className="mx-auto w-full max-w-[1580px] px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:py-9">
          <Outlet />
        </main>
      </div>

      <ToastHost />
      <DialogueConfirmation
        ouvert={blocker.state === 'blocked'}
        titre="Brouillon non généré"
        message="Des informations saisies ne sont pas encore enregistrées. Voulez-vous vraiment quitter cette page ? Le brouillon est conservé pendant la session, mais le document ne sera pas généré."
        libelleConfirmer="Quitter la page"
        libelleAnnuler="Rester"
        variante="danger"
        onConfirmer={() => {
          if (blocker.state === 'blocked') {
            blocker.proceed();
          }
        }}
        onAnnuler={() => {
          if (blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
        dataCy="dialogue-quitter"
      />
    </div>
  );
}
