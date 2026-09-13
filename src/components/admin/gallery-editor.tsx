"use client";
/* eslint-disable @next/next/no-img-element -- Private patient media must bypass public image caches. */
import { ArrowUp, ArrowDown, Plus, Trash2, ImagePlus } from "lucide-react";
import { useState } from "react";
import { Field, type EditorProps } from "./editor";
import { resultTemplate, instagramPostUrl } from "@/lib/cms/gallery";
import type { ResultCase } from "@/lib/cms/types";
import "./gallery-editor.css";

export function GalleryEditor(
  props: EditorProps & { upload: (file: File) => Promise<void> },
) {
  const { gallery } = props.content;
  const [newCaseId, setNewCaseId] = useState("");
  const sectionIndex = props.content.homeSections.findIndex(
    (section) => section.id === "gallery",
  );
  const updateCase = (
    index: number,
    key: keyof ResultCase,
    value: string | boolean,
  ) => {
    const item = { ...gallery.items[index], [key]: value };
    if (
      [
        "beforeImage",
        "afterImage",
        "instagramUrl",
        "mode",
        "sourceLabel",
        "sourceUrl",
      ].includes(key)
    ) {
      item.verified = false;
      item.consentConfirmed = false;
      item.visible = false;
    }
    props.update(["gallery", "items", index], item);
  };
  const move = (index: number, by: number) => {
    const items = [...gallery.items];
    [items[index], items[index + by]] = [items[index + by], items[index]];
    props.update(["gallery", "items"], items);
  };
  return (
    <div className="admin-gallery-editor">
      <p className="admin-hint">
        Ajoutez uniquement des cas authentiques dont la diffusion sur ce site
        est autorisée. N’indiquez ni nom de patient, ni coordonnées, ni dossier
        médical. Une photo publiée sur un autre compte n’est pas un résultat de
        LEA.
      </p>
      <Field
        label="Afficher la section Avant / après sur l’accueil"
        value={props.content.homeSections[sectionIndex].visible}
        onChange={(value) =>
          props.update(["homeSections", sectionIndex, "visible"], value)
        }
      />
      <details className="admin-editor-block">
        <summary>Présentation de la section</summary>
        <div className="admin-fields">
          {Object.entries({
            eyebrow: "Surtitre",
            title: "Titre de la galerie",
            introduction: "Introduction de la galerie",
            instagramLabel: "Libellé du bouton Instagram",
            emptyTitle: "Titre en l’absence de dossiers",
            emptyText: "Texte en l’absence de dossiers",
          }).map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={gallery[key as keyof Omit<typeof gallery, "items">]}
              onChange={(value) => props.update(["gallery", key], value)}
            />
          ))}
        </div>
      </details>
      <div className="admin-collection-head">
        <p>
          {gallery.items.length}{" "}
          {gallery.items.length === 1 ? "dossier" : "dossiers"}
        </p>
        <button
          className="admin-button"
          onClick={() => {
            const id = crypto.randomUUID();
            setNewCaseId(id);
            props.update(
              ["gallery", "items"],
              [
                ...gallery.items,
                { ...resultTemplate, id, title: "Nouveau dossier" },
              ],
            );
          }}
        >
          <Plus size={16} />
          Ajouter un dossier
        </button>
      </div>
      {!gallery.items.length && (
        <div className="admin-empty">
          Aucun avant / après n’est publié pour le moment. Le site affiche un
          lien vers votre compte Instagram. Ajoutez une paire de photos ou le
          lien précis d’une publication pour préparer le premier dossier.
        </div>
      )}
      {gallery.items.map((item, index) => {
        if (
          props.search &&
          !JSON.stringify(item)
            .toLowerCase()
            .includes(props.search.toLowerCase())
        )
          return null;
        return (
          <details
            className="admin-editor-block"
            key={item.id}
            open={item.id === newCaseId || !!props.search ? true : undefined}
          >
            <summary>
              <span>
                {String(index + 1).padStart(2, "0")} ·{" "}
                {item.title || "Sans titre"}
              </span>
              <em>{item.visible ? "Prêt à publier" : "Masqué"}</em>
            </summary>
            <div className="admin-fields">
              <div className="admin-row-tools">
                <button
                  aria-label={`Monter ${item.title}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  aria-label={`Descendre ${item.title}`}
                  disabled={index === gallery.items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  className="danger"
                  onClick={() =>
                    props.update(
                      ["gallery", "items"],
                      gallery.items.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 size={16} />
                  Supprimer ce dossier
                </button>
              </div>
              <Field
                label="Titre du dossier"
                value={item.title}
                onChange={(value) => updateCase(index, "title", value)}
              />
              <label className="admin-field">
                <span>Intervention du dossier</span>
                <select
                  value={item.treatmentSlug}
                  onChange={(e) =>
                    updateCase(index, "treatmentSlug", e.target.value)
                  }
                >
                  <option value="">Choisir une intervention</option>
                  {props.content.treatments.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Format du dossier</span>
                <select
                  value={item.mode}
                  onChange={(e) => updateCase(index, "mode", e.target.value)}
                >
                  <option value="photos">Deux photos : avant et après</option>
                  <option value="instagram">Publication Instagram</option>
                </select>
              </label>
              {item.mode === "photos" ? (
                <>
                  <label className="admin-gallery-upload">
                    <ImagePlus size={18} />
                    <span>Ajouter une photo à la médiathèque</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) void props.upload(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <p className="admin-hint">
                    Deux vues distinctes de la même personne. Conservez le
                    cadrage, sans retouche du résultat. JPEG, PNG ou WebP, 5 Mo
                    maximum.
                  </p>
                  <div className="admin-gallery-pair">
                    {(["before", "after"] as const).map((side) => (
                      <div key={side}>
                        <div className="admin-gallery-photo">
                          {item[`${side}Image`] ? (
                            <img
                              src={item[`${side}Image`]}
                              alt={
                                side === "before"
                                  ? "Aperçu avant"
                                  : "Aperçu après"
                              }
                            />
                          ) : (
                            <span>{side === "before" ? "Avant" : "Après"}</span>
                          )}
                        </div>
                        <label className="admin-field">
                          <span>
                            {side === "before" ? "Photo avant" : "Photo après"}
                          </span>
                          <select
                            value={item[`${side}Image`]}
                            onChange={(e) =>
                              updateCase(index, `${side}Image`, e.target.value)
                            }
                          >
                            <option value="">Sélectionner une image</option>
                            {props.media.map((media) => (
                              <option key={media.id} value={media.url}>
                                {media.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Field
                          label={
                            side === "before"
                              ? "Description de la photo avant"
                              : "Description de la photo après"
                          }
                          value={item[`${side}Alt`]}
                          onChange={(value) =>
                            updateCase(index, `${side}Alt`, value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <Field
                    label="Lien de la publication Instagram"
                    value={item.instagramUrl}
                    onChange={(value) =>
                      updateCase(index, "instagramUrl", value)
                    }
                  />
                  {instagramPostUrl(item.instagramUrl) && (
                    <a
                      className="admin-button secondary"
                      href={instagramPostUrl(item.instagramUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ouvrir cette publication pour la vérifier
                    </a>
                  )}
                  <p className="admin-hint">
                    Copiez le lien exact d’une publication ou d’un reel du
                    compte LEA. Le lecteur se charge seulement à la demande du
                    visiteur, qui peut aussi ouvrir la publication sur
                    Instagram.
                  </p>
                </>
              )}
              <Field
                label="Légende factuelle du dossier"
                value={item.caption}
                onChange={(value) => updateCase(index, "caption", value)}
              />
              <Field
                label="Délai de la photo après (facultatif, uniquement s’il est confirmé)"
                value={item.interval}
                onChange={(value) => updateCase(index, "interval", value)}
              />
              <Field
                label="Source ou crédit affiché"
                value={item.sourceLabel}
                onChange={(value) => updateCase(index, "sourceLabel", value)}
              />
              <Field
                label="Lien vers la source (facultatif)"
                value={item.sourceUrl}
                onChange={(value) => updateCase(index, "sourceUrl", value)}
              />
              <div className="admin-gallery-permissions">
                <Field
                  label="Je confirme qu’il s’agit d’un cas réel présenté par LEA, sans résultat fabriqué ni attribution trompeuse."
                  value={item.verified}
                  onChange={(value) => {
                    props.update(["gallery", "items", index], {
                      ...item,
                      verified: value,
                      visible: value ? item.visible : false,
                    });
                  }}
                />
                <Field
                  label="Je confirme disposer des droits sur les images et de l’autorisation de la personne concernée pour leur publication sur ce site."
                  value={item.consentConfirmed}
                  onChange={(value) => {
                    props.update(["gallery", "items", index], {
                      ...item,
                      consentConfirmed: value,
                      visible: value ? item.visible : false,
                    });
                  }}
                />
                <Field
                  label="Présenter ce dossier sur le site"
                  value={item.visible}
                  readOnly={!item.verified || !item.consentConfirmed}
                  onChange={(value) => updateCase(index, "visible", value)}
                />
                <p className="admin-hint">
                  Les nouveaux dossiers restent masqués. Le remplacement d’une
                  photo ou de sa source remet ces confirmations à zéro.
                  Enregistrer prépare le brouillon ; Publier met le site à jour.
                </p>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
