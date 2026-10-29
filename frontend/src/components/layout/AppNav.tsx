import "./AppNav.css";
import {
  Bot,
  Building2,
  FileText,
  History,
  Home,
  ReceiptText,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

export interface NavigationLink {
  to: string;
  labelKey: string;
  icon: typeof ReceiptText;
  dataCy: string;
}

export interface NavigationGroup {
  titleKey: string;
  links: NavigationLink[];
}

export interface NavigationSection {
  titleKey: string;
  links: NavigationLink[];
  groups?: NavigationGroup[];
}

export const SECTIONS: NavigationSection[] = [
  {
    titleKey: "navigation.sections.documents",
    links: [
      {
        to: "/generer/quittance",
        labelKey: "navigation.links.rentReceipt",
        icon: FileText,
        dataCy: "tab-rent-receipt",
      },
      {
        to: "/generer/note-frais",
        labelKey: "navigation.links.expenseStatement",
        icon: ReceiptText,
        dataCy: "tab-expense-statement",
      },
    ],
  },
  {
    titleKey: "navigation.sections.tracking",
    links: [
      {
        to: "/historique",
        labelKey: "navigation.links.history",
        icon: History,
        dataCy: "tab-history",
      },
    ],
  },
  {
    titleKey: "navigation.sections.settings",
    links: [
      {
        to: "/configuration/entreprise",
        labelKey: "navigation.links.company",
        icon: Building2,
        dataCy: "tab-configuration",
      },
      {
        to: "/configuration/lmnp",
        labelKey: "navigation.links.lmnp",
        icon: Home,
        dataCy: "tab-lmnp",
      },
      {
        to: "/admin",
        labelKey: "navigation.links.aiAdmin",
        icon: Bot,
        dataCy: "tab-admin",
      },
    ],
  },
];

const MOBILE_LINKS = SECTIONS.flatMap((section) => [
  ...(section.groups?.flatMap((group) => group.links) ?? []),
  ...section.links,
]);

function SideNavigationLink({ link }: { link: NavigationLink }) {
  const { t } = useTranslation();

  return (
    <NavLink
      to={link.to}
      data-cy={link.dataCy}
      className={({ isActive }) =>
        cn(
          "group app-nav-link",
          isActive ? "app-nav-link-active" : "app-nav-link-idle",
        )
      }
    >
      {({ isActive }) => (
        <>
          <link.icon
            size={17}
            className={cn(
              "app-nav-icon",
              isActive ? "app-nav-icon-active" : "app-nav-icon-idle",
            )}
            aria-hidden="true"
          />
          <span className="flex-1">{t(link.labelKey)}</span>
          {isActive ? (
            <span className="app-nav-dot" aria-hidden="true" />
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export function SideNavigation() {
  const { t } = useTranslation();

  return (
    <nav className="app-nav" aria-label={t("navigation.ariaLabel")}>
      {SECTIONS.map((section) => (
        <div key={section.titleKey}>
          <p className="app-nav-section">{t(section.titleKey)}</p>
          <div className="app-nav-links">
            {section.links.map((link) => (
              <SideNavigationLink key={link.to} link={link} />
            ))}
          </div>
          {section.groups?.map((group) => (
            <div key={group.titleKey} data-cy={`group-${group.titleKey}`}>
              <p className="app-nav-group">{t(group.titleKey)}</p>
              <div className="app-nav-links">
                {group.links.map((link) => (
                  <SideNavigationLink key={link.to} link={link} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function MobileNavigation() {
  const { t } = useTranslation();

  return (
    <nav
      className="app-nav-mobile"
      aria-label={t("navigation.mobileAriaLabel")}
    >
      {MOBILE_LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            cn(
              "app-nav-mobile-link",
              isActive
                ? "app-nav-mobile-link-active"
                : "app-nav-mobile-link-idle",
            )
          }
        >
          <link.icon size={13} aria-hidden="true" />
          {t(link.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
