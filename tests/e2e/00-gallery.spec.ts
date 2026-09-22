import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import type { ContentState } from "../../src/lib/cms/types";
import { resultTemplate } from "../../src/lib/cms/gallery";

test("avant / après : édition, consentements, publication, filtre, agrandissement et retrait", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(150000);
  page.setDefaultTimeout(15000);
  const origin = "http://localhost:3001";
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
  const original = structuredClone(initial.published);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Test-only geometric images are never stored in the user's CMS or shown as clinical results.
  const media = [];
  for (const [index, color] of ["#ead8df", "#c3bac5"].entries()) {
    const data = await sharp({
      create: { width: 400, height: 500, channels: 3, background: color },
    })
      .png()
      .toBuffer();
    const response = await page.request.post("/api/admin/upload", {
      headers: {
        ...headers,
        "content-type": "image/png",
        "x-file-name": `Fixture-${index}.png`,
      },
      data,
    });
    expect(response.status()).toBe(201);
    media.push(await response.json());
  }
  const visitor = await browser.newContext({
    viewport:
      info.project.name === "mobile"
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
  });
  const publicPage = await visitor.newPage();
  await publicPage.emulateMedia({ reducedMotion: "reduce" });
  expect((await publicPage.request.get(media[0].url)).status()).toBe(404);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Votre site, à votre image." }),
  ).toBeVisible();
  const nav = page
    .getByRole("navigation", { name: "Sections administrables" })
    .getByRole("button", { name: "Avant / après", exact: true });
  if (!(await nav.isVisible()))
    await page
      .getByRole("button", { name: "Ouvrir la navigation", exact: true })
      .click();
  await nav.click();
  await page
    .getByRole("button", { name: "Ajouter un dossier", exact: true })
    .click();
  const caseEditor = page.locator(".admin-gallery-editor details[open]").last();
  await caseEditor
    .getByLabel("Titre du dossier", { exact: true })
    .fill("Dossier technique — aucun patient");
  await caseEditor
    .getByLabel("Intervention du dossier")
    .selectOption("rhinoplastie");
  await caseEditor
    .getByRole("combobox", { name: "Photo avant", exact: true })
    .selectOption(media[0].url);
  await caseEditor
    .getByRole("combobox", { name: "Photo après", exact: true })
    .selectOption(media[1].url);
  await caseEditor
    .getByLabel("Description de la photo avant")
    .fill("Rectangle rose de test");
  await caseEditor
    .getByLabel("Description de la photo après")
    .fill("Rectangle gris de test");
  await caseEditor
    .getByLabel("Légende factuelle du dossier")
    .fill(
      "Fixture réservée à la vérification de la galerie. Aucun résultat médical.",
    );
  await caseEditor
    .getByLabel("Source ou crédit affiché")
    .fill("Images de test non médicales");
  await expect(
    caseEditor.getByLabel("Présenter ce dossier sur le site", { exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Brouillon enregistré");
  let state: ContentState = await (
    await page.request.get("/api/admin/content")
  ).json();
  const bad = structuredClone(state.draft);
  bad.gallery.items.find(
    (item) => item.title === "Dossier technique — aucun patient",
  )!.visible = true;
  expect(
    (
      await page.request.post("/api/admin/save", {
        headers,
        data: { revision: state.revision, content: bad },
      })
    ).status(),
  ).toBe(400);
  expect((await publicPage.request.get(media[0].url)).status()).toBe(404);
  await caseEditor
    .getByLabel("Je confirme qu’il s’agit d’un cas réel", { exact: false })
    .check();
  await caseEditor
    .getByLabel("Je confirme disposer des droits", { exact: false })
    .check();
  await caseEditor
    .getByLabel("Présenter ce dossier sur le site", { exact: true })
    .check();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Brouillon enregistré");
  await page.screenshot({
    path: `test-results/gallery-editor-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page
      .locator(
        ".admin-gallery-editor input:not([type=checkbox]), .admin-gallery-editor select, .admin-gallery-editor textarea",
      )
      .evaluateAll((elements) =>
        elements.every((element) => {
          const parent = element.closest(".admin-fields");
          return (
            !parent ||
            element.getBoundingClientRect().right <=
              parent.getBoundingClientRect().right -
                parseFloat(getComputedStyle(parent).paddingRight) +
                1
          );
        }),
      ),
  ).toBe(true);
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Avant / après");
  await page
    .getByRole("button", { name: "Confirmer la publication", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "nouvelle version est publiée",
  );
  await publicPage.goto("/#avant-apres");
  await expect(
    publicPage.getByRole("heading", {
      name: "Dossier technique — aucun patient",
    }),
  ).toBeVisible();
  expect((await publicPage.request.get(media[0].url)).status()).toBe(200);
  const imageResponse = await publicPage.request.get(media[0].url);
  expect(imageResponse.headers()["cache-control"]).toContain("no-store");
  expect(
    (
      await publicPage.request.get(
        `/_next/image?url=${encodeURIComponent(media[0].url)}&w=640&q=75`,
      )
    ).status(),
  ).toBe(400);
  await publicPage
    .getByRole("button", {
      name: "Agrandir : Dossier technique — aucun patient",
    })
    .click();
  await expect(publicPage.getByRole("dialog")).toBeVisible();
  await expect(
    publicPage.getByRole("button", { name: "Fermer l’agrandissement" }),
  ).toBeFocused();
  await publicPage.keyboard.press("Escape");
  await expect(publicPage.getByRole("dialog")).not.toBeVisible();
  await expect(
    publicPage.getByRole("button", {
      name: "Agrandir : Dossier technique — aucun patient",
    }),
  ).toBeFocused();
  expect(
    await publicPage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const galleryA11y = await new AxeBuilder({ page: publicPage })
    .include("#avant-apres")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(galleryA11y.violations).toEqual([]);
  await publicPage.screenshot({
    path: `test-results/gallery-${info.project.name}.png`,
    fullPage: true,
  });
  // A second category and an Instagram post exercise filtering and click-to-load privacy without contacting Meta.
  state = await (await page.request.get("/api/admin/content")).json();
  state.draft.gallery.items.push({
    ...resultTemplate,
    id: randomUUID(),
    title: "Publication technique",
    treatmentSlug: "abdominoplastie",
    caption: "Publication fictive uniquement dans le transport de test.",
    sourceLabel: "Fixture de test",
    mode: "instagram",
    instagramUrl: "https://www.instagram.com/p/LEA_TEST_ONLY/",
    verified: true,
    consentConfirmed: true,
    visible: true,
  });
  let saved = await page.request.post("/api/admin/save", {
    headers,
    data: { revision: state.revision, content: state.draft },
  });
  expect(saved.ok()).toBe(true);
  state = await saved.json();
  expect(
    (
      await page.request.post("/api/admin/publish", {
        headers,
        data: { revision: state.revision },
      })
    ).ok(),
  ).toBe(true);
  let metaRequests = 0;
  await publicPage.route("https://www.instagram.com/**", async (route) => {
    metaRequests++;
    await route.fulfill({
      contentType: "text/html",
      body: "<p>Lecteur simulé pour les tests.</p>",
    });
  });
  await publicPage.reload();
  expect(metaRequests).toBe(0);
  await publicPage
    .getByRole("button", { name: "Abdominoplastie", exact: true })
    .click();
  await expect(
    publicPage.getByRole("heading", {
      name: "Dossier technique — aucun patient",
    }),
  ).not.toBeVisible();
  await publicPage
    .getByRole("button", { name: "Afficher la publication" })
    .click();
  await expect(publicPage.locator("iframe")).toBeVisible();
  await expect.poll(() => metaRequests).toBe(1);
  await publicPage
    .getByRole("button", { name: "Fermer le contenu Instagram" })
    .click();
  await expect(publicPage.locator("iframe")).toHaveCount(0);
  state = await (await page.request.get("/api/admin/content")).json();
  state.draft.homeSections.find(
    (section) => section.id === "gallery",
  )!.visible = false;
  saved = await page.request.post("/api/admin/save", {
    headers,
    data: { revision: state.revision, content: state.draft },
  });
  state = await saved.json();
  await page.request.post("/api/admin/publish", {
    headers,
    data: { revision: state.revision },
  });
  expect((await publicPage.request.get(media[0].url)).status()).toBe(404);
  const history = await (await page.request.get("/api/admin/history")).json();
  state = await (await page.request.get("/api/admin/content")).json();
  const restored = await page.request.post("/api/admin/restore", {
    headers,
    data: { revision: state.revision, id: history[0].id },
  });
  state = await restored.json();
  expect(
    state.draft.gallery.items.every(
      (item) => !item.visible && !item.consentConfirmed,
    ),
  ).toBe(true);
  expect(
    (
      await page.request.post("/api/admin/media-delete", {
        headers,
        data: { id: media[0].id },
      })
    ).status(),
  ).toBe(409);
  // Leave the isolated test instance in its original editorial state for the other journeys.
  saved = await page.request.post("/api/admin/save", {
    headers,
    data: { revision: state.revision, content: original },
  });
  state = await saved.json();
  expect(
    (
      await page.request.post("/api/admin/publish", {
        headers,
        data: { revision: state.revision },
      })
    ).ok(),
  ).toBe(true);
  expect(errors).toEqual([]);
  await visitor.close();
});
