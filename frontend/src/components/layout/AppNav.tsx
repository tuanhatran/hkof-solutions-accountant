import "./AppNav.css";
import { Bot, Building2, History, Home, ReceiptText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

export interface NavigationLink {
  to: string;
  label: string;
  icon: typeof ReceiptText;
  dataCy: string;
}

export interface NavigationGroup {
  title: string;
  links: NavigationLink[];
}

export interface NavigationSection {
  title: string;
  links: NavigationLink[];
  groups?: NavigationGroup[];
}

export const SECTIONS: NavigationSection[] = [
  {
    title: "Suivi",
    links: [
      {
        to: "/historique",
        label: "Historique",
        icon: History,
        dataCy: "tab-historique",
      },
    ],
  },
  {
    title: "Réglages",
    links: [
      {
        to: "/configuration/entreprise",
        label: "Société",
        icon: Building2,
        dataCy: "tab-configuration",
      },
      {
        to: "/configuration/lmnp",
        label: "LMNP",
        icon: Home,
        dataCy: "tab-lmnp",
      },
      { to: "/admin", label: "Admin IA", icon: Bot, dataCy: "tab-admin" },
    ],
  },
];

const MOBILE_LINKS = SECTIONS.flatMap((section) => [
  ...(section.groups?.flatMap((group) => group.links) ?? []),
  ...section.links,
]);

function SideNavigationLink({ link }: { link: NavigationLink }) {
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
          <span className="flex-1">{link.label}</span>
          {isActive ? (
            <span className="app-nav-dot" aria-hidden="true" />
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export function SideNavigation() {
  return (
    <nav className="app-nav" aria-label="Navigation principale">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="app-nav-section">{section.title}</p>
          <div className="app-nav-links">
            {section.links.map((link) => (
              <SideNavigationLink key={link.to} link={link} />
            ))}
          </div>
          {section.groups?.map((group) => (
            <div key={group.title} data-cy={`groupe-${group.title}`}>
              <p className="app-nav-group">{group.title}</p>
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
  return (
    <nav className="app-nav-mobile" aria-label="Navigation principale mobile">
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
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
