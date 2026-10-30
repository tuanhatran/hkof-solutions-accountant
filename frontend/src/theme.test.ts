import { describe, expect, it } from "vitest";

describe("Dashboard Design System Tokens", async () => {
  // @ts-expect-error Node builtin in test environment
  const fs = (await import("node:fs")).default;
  // @ts-expect-error Node builtin in test environment
  const path = (await import("node:path")).default;

  const rootDir = (
    globalThis as unknown as { process: { cwd: () => string } }
  ).process.cwd();
  const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
  const indexCss = fs.readFileSync(
    path.join(rootDir, "src/index.css"),
    "utf-8",
  );
  const appShellCss = fs.readFileSync(
    path.join(rootDir, "src/components/layout/AppShell.css"),
    "utf-8",
  );
  const appNavCss = fs.readFileSync(
    path.join(rootDir, "src/components/layout/AppNav.css"),
    "utf-8",
  );

  it("loads Public Sans font in index.html with preconnect links", () => {
    expect(indexHtml).toContain("fonts.googleapis.com");
    expect(indexHtml).toContain("fonts.gstatic.com");
    expect(indexHtml).toContain("family=Public+Sans:wght@400;500;600;700");
  });

  it("configures Public Sans and proportional headings in index.css", () => {
    expect(indexCss).toMatch(
      /--font-sans:\s*"Public Sans",\s*"Segoe UI",\s*-apple-system/,
    );
    expect(indexCss).toMatch(/font-size:\s*0\.875rem;\s*\/\*\s*14px\s*\*\//);
    expect(indexCss).toMatch(/line-height:\s*1\.57;/);
    expect(indexCss).toMatch(/h4\s*\{[^}]*font-size:\s*1\.5rem;/s);
    expect(indexCss).toMatch(
      /h1,\s*h2,\s*h3,\s*h4\s*\{[^}]*font-weight:\s*700;/s,
    );
  });

  it("configures the dashboard palette (#1C252E, #FFFFFF, #F4F6F8, soft lines)", () => {
    expect(indexCss).toMatch(/--color-ink:\s*#1c252e/i);
    expect(indexCss).toMatch(/--color-surface:\s*#ffffff/i);
    expect(indexCss).toMatch(/--color-paper:\s*#f4f6f8/i);
    expect(indexCss).toMatch(
      /--color-line:\s*rgba\(145,\s*158,\s*171,\s*0\.20?\)/,
    );
    expect(indexCss).toMatch(
      /--color-line-strong:\s*rgba\(145,\s*158,\s*171,\s*0\.32\)/,
    );
  });

  it("configures soft elevation shadows with #919EAB rgba scale", () => {
    expect(indexCss).toMatch(
      /--shadow-subtle:\s*0 0 2px 0 rgba\(145,\s*158,\s*171,\s*0\.20?\)/,
    );
    expect(indexCss).toMatch(
      /--shadow-soft:\s*0 0 2px 0 rgba\(145,\s*158,\s*171,\s*0\.20?\),\s*0 1px 3px 0 rgba\(145,\s*158,\s*171,\s*0\.12\)/,
    );
    expect(indexCss).toMatch(
      /--shadow-floating:\s*0 0 2px 0 rgba\(145,\s*158,\s*171,\s*0\.24\),\s*0 16px 32px -4px rgba\(145,\s*158,\s*171,\s*0\.24\)/,
    );
  });

  it("configures radius tokens (8px buttons, 16px cards) and focus ring rgb(0, 150, 255)", () => {
    expect(indexCss).toMatch(/--radius-lg:\s*0\.5rem;/);
    expect(indexCss).toMatch(/--radius-xl:\s*1rem;/);
    expect(indexCss).toMatch(/--radius-2xl:\s*1rem;/);
    expect(indexCss).toMatch(/outline:\s*2px solid rgb\(0,\s*150,\s*255\);/);
    expect(indexCss).toMatch(/outline-offset:\s*2px;/);
  });

  it("constrains AppShell main container to max-w-[1263px]", () => {
    expect(appShellCss).toContain("max-w-[1263px]");
  });

  it("uses 8px radius on navigation links in AppNav.css", () => {
    expect(appNavCss).toMatch(/\.app-nav-link\s*\{[^}]*rounded-lg/s);
    expect(appNavCss).toMatch(/\.app-nav-mobile-link\s*\{[^}]*rounded-lg/s);
  });
});
