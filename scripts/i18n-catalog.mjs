import fs from "node:fs";
import ts from "typescript";
const files = [
  "src/components/header.tsx",
  "src/components/footer.tsx",
  "src/components/site-frame.tsx",
  "src/components/contact-form.tsx",
  "src/components/results-gallery.tsx",
  "src/app/error.tsx",
  "src/app/api/contact/route.ts",
  "src/lib/contact.ts",
];
const sources = new Set([
  "Choisir la langue",
  "Langue",
  "Agrandir :",
  "Publication Instagram :",
  "Source :",
  "Photo après :",
  "LEA Aesthetic, accueil",
  "LEA Aesthetic sur Instagram (nouvel onglet)",
  "Contacter LEA Aesthetic sur WhatsApp (nouvel onglet)",
  "Fermer le contenu Instagram",
  "Afficher la publication",
  "Ouvrir sur Instagram",
  "Toutes les interventions",
  "Voir plus de dossiers",
  "Le compte officiel de LEA",
  "Une interruption",
  "Le format de la demande est invalide.",
  "Votre demande est trop volumineuse.",
  "La demande est vide.",
  "Chargement des visuels",
]);
sources.add("Réponses aux questions fréquentes");
sources.add("Fil d’Ariane");
for (const file of files) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function walk(node) {
    if (ts.isStringLiteral(node) || ts.isJsxText(node)) {
      const value = node.text.replace(/\s+/g, " ").trim();
      if (
        value &&
        (/[àâçéèêëîïôùûüœ’]/i.test(value) ||
          /^(Avant|Après|Publication Instagram|Source :|Photo après :|Voir en grand|Aller au contenu|Navigation principale|Formulaire de premier contact|Envoi temporairement indisponible|Ouvrir le menu|Fermer le menu)$/.test(
            value,
          )) &&
        !/[{}<>]|process\.|@\//.test(value) &&
        !value.startsWith("http") &&
        !value.startsWith("Test mode")
      )
        sources.add(value);
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
}
fs.writeFileSync(
  "src/content/i18n/ui-fr.json",
  JSON.stringify([...sources], null, 2) + "\n",
);
const { contentCatalog } = await import("../src/lib/i18n/catalog.ts");
const seed = JSON.parse(fs.readFileSync("src/content/cms-seed.json", "utf8"));
seed.gallery.items = [
  ...seed.gallery.items,
  ...JSON.parse(
    fs.readFileSync("src/content/instagram-candidates.json", "utf8"),
  ),
];
const entries = contentCatalog(seed);
fs.writeFileSync(
  "src/content/i18n/catalog.json",
  JSON.stringify(entries, null, 2) + "\n",
);
console.log(`${entries.length} entries, ${sources.size} interface strings`);
