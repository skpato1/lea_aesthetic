import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
const english: Record<string, string> = JSON.parse(
  readFileSync("src/content/i18n/en.json", "utf8"),
);
const slugs = [
  "rhinoplastie",
  "liposuccion-vaser",
  "abdominoplastie",
  "augmentation-mammaire",
  "lifting-mammaire",
  "lifting-du-visage",
  "liposuccion-vaser-hd",
  "j-plasma",
  "six-pack",
];
const maleSlugs = slugs.slice(-3);
test("protections HTTP avant tout envoi", async ({ request }) => {
  expect(
    (
      await request.post("/api/contact", {
        headers: { Origin: "https://untrusted.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/contact", {
        headers: {
          Origin: "http://localhost:3001",
          "Content-Type": "text/plain",
        },
        data: "test",
      })
    ).status(),
  ).toBe(415);
  expect(
    (
      await request.post("/api/contact", {
        headers: { Origin: "http://localhost:3001" },
        data: { message: "a".repeat(9000) },
      })
    ).status(),
  ).toBe(413);
});
test("accueil : images, ancrages historiques, liens, débordement et accessibilité", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Votre projet",
  );
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".surgeon-image").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator(".surgeon-image img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.keyboard.press("Control+Home");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: `test-results/home-${info.project.name}.png`,
    fullPage: true,
    scale: "css",
  });
  for (const id of [
    "home",
    "our-services",
    "our-doctors",
    "contact-us",
    "testimonials",
  ])
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  const badImages = await page
    .locator("img")
    .evaluateAll((imgs) =>
      imgs
        .filter(
          (i) =>
            (i as HTMLImageElement).complete &&
            !(i as HTMLImageElement).naturalWidth,
        )
        .map((i) => i.getAttribute("src")),
    );
  expect(badImages).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  await expect(
    page.locator('a[href="tel:+905392996231"]').first(),
  ).toBeVisible();
  const instagram = await page
    .locator('.footer-links a[href*="instagram"]')
    .getAttribute("href");
  expect(instagram).toContain("instagram.com/lea__aesthetics");
  expect(errors).toEqual([]);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("navigation et menu mobile au clavier", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    const menu = page.locator(".menu-toggle");
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
  }
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Le chirurgien", exact: true })
    .click();
  await expect(page).toHaveURL(/\/chirurgien$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Pehlivan",
  );
  if (isMobile)
    await expect(
      page.getByRole("button", { name: "Ouvrir le menu" }),
    ).toHaveAttribute("aria-expanded", "false");
});
test("les neuf interventions, images, WhatsApp encodé et présélection contact", async ({
  page,
}) => {
  await page.goto("/interventions");
  await expect(page.getByText("Opérations pour homme", { exact: true })).toHaveCount(
    3,
  );
  for (const slug of maleSlugs) {
    await expect(page.locator(`a[href="/interventions/${slug}"]`)).toHaveCount(1);
  }
  for (const slug of slugs) {
    const response = await page.goto(`/interventions/${slug}`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "À aborder en consultation" }),
    ).toBeVisible();
    const a = page.getByRole("link", { name: "En parler sur WhatsApp" });
    const url = new URL((await a.getAttribute("href"))!);
    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/905392996231");
    expect(url.searchParams.get("text")).toContain(
      await page.locator("h1").innerText(),
    );
    if (maleSlugs.includes(slug)) {
      await expect(page.locator(".treatment-detail-visual img")).toHaveAttribute(
        "alt",
        /.+/,
      );
      await expect
        .poll(() =>
          page
            .locator(".treatment-detail-visual img")
            .evaluate((image) => (image as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
  await page.getByRole("link", { name: "Écrire à l’agence" }).first().click();
  await expect(
    page.getByLabel("L’intervention qui vous intéresse"),
  ).toHaveValue("six-pack");
});
test("pages, FAQ interactive, redirection, 404 et métadonnées", async ({
  page,
  request,
}) => {
  for (const path of [
    "/agence",
    "/parcours",
    "/faq",
    "/contact",
    "/informations-legales",
    "/interventions",
  ]) {
    const r = await page.goto(path);
    expect(r?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(path + "$"),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
  await page.goto("/faq");
  const summary = page.locator("summary").first();
  await summary.click();
  await expect(summary.locator("..")).toHaveAttribute("open", "");
  await summary.click();
  await expect(summary.locator("..")).not.toHaveAttribute("open", "");
  const legacy = await request.get("/index.html", { maxRedirects: 0 });
  expect(legacy.status()).toBe(308);
  const missing = await page.goto("/une-page-inconnue");
  expect(missing?.status()).toBe(404);
  await expect(
    page.getByRole("link", { name: "Retour à l’accueil" }),
  ).toBeVisible();
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect((await request.get("/robots.txt")).status()).toBe(200);
  expect(
    (await request.get("/opengraph-image")).headers()["content-type"],
  ).toContain("image/png");
});
test("formulaire : validation, consentement, chargement et acceptation simulée", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const translate = (text: string) =>
    info.project.name === "desktop" ? english[text] || text : text;
  await page.goto(
    `${info.project.name === "desktop" ? "/en" : ""}/contact?intervention=rhinoplastie`,
  );
  const button = page.getByRole("button", {
    name: translate("Envoyer ma demande"),
  });
  await button.click();
  await expect(
    page.getByLabel(translate("Votre nom"), { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel(translate("Votre nom"), { exact: true })
    .fill("Camille Test");
  await page
    .getByLabel(translate("Votre e-mail ou téléphone"))
    .fill("invalide");
  await page
    .getByLabel(translate("Votre message"), { exact: true })
    .fill("Bonjour, je souhaite me renseigner sur les étapes de mon projet.");
  await page.locator('input[name="consent"]').check();
  await page.waitForTimeout(2100);
  await button.click();
  await expect(page.locator("#contact-error")).toHaveText(
    translate("Indiquez une adresse e-mail ou un numéro de téléphone valide."),
  );
  await page
    .getByLabel(translate("Votre e-mail ou téléphone"))
    .fill("camille@example.test");
  await button.click();
  await expect(page.locator(".form-success")).toBeVisible();
  await expect(page.locator(".form-success")).toHaveText(
    translate(
      "Test réussi : le transport de développement a accepté la demande. Aucun e-mail réel n’a été envoyé.",
    ),
  );
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: `test-results/contact-success-${info.project.name}.png`,
    fullPage: true,
    scale: "css",
  });
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("formulaire : erreur réseau et indisponibilité sans faux succès", async ({
  page,
}) => {
  await page.goto("/contact");
  await page.route("**/api/contact", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        message:
          "L’envoi n’a pas pu être confirmé. Réessayez ou contactez-nous sur WhatsApp.",
      }),
    }),
  );
  await page.getByLabel("Votre nom", { exact: true }).fill("Camille Test");
  await page
    .getByLabel("Votre e-mail ou téléphone")
    .fill("camille@example.test");
  await page
    .getByLabel("L’intervention qui vous intéresse")
    .selectOption("a-definir");
  await page
    .getByLabel("Votre message", { exact: true })
    .fill("Bonjour, je souhaite parler de mon projet avec votre équipe.");
  await page.locator('input[name="consent"]').check();
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page.locator('.form-status[role="alert"]')).toContainText(
    "n’a pas pu être confirmé",
  );
  await expect(
    page
      .locator('.form-status[role="alert"]')
      .getByRole("link", { name: "Échanger sur WhatsApp" }),
  ).toBeVisible();
  await expect(page.locator(".form-success")).toHaveCount(0);
});

test("reprises : contenu identique dédupliqué, modification avec nouvelle référence", async ({
  page,
}) => {
  await page.goto("/contact");
  const payloads: { requestId: string }[] = [];
  let release: () => void = () => {};
  await page.route("**/api/contact", async (route) => {
    payloads.push(route.request().postDataJSON());
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ message: "Envoi non confirmé. Réessayez." }),
    });
  });
  await page.getByLabel("Votre nom", { exact: true }).fill("Camille Test");
  await page
    .getByLabel("Votre e-mail ou téléphone")
    .fill("camille@example.test");
  await page
    .getByLabel("L’intervention qui vous intéresse")
    .selectOption("a-definir");
  await page
    .getByLabel("Votre message", { exact: true })
    .fill("Bonjour, je souhaite préparer mon projet esthétique.");
  await page.locator('input[name="consent"]').check();
  for (let i = 0; i < 3; i++) {
    if (i === 2)
      await page
        .getByLabel("Votre message", { exact: true })
        .fill("Bonjour, voici une modification de ma demande initiale.");
    await page.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(page.getByLabel("Votre nom", { exact: true })).toBeDisabled();
    await expect.poll(() => payloads.length).toBe(i + 1);
    release();
    await expect(page.locator('.form-status[role="alert"]')).toContainText(
      "Envoi non confirmé",
    );
  }
  expect(payloads[0].requestId).toBe(payloads[1].requestId);
  expect(payloads[2].requestId).not.toBe(payloads[1].requestId);
});
