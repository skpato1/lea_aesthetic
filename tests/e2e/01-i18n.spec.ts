import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { locales, localizePath } from "../../src/lib/i18n/config";
import type { ContentState } from "../../src/lib/cms/types";
const origin = "http://localhost:3001";
const seed = JSON.parse(readFileSync("src/content/cms-seed.json", "utf8"));
const dictionaries = Object.fromEntries(
  locales
    .filter((code) => code !== "fr")
    .map((code) => [
      code,
      JSON.parse(readFileSync(`src/content/i18n/${code}.json`, "utf8")),
    ]),
);

test("sept langues : pages rendues côté serveur, menus, métadonnées, liens et mobile", async ({
  page,
  request,
}, info) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const locale of locales) {
    await page.goto(localizePath("/", locale));
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator(".language-switcher select")).toHaveValue(locale);
    await expect(page.locator("h1")).toContainText(
      locale === "fr"
        ? seed.copy.home.text002
        : dictionaries[locale][seed.copy.home.text002],
    );
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      locale === "fr" ? origin : `${origin}/${locale}`,
    );
    expect(await page.locator('link[rel="alternate"][hreflang]').count()).toBe(
      8,
    );
    if (locale === "ru" || locale === "tr")
      await page.screenshot({
        path: `test-results/i18n-${locale}-${info.project.name}.png`,
      });
    if (info.project.name === "mobile") {
      await page.locator(".menu-toggle").click();
      await expect(page.locator("#main-navigation")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("#main-navigation")).not.toBeVisible();
    }
    const response = await request.get(localizePath("/chirurgien", locale));
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(
      locale === "fr"
        ? seed.copy.chirurgien.text001
        : dictionaries[locale][seed.copy.chirurgien.text001],
    );
    for (const path of [
      "/agence",
      "/interventions",
      "/parcours",
      "/faq",
      "/contact",
      "/informations-legales",
      ...seed.treatments.map(
        (item: { slug: string }) => `/interventions/${item.slug}`,
      ),
    ]) {
      expect(
        (await request.get(localizePath(path, locale))).status(),
        `${locale}${path}`,
      ).toBe(200);
    }
  }
  await page.goto("/en/interventions/rhinoplastie?from=home#contenu");
  await page.locator(".language-switcher select").selectOption("it");
  await expect(page).toHaveURL(
    /\/it\/interventions\/rhinoplastie\?from=home#contenu$/,
  );
  await expect(page.locator("h1")).toHaveText("Rinoplastica");
  const enquiry = page.locator('.treatment-sidebar a[href^="/it/contact"]');
  await enquiry.click();
  await expect(page).toHaveURL(/\/it\/contact\?intervention=rhinoplastie/);
  await expect(page.locator('select[name="intervention"]')).toHaveValue(
    "rhinoplastie",
  );
  await expect(
    page.locator('a[href="tel:+905392996231"]').first(),
  ).toBeVisible();
  const whatsapp = await page
    .locator('a[href^="https://wa.me/"]')
    .first()
    .getAttribute("href");
  expect(new URL(whatsapp!).searchParams.get("text")).toContain("Rinoplastica");
  await page.goto("/en/informations-legales");
  await expect(
    page.locator('.legal-content a[href="/en/contact"]'),
  ).toHaveCount(1);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("langues : liens historiques, 404, sitemap, API et absence de fuite des dictionnaires privés", async ({
  request,
}) => {
  const old = await request.get("/pt/appointment?intervention=rhinoplastie", {
    maxRedirects: 0,
  });
  expect(old.status()).toBe(308);
  expect(old.headers().location).toContain(
    "/pt/contact?intervention=rhinoplastie",
  );
  const french = await request.get("/fr/contact", { maxRedirects: 0 });
  expect(french.status()).toBe(308);
  const missing = await request.get("/es/page-absente");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain(
    dictionaries.es[seed.copy.notFound.text001],
  );
  const spoof = await request.get("/contact", {
    headers: { "x-lea-locale": "ru" },
  });
  expect(await spoof.text()).toContain('<html lang="fr"');
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const locale of locales)
    expect(sitemap).toContain(`${origin}${localizePath("/contact", locale)}`);
  expect(
    (await request.get("/api/admin/translations?locale=en")).status(),
  ).toBe(401);
  const error = await request.post("/api/contact", {
    headers: { Origin: "https://untrusted.example", "x-lea-language": "tr" },
    data: {},
  });
  expect(error.status()).toBe(403);
  expect((await error.json()).message).toBe(
    dictionaries.tr[
      "Cette demande n’est pas autorisée. Actualisez la page et réessayez."
    ],
  );
});

test("traduction administrable : saisie, brouillon privé, aperçu, publication et retour à la version initiale", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(150000);
  page.setDefaultTimeout(15000);
  const status = await (await page.request.get("/api/admin/status")).json();
  const login = await page.request.post(
    `/api/admin/${status.setup ? "setup" : "login"}`,
    {
      headers: { Origin: origin },
      data: {
        email: "owner@example.test",
        password: "Une-phrase-de-test-privee-2026",
        token: "lea-e2e-only-setup-token-not-for-production-2026",
      },
    },
  );
  expect(login.ok()).toBe(true);
  const headers = { Origin: origin, "x-csrf-token": (await login.json()).csrf };
  const initial: ContentState = await (
    await page.request.get("/api/admin/content")
  ).json();
  const visitor = await browser.newContext({
    viewport:
      info.project.name === "mobile"
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
  });
  const publicPage = await visitor.newPage();
  const modified = "Your personal LEA journey";
  try {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Votre site, à votre image." }),
    ).toBeVisible();
    const nav = page
      .getByRole("navigation", { name: "Sections administrables" })
      .getByRole("button", { name: "Langues et traductions", exact: true });
    if (!(await nav.isVisible()))
      await page
        .getByRole("button", { name: "Ouvrir la navigation", exact: true })
        .click();
    await nav.click();
    await page
      .getByRole("textbox", { name: "Rechercher un contenu" })
      .fill(seed.copy.home.text002);
    const row = page
      .locator(".translation-row")
      .filter({
        has: page.locator(".translation-source", { hasText: /^Votre projet$/ }),
      });
    await row.locator("textarea").fill(modified);
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Brouillon enregistré" }),
    ).toBeVisible();
    await publicPage.goto(`${origin}/en`);
    await expect(publicPage.locator("h1")).not.toContainText(modified);
    await page.request.post("/api/admin/preview", {
      headers,
      data: { enabled: true },
    });
    const preview = await page.request.get("/en");
    expect(await preview.text()).toContain(modified);
    await page.request.post("/api/admin/preview", {
      headers,
      data: { enabled: false },
    });
    await page.getByRole("button", { name: "Publier", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "Langues et traductions",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Confirmer la publication/ })
      .click();
    await publicPage.reload();
    await expect(publicPage.locator("h1")).toContainText(modified);
    await publicPage.goto(`${origin}/`);
    await expect(publicPage.locator("h1")).toContainText(
      seed.copy.home.text002,
    );
    await page.screenshot({
      path: `test-results/i18n-admin-${info.project.name}.png`,
      fullPage: true,
    });
  } finally {
    const current: ContentState = await (
      await page.request.get("/api/admin/content")
    ).json();
    const saved = await page.request.post("/api/admin/save", {
      headers,
      data: { revision: current.revision, content: initial.published },
    });
    expect(saved.ok()).toBe(true);
    const next = await saved.json();
    expect(
      (
        await page.request.post("/api/admin/publish", {
          headers,
          data: { revision: next.revision },
        })
      ).ok(),
    ).toBe(true);
    await visitor.close();
  }
});
