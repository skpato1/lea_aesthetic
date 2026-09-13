import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { certificateTemplate } from "../../src/lib/cms/certificates";
import type { ContentState } from "../../src/lib/cms/types";
test("certificats : section, édition, médias privés, vérification, publication, agrandissement et retrait", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(120000);
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
  const visitor = await browser.newContext({
      viewport:
        info.project.name === "mobile"
          ? { width: 390, height: 844 }
          : { width: 1440, height: 1000 },
    }),
    publicPage = await visitor.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  publicPage.on("pageerror", (error) => errors.push(error.message));
  try {
    await publicPage.goto(`${origin}/#certificats`);
    await expect(publicPage.locator("#certificats")).toContainText(
      "Certificats et autorisations",
    );
    const file = await sharp({
      create: { width: 700, height: 500, channels: 3, background: "#ead8df" },
    })
      .webp()
      .toBuffer();
    const upload = await page.request.post("/api/admin/upload", {
      headers: {
        ...headers,
        "Content-Type": "image/webp",
        "x-file-name": "Fixture non médicale.webp",
      },
      data: file,
    });
    expect(upload.status()).toBe(201);
    const media = await upload.json();
    expect((await publicPage.request.get(media.url)).status()).toBe(404);
    const bad = structuredClone(initial.draft);
    bad.certificates.items = [
      { ...certificateTemplate, id: crypto.randomUUID(), visible: true },
    ];
    expect(
      (
        await page.request.post("/api/admin/save", {
          headers,
          data: { revision: initial.revision, content: bad },
        })
      ).status(),
    ).toBe(400);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Votre site, à votre image." }),
    ).toBeVisible();
    const nav = page
      .getByRole("navigation", { name: "Sections administrables" })
      .getByRole("button", {
        name: "Certificats et autorisations",
        exact: true,
      });
    if (!(await nav.isVisible()))
      await page
        .getByRole("button", { name: "Ouvrir la navigation", exact: true })
        .click();
    await nav.click();
    await page.getByRole("button", { name: "Ajouter un certificat" }).click();
    await page
      .getByLabel("Titre du certificat", { exact: true })
      .fill("Document technique sans accréditation");
    await page
      .getByRole("combobox", { name: "Image du certificat", exact: true })
      .selectOption(media.url);
    for (const [label, value] of Object.entries({
      "Titulaire exact du document": "Organisation fictive de test",
      "Organisme émetteur": "Émetteur de test",
      "Portée de l’autorisation":
        "Test technique : aucune autorisation médicale",
      "Référence publique du certificat": "FIXTURE-ONLY",
      "Description de l’image": "Rectangle de test non médical",
      "Lien de vérification officiel": "https://example.org/fixture",
    }))
      await page.getByLabel(label, { exact: true }).fill(value);
    await expect(
      page.getByLabel("Présenter ce certificat sur le site", { exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Brouillon enregistré",
    );
    expect((await publicPage.request.get(media.url)).status()).toBe(404);
    await page
      .getByLabel(
        "Original, titulaire et validité vérifiés auprès de l’émetteur",
        { exact: true },
      )
      .check();
    await page
      .getByLabel("Présenter ce certificat sur le site", { exact: true })
      .check();
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Brouillon enregistré",
    );
    await page.getByRole("button", { name: "Publier", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "Certificats et autorisations",
    );
    await page
      .getByRole("button", { name: "Confirmer la publication", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "nouvelle version est publiée",
    );
    await publicPage.reload();
    await expect(publicPage.locator("#certificats h3")).toHaveText(
      "Document technique sans accréditation",
    );
    expect((await publicPage.request.get(media.url)).status()).toBe(200);
    await publicPage
      .getByRole("button", { name: /Voir le document : Document technique/ })
      .click();
    await expect(publicPage.getByRole("dialog")).toBeVisible();
    await publicPage.keyboard.press("Escape");
    await expect(publicPage.getByRole("dialog")).not.toBeVisible();
    await publicPage.locator("#certificats").scrollIntoViewIfNeeded();
    await publicPage.screenshot({
      path: `tmp/certificates-fixture-${info.project.name}.png`,
    });
    expect(
      await publicPage.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page
      .getByLabel("Titulaire exact du document", { exact: true })
      .fill("Titulaire modifié");
    await expect(
      page.getByLabel(
        "Original, titulaire et validité vérifiés auprès de l’émetteur",
        { exact: true },
      ),
    ).not.toBeChecked();
    expect(errors).toEqual([]);
  } finally {
    const state: ContentState = await (
      await page.request.get("/api/admin/content")
    ).json();
    const saved = await page.request.post("/api/admin/save", {
      headers,
      data: { revision: state.revision, content: initial.published },
    });
    expect(saved.ok()).toBe(true);
    expect(
      (
        await page.request.post("/api/admin/publish", {
          headers,
          data: { revision: (await saved.json()).revision },
        })
      ).ok(),
    ).toBe(true);
    await visitor.close();
  }
});
