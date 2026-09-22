import fs from "node:fs";

const source = {
  hairTitle: "Greffe capillaire — ligne frontale",
  hairCaption:
    "Comparaison avant/après fournie par LEA Aesthetic. Le résultat observé est propre à cette personne.",
  hairBefore:
    "Portrait de face avant une greffe capillaire, avec préparation de la ligne frontale.",
  hairAfter:
    "Portrait de face après une greffe capillaire, avec la nouvelle ligne frontale visible.",
  credit: "LEA Aesthetic — images fournies",
  faceThreeQuarterTitle: "Lifting du tiers moyen — vue de trois quarts",
  faceCaption:
    "Comparaison avant/après d’un lifting du tiers moyen du visage, selon les images fournies par LEA Aesthetic. Le résultat varie selon chaque personne.",
  faceThreeQuarterBefore:
    "Vue de trois quarts avant un lifting du tiers moyen du visage.",
  faceThreeQuarterAfter:
    "Vue de trois quarts après un lifting du tiers moyen du visage.",
  faceProfileTitle: "Lifting du tiers moyen — vue de profil",
  faceProfileBefore: "Vue de profil avant un lifting du tiers moyen du visage.",
  faceProfileAfter: "Vue de profil après un lifting du tiers moyen du visage.",
  hairCategory: "Greffe capillaire",
  pluralCount: "comparaisons présentées",
  singularCount: "comparaison présentée",
};

const translations = {
  en: [
    "Hair transplant — hairline",
    "Before-and-after comparison provided by LEA Aesthetic. The outcome shown is specific to this individual.",
    "Front-facing portrait before a hair transplant, with the hairline prepared.",
    "Front-facing portrait after a hair transplant, with the new hairline visible.",
    "LEA Aesthetic — images provided",
    "Midface lift — three-quarter view",
    "Before-and-after comparison of a midface lift, based on images provided by LEA Aesthetic. Outcomes vary from person to person.",
    "Three-quarter view before a midface lift.",
    "Three-quarter view after a midface lift.",
    "Midface lift — profile view",
    "Profile view before a midface lift.",
    "Profile view after a midface lift.",
    "Hair transplant",
    "comparisons shown",
    "comparison shown",
  ],
  es: [
    "Trasplante capilar — línea frontal",
    "Comparación del antes y después proporcionada por LEA Aesthetic. El resultado mostrado es propio de esta persona.",
    "Retrato frontal antes de un trasplante capilar, con preparación de la línea frontal.",
    "Retrato frontal después de un trasplante capilar, con la nueva línea frontal visible.",
    "LEA Aesthetic — imágenes proporcionadas",
    "Lifting del tercio medio facial — vista de tres cuartos",
    "Comparación antes y después de un lifting del tercio medio facial, según las imágenes proporcionadas por LEA Aesthetic. Los resultados varían de una persona a otra.",
    "Vista de tres cuartos antes de un lifting del tercio medio facial.",
    "Vista de tres cuartos después de un lifting del tercio medio facial.",
    "Lifting del tercio medio facial — vista de perfil",
    "Vista de perfil antes de un lifting del tercio medio facial.",
    "Vista de perfil después de un lifting del tercio medio facial.",
    "Trasplante capilar",
    "comparaciones presentadas",
    "comparación presentada",
  ],
  it: [
    "Trapianto di capelli — attaccatura",
    "Confronto prima/dopo fornito da LEA Aesthetic. Il risultato mostrato è specifico di questa persona.",
    "Ritratto frontale prima di un trapianto di capelli, con preparazione dell’attaccatura.",
    "Ritratto frontale dopo un trapianto di capelli, con la nuova attaccatura visibile.",
    "LEA Aesthetic — immagini fornite",
    "Lifting del terzo medio del viso — vista a tre quarti",
    "Confronto prima/dopo di un lifting del terzo medio del viso, in base alle immagini fornite da LEA Aesthetic. I risultati variano da persona a persona.",
    "Vista a tre quarti prima di un lifting del terzo medio del viso.",
    "Vista a tre quarti dopo un lifting del terzo medio del viso.",
    "Lifting del terzo medio del viso — vista di profilo",
    "Vista di profilo prima di un lifting del terzo medio del viso.",
    "Vista di profilo dopo un lifting del terzo medio del viso.",
    "Trapianto di capelli",
    "confronti presentati",
    "confronto presentato",
  ],
  pt: [
    "Transplante capilar — linha frontal",
    "Comparação antes/depois fornecida pela LEA Aesthetic. O resultado apresentado é específico desta pessoa.",
    "Retrato de frente antes de um transplante capilar, com preparação da linha frontal.",
    "Retrato de frente depois de um transplante capilar, com a nova linha frontal visível.",
    "LEA Aesthetic — imagens fornecidas",
    "Lifting do terço médio da face — vista de três quartos",
    "Comparação antes/depois de um lifting do terço médio da face, com base nas imagens fornecidas pela LEA Aesthetic. Os resultados variam de pessoa para pessoa.",
    "Vista de três quartos antes de um lifting do terço médio da face.",
    "Vista de três quartos depois de um lifting do terço médio da face.",
    "Lifting do terço médio da face — vista de perfil",
    "Vista de perfil antes de um lifting do terço médio da face.",
    "Vista de perfil depois de um lifting do terço médio da face.",
    "Transplante capilar",
    "comparações apresentadas",
    "comparação apresentada",
  ],
  ru: [
    "Пересадка волос — линия роста волос",
    "Сравнение до и после предоставлено LEA Aesthetic. Показанный результат индивидуален.",
    "Портрет анфас до пересадки волос, с разметкой линии роста волос.",
    "Портрет анфас после пересадки волос, видна новая линия роста волос.",
    "LEA Aesthetic — предоставленные изображения",
    "Лифтинг средней зоны лица — ракурс в три четверти",
    "Сравнение до и после лифтинга средней зоны лица по изображениям, предоставленным LEA Aesthetic. Результаты индивидуальны.",
    "Ракурс в три четверти до лифтинга средней зоны лица.",
    "Ракурс в три четверти после лифтинга средней зоны лица.",
    "Лифтинг средней зоны лица — вид в профиль",
    "Вид в профиль до лифтинга средней зоны лица.",
    "Вид в профиль после лифтинга средней зоны лица.",
    "Пересадка волос",
    "представленные сравнения",
    "представленное сравнение",
  ],
  tr: [
    "Saç ekimi — ön saç çizgisi",
    "LEA Aesthetic tarafından sağlanan öncesi/sonrası karşılaştırması. Gösterilen sonuç bu kişiye özeldir.",
    "Saç ekimi öncesinde ön saç çizgisi hazırlanmış, önden portre.",
    "Saç ekimi sonrasında yeni ön saç çizgisinin görüldüğü önden portre.",
    "LEA Aesthetic — sağlanan görseller",
    "Orta yüz germe — üç çeyrek görünüm",
    "LEA Aesthetic tarafından sağlanan görsellere dayanan orta yüz germe öncesi/sonrası karşılaştırması. Sonuçlar kişiden kişiye değişir.",
    "Orta yüz germe öncesi üç çeyrek görünüm.",
    "Orta yüz germe sonrası üç çeyrek görünüm.",
    "Orta yüz germe — profil görünümü",
    "Orta yüz germe öncesi profil görünümü.",
    "Orta yüz germe sonrası profil görünümü.",
    "Saç ekimi",
    "sunulan karşılaştırmalar",
    "sunulan karşılaştırma",
  ],
};

const keys = Object.values(source);
for (const [locale, values] of Object.entries(translations)) {
  const file = `src/content/i18n/${locale}.json`;
  const dictionary = JSON.parse(fs.readFileSync(file, "utf8"));
  keys.forEach((key, index) => {
    dictionary[key] = values[index];
  });
  fs.writeFileSync(file, `${JSON.stringify(dictionary, null, 2)}\n`);
}
