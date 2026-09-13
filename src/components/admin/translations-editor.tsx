"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Languages, RotateCcw } from "lucide-react";
import { contentCatalog } from "@/lib/i18n/catalog";
import {
  languageNames,
  locales,
  localizePath,
  type TranslationLocale,
} from "@/lib/i18n/config";
import type { SiteContent } from "@/lib/cms/types";
import type { Path } from "./editor";
import "./translations-editor.css";

const groups: Record<string, string> = {
  settings: "Identité et coordonnées",
  navigation: "Navigation",
  treatments: "Interventions",
  steps: "Votre parcours",
  faqs: "FAQ",
  gallery: "Avant / après",
  certificates: "Certificats et autorisations",
  home: "Accueil",
  agence: "L’agence",
  chirurgien: "Le chirurgien",
  interventions: "Interventions",
  treatment: "Fiches interventions",
  parcours: "Votre parcours",
  faq: "FAQ",
  contact: "Contact",
  legal: "Informations légales",
  header: "En-tête",
  footer: "Pied de page",
  form: "Formulaire",
  invitation: "Invitation au contact",
  notFound: "Page introuvable",
  seo: "Référencement",
  interface: "Boutons et messages système",
};
function groupName(context: string) {
  const parts = context.split(".");
  return groups[parts[0] === "copy" ? parts[1] : parts[0]] || context;
}
export function TranslationsEditor({
  content,
  update,
  search,
}: {
  content: SiteContent;
  update: (path: Path, value: unknown) => void;
  search: string;
}) {
  const [locale, setLocale] = useState<TranslationLocale>("en");
  const [dictionary, setDictionary] = useState<{
    locale: string;
    messages: Record<string, string>;
  } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [group, setGroup] = useState("all");
  const [missingOnly, setMissingOnly] = useState(false);
  const [limit, setLimit] = useState(40);
  const [editingSource, setEditingSource] = useState("");
  const catalog = useMemo(() => contentCatalog(content), [content]);
  const entry = content.translations[locale];
  const ready = dictionary?.locale === locale;
  const builtins = ready ? dictionary.messages : {};
  const target = (source: string) =>
    Object.hasOwn(entry.messages, source)
      ? entry.messages[source]
      : builtins[source] || "";
  const missing = ready
    ? catalog.filter(({ source }) => !target(source).trim()).length
    : 0;
  const groupOptions = [
    ...new Set(catalog.flatMap((item) => item.contexts.map(groupName))),
  ];
  const rows = catalog.filter(
    ({ source, contexts }) =>
      (group === "all" ||
        contexts.some((context) => groupName(context) === group)) &&
      (!missingOnly || !target(source).trim() || editingSource === source) &&
      (!search ||
        `${source} ${target(source)} ${contexts.map(groupName).join(" ")}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase())),
  );
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/translations?locale=${locale}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.message || "Chargement impossible.");
        return body;
      })
      .then((messages) => {
        setDictionary({ locale, messages });
        setError("");
      })
      .catch((failure) => {
        if (failure.name !== "AbortError") setError(failure.message);
      });
    return () => controller.abort();
  }, [locale, retry]);
  return (
    <div className="translation-editor">
      <div className="admin-card translation-intro">
        <Languages size={25} />
        <div>
          <h2>Une voix, sept langues.</h2>
          <p>
            Le français se modifie dans les rubriques habituelles. Ici, adaptez
            les textes de chaque langue, puis enregistrez et publiez. Les
            photos, liens, coordonnées et interventions sont communs à toutes
            les versions.
          </p>
        </div>
      </div>
      <div
        className="translation-language-tabs"
        role="group"
        aria-label="Langue à modifier"
      >
        {locales
          .filter((code) => code !== "fr")
          .map((code) => (
            <button
              key={code}
              aria-pressed={locale === code}
              onClick={() => {
                setLocale(code);
                setLimit(40);
                setError("");
              }}
            >
              <span>{code.toUpperCase()}</span>
              <span lang={code}>{languageNames[code]}</span>
            </button>
          ))}
      </div>
      <div className="admin-card translation-controls">
        <label className="translation-toggle">
          <input
            type="checkbox"
            checked={entry.enabled}
            onChange={(event) =>
              update(["translations", locale, "enabled"], event.target.checked)
            }
          />
          Proposer cette langue dans le sélecteur et le plan du site
        </label>
        <p>
          Les adresses déjà partagées restent accessibles. Le français est
          toujours proposé.
        </p>
        <a
          className="admin-button secondary"
          href={localizePath("/", locale)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Voir cette version <ArrowUpRight size={15} />
        </a>
        <div className="translation-filter-row">
          <label>
            Section
            <select
              value={group}
              onChange={(event) => {
                setGroup(event.target.value);
                setLimit(40);
              }}
            >
              <option value="all">Toutes les sections</option>
              {groupOptions.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="translation-toggle">
            <input
              type="checkbox"
              checked={missingOnly}
              onChange={(event) => {
                setMissingOnly(event.target.checked);
                setLimit(40);
              }}
            />
            Textes à compléter uniquement
          </label>
        </div>
        <p role="status">
          {ready
            ? `${catalog.length - missing} / ${catalog.length} textes renseignés · ${missing} à compléter`
            : "Chargement des traductions…"}
        </p>
        <p className="translation-hint">
          Si vous changez un texte français, sa nouvelle version est signalée
          ici. En attendant sa traduction, le texte français est affiché. Aucun
          service de traduction externe n’est utilisé.
        </p>
        {error && (
          <div role="alert">
            {error}{" "}
            <button
              className="admin-button secondary"
              onClick={() => setRetry(retry + 1)}
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
      {ready && (
        <>
          <p className="translation-results">
            {rows.length} texte{rows.length > 1 ? "s" : ""} dans cette
            sélection. Utilisez la recherche en haut du panneau pour retrouver
            une phrase.
          </p>
          {rows.slice(0, limit).map(({ source, contexts }) => (
            <article className="admin-card translation-row" key={source}>
              <div>
                <span className="translation-label">FR · Français</span>
                <p className="translation-source" lang="fr">
                  {source}
                </p>
                <small>
                  {[...new Set(contexts.map(groupName))].join(" · ")}
                </small>
              </div>
              <div>
                <label
                  className="translation-label"
                  htmlFor={`translation-${catalog.findIndex((item) => item.source === source)}`}
                >
                  {locale.toUpperCase()} · {languageNames[locale]}
                </label>
                <textarea
                  id={`translation-${catalog.findIndex((item) => item.source === source)}`}
                  lang={locale}
                  rows={source.length > 200 ? 6 : source.length > 80 ? 4 : 2}
                  maxLength={10000}
                  value={target(source)}
                  placeholder="Traduction à compléter"
                  onFocus={() => setEditingSource(source)}
                  onBlur={() => {
                    if (
                      Object.hasOwn(entry.messages, source) &&
                      !entry.messages[source].trim()
                    ) {
                      const messages = { ...entry.messages };
                      delete messages[source];
                      update(["translations", locale, "messages"], messages);
                    }
                    setEditingSource("");
                  }}
                  onChange={(event) =>
                    update(
                      ["translations", locale, "messages", source],
                      event.target.value,
                    )
                  }
                />
                <div className="translation-row-footer">
                  <small>
                    {Object.hasOwn(entry.messages, source)
                      ? "Traduction personnalisée"
                      : builtins[source]
                        ? "Traduction initiale"
                        : "Français affiché en attendant"}
                  </small>
                  {Object.hasOwn(entry.messages, source) && (
                    <button
                      type="button"
                      onClick={() => {
                        const messages = { ...entry.messages };
                        delete messages[source];
                        update(["translations", locale, "messages"], messages);
                      }}
                    >
                      <RotateCcw size={13} />
                      Rétablir
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
          {rows.length > limit && (
            <button
              className="admin-button secondary"
              onClick={() => setLimit(limit + 40)}
            >
              Afficher 40 textes supplémentaires
            </button>
          )}
          {!rows.length && (
            <p className="admin-card">
              Aucun texte ne correspond à ces filtres.
            </p>
          )}
        </>
      )}
    </div>
  );
}
