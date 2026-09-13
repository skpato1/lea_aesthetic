"use client";
/* eslint-disable @next/next/no-img-element -- Private media bypasses the public image optimizer. */
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import seed from "@/content/cms-seed.json";
import definitions from "@/content/cms-fields.json";
import type { SiteContent, MediaItem } from "@/lib/cms/types";
export type Path = (string | number)[];
export type EditorProps = {
  content: SiteContent;
  update: (path: Path, value: unknown) => void;
  media: MediaItem[];
  search: string;
};
const names: Record<string, string> = {
  name: "Nom",
  phone: "Téléphone",
  instagram: "Lien Instagram",
  location: "Localisation",
  description: "Description de l’agence",
  whatsappNumber: "Numéro WhatsApp (chiffres uniquement)",
  whatsappGeneral: "Message WhatsApp général",
  whatsappTreatment:
    "Message WhatsApp par intervention — conserver {intervention}",
  instagramHandle: "Nom affiché sur Instagram",
  seoTitle: "Titre général",
  socialTitle: "Texte de l’image de partage",
  indexable: "Autoriser l’indexation par les moteurs de recherche",
  label: "Libellé",
  href: "Lien",
  title: "Titre",
  text: "Résumé",
  detail: "Détails",
  question: "Question",
  answer: "Réponse",
  visible: "Visible sur le site",
  featured: "Présenter dans la FAQ de l’accueil",
  slug: "Adresse de la page",
  category: "Catégorie",
  short: "Résumé sur les cartes et pour le référencement",
  intro: "Introduction",
  aims: "Objectifs généraux",
  discussion: "Sujets à aborder en consultation",
  questions: "Questions utiles",
  number: "Numéro sur la carte",
  path: "Adresse de la page",
  logo: "Logo",
  portrait: "Portrait du chirurgien",
  istanbul: "Photographie d’Istanbul",
  healthTurkiye: "Signature Health Türkiye du pied de page",
  image: "Image de l’intervention",
  imageAlt: "Description accessible de l’image",
};
export const sectionNames: Record<string, string> = {
  hero: "Bannière principale",
  principles: "Les trois engagements",
  agency: "Présentation de l’agence",
  treatments: "Interventions",
  gallery: "Avant / après",
  certificates: "Certificats et autorisations",
  surgeon: "Le chirurgien",
  journey: "Le parcours",
  faq: "Questions fréquentes",
  contact: "Invitation à nous contacter",
};
export function Field({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
  readOnly?: boolean;
}) {
  if (typeof value === "boolean")
    return (
      <label className="admin-check">
        <input
          type="checkbox"
          checked={value}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>
    );
  const multiline =
    value.length > 110 ||
    /Texte|Résumé|Description|Introduction|Message|Réponse|Détails|Objectifs|Sujets|Questions/.test(
      label,
    );
  return (
    <label className="admin-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          readOnly={readOnly}
          rows={Math.min(8, Math.max(3, Math.ceil(value.length / 100)))}
          maxLength={10000}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          value={value}
          readOnly={readOnly}
          maxLength={10000}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export function CopyEditor({
  group,
  ...props
}: EditorProps & { group: keyof SiteContent["copy"] }) {
  const definition = definitions[group];
  const values = props.content.copy[group] as Record<string, string>;
  const sections = [...new Set(definition.fields.map((x) => x.section))];
  return (
    <div className="admin-copy-editor">
      {sections.map((section, index) => {
        const fields = definition.fields.filter(
          (field) =>
            field.section === section &&
            (!props.search ||
              `${field.label} ${values[field.key]}`
                .toLowerCase()
                .includes(props.search.toLowerCase())),
        );
        if (!fields.length) return null;
        const label =
          sectionNames[section] ||
          (
            {
              home: "Bannière principale",
              about: "Présentation de l’agence",
              services: "Interventions",
              doctors: "Le chirurgien",
              process: "Le parcours",
              appointment: "Invitation au contact",
              Contenu: definition.label,
              "page-intro": "Introduction",
              container: "Contenu de la page",
            } as Record<string, string>
          )[section] ||
          section.replaceAll("-", " ");
        return (
          <details
            key={`${section}-${!!props.search}`}
            className="admin-editor-block"
            open={!!props.search || sections.length === 1 || index === 0}
          >
            <summary>
              {label}
              <span>{fields.length} champs</span>
            </summary>
            <div className="admin-fields">
              {fields.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  value={values[field.key]}
                  onChange={(value) =>
                    props.update(["copy", group, field.key], value)
                  }
                />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
export function CollectionEditor({
  type,
  ...props
}: EditorProps & { type: "treatments" | "faqs" | "steps" | "navigation" }) {
  const items = props.content[type] as unknown as Record<string, unknown>[];
  const move = (index: number, by: number) => {
    const next = [...items];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    props.update([type], next);
  };
  function add() {
    const item = structuredClone(seed[type][0]) as unknown as Record<
      string,
      unknown
    >;
    for (const key of Object.keys(item)) {
      if (typeof item[key] === "string") item[key] = "";
      if (Array.isArray(item[key])) item[key] = [""];
    }
    if ("id" in item) item.id = crypto.randomUUID();
    if ("visible" in item) item.visible = true;
    if ("featured" in item) item.featured = false;
    if (type === "treatments") {
      item.name = "Nouvelle intervention";
      item.slug = `intervention-${crypto.randomUUID().slice(0, 8)}`;
      item.number = String(items.length + 1).padStart(2, "0");
    }
    if (type === "navigation") {
      item.label = "Nouveau lien";
      item.href = "/contact";
    }
    props.update([type], [...items, item]);
  }
  return (
    <div>
      <div className="admin-collection-head">
        <p>
          {items.length}{" "}
          {type === "treatments"
            ? "interventions"
            : type === "faqs"
              ? "questions"
              : type === "steps"
                ? "étapes"
                : "liens"}
        </p>
        <button className="admin-button secondary" onClick={add}>
          <Plus size={16} />
          Ajouter
        </button>
      </div>
      {items.map((item, index) => {
        const title = String(
          item.name ||
            item.question ||
            item.title ||
            item.label ||
            `Élément ${index + 1}`,
        );
        if (
          props.search &&
          !JSON.stringify(item)
            .toLowerCase()
            .includes(props.search.toLowerCase())
        )
          return null;
        const protectedSlug =
          type === "treatments" &&
          seed.treatments.some((x) => x.slug === item.slug);
        return (
          <details
            key={String(item.id || item.slug || index)}
            className="admin-editor-block"
          >
            <summary>
              <span>
                {String(index + 1).padStart(2, "0")} · {title}
              </span>
              {item.visible === false && <em>Masqué</em>}
            </summary>
            <div className="admin-fields">
              <div className="admin-row-tools">
                <button
                  aria-label={`Monter ${title}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  aria-label={`Descendre ${title}`}
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  className="danger"
                  disabled={protectedSlug}
                  onClick={() =>
                    props.update(
                      [type],
                      items.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
                {protectedSlug && (
                  <small>
                    Adresse historique conservée. Utilisez « Visible » pour
                    masquer.
                  </small>
                )}
              </div>
              {Object.entries(item)
                .filter(([key]) => key !== "id")
                .map(([key, value]) =>
                  type === "treatments" && key === "image" ? (
                    <div className="admin-fields" key={key}>
                      {Boolean(value) && (
                        <div className="admin-asset-preview">
                          <img src={String(value)} alt="Aperçu" />
                        </div>
                      )}
                      <label className="admin-field">
                        <span>{names[key]}</span>
                        <select
                          value={String(value)}
                          onChange={(event) =>
                            props.update(
                              [type, index, key],
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Aucune image</option>
                          {seed.treatments.find(
                            (entry) => entry.slug === item.slug && entry.image,
                          )?.image && (
                            <option
                              value={
                                seed.treatments.find(
                                  (entry) => entry.slug === item.slug,
                                )!.image
                              }
                            >
                              Illustration fournie
                            </option>
                          )}
                          {props.media.map((media) => (
                            <option key={media.id} value={media.url}>
                              {media.name} ({media.width} × {media.height})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : Array.isArray(value) ? (
                    <label className="admin-field" key={key}>
                      <span>{names[key] || key} — un élément par ligne</span>
                      <textarea
                        rows={5}
                        value={value.join("\n")}
                        onChange={(e) =>
                          props.update(
                            [type, index, key],
                            e.target.value.split("\n"),
                          )
                        }
                      />
                    </label>
                  ) : (
                    <Field
                      key={key}
                      label={names[key] || key}
                      value={value as string | boolean}
                      readOnly={key === "slug" && protectedSlug}
                      onChange={(value) =>
                        props.update([type, index, key], value)
                      }
                    />
                  ),
                )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
export function HomeSections(props: EditorProps) {
  const items = props.content.homeSections;
  function move(index: number, by: number) {
    const next = [...items];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    props.update(["homeSections"], next);
  }
  return (
    <div className="admin-section-order">
      {items.map((item, index) => (
        <div key={item.id}>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={item.visible}
              disabled={item.id === "hero"}
              onChange={(e) =>
                props.update(
                  ["homeSections", index, "visible"],
                  e.target.checked,
                )
              }
            />
            {sectionNames[item.id]}
          </label>
          <div className="admin-row-tools">
            <button
              disabled={index === 0}
              aria-label={`Monter ${sectionNames[item.id]}`}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={16} />
            </button>
            <button
              disabled={index === items.length - 1}
              aria-label={`Descendre ${sectionNames[item.id]}`}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
export function SettingsEditor(props: EditorProps) {
  return (
    <div className="admin-fields">
      {Object.entries(props.content.settings)
        .filter(([key]) => !["assets", "seoTitle"].includes(key))
        .map(([key, value]) => (
          <Field
            key={key}
            label={names[key] || key}
            value={value as string | boolean}
            onChange={(value) => props.update(["settings", key], value)}
          />
        ))}
      <p className="admin-hint">
        Activez l’indexation uniquement lorsque les informations légales et les
        conditions de publication ont été complétées.
      </p>
    </div>
  );
}
export function SEOEditor(props: EditorProps) {
  return (
    <div>
      {Object.entries(props.content.seo).map(([group, entry]) => (
        <details className="admin-editor-block" key={group}>
          <summary>
            {group === "home"
              ? "Accueil"
              : definitions[group as keyof typeof definitions]?.label || group}
          </summary>
          <div className="admin-fields">
            {Object.entries(entry).map(([key, value]) => (
              <Field
                key={key}
                label={names[key] || key}
                value={value}
                readOnly={key === "path"}
                onChange={(value) => props.update(["seo", group, key], value)}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
export function AssetEditor(props: EditorProps) {
  return (
    <div className="admin-asset-slots">
      {Object.entries(props.content.settings.assets).map(([key, value]) => (
        <div key={key}>
          <div className="admin-asset-preview">
            <img src={value} alt={names[key]} />
          </div>
          <label className="admin-field">
            <span>{names[key]}</span>
            <select
              value={value}
              onChange={(e) =>
                props.update(["settings", "assets", key], e.target.value)
              }
            >
              <option
                value={
                  seed.settings.assets[key as keyof typeof seed.settings.assets]
                }
              >
                {key === "logo"
                  ? "Logo LEA — version transparente"
                  : key === "healthTurkiye"
                    ? "Signature Health Türkiye fournie"
                    : "Image originale fournie"}
              </option>
              {key === "logo" && value === "/images/lea-logo.png" && (
                <option value={value}>Logo de la version précédente</option>
              )}
              {props.media.map((item) => (
                <option key={item.id} value={item.url}>
                  {item.name} ({item.width} × {item.height})
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
    </div>
  );
}
