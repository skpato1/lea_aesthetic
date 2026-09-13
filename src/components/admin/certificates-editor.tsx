"use client";
/* eslint-disable @next/next/no-img-element -- Private documents require authenticated uncached media requests. */
import { useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2, Upload } from "lucide-react";
import { Field, type EditorProps } from "./editor";
import {
  certificateTemplate,
  certificateIsVisible,
  type Certificate,
} from "@/lib/cms/certificates";
export function CertificatesEditor(
  props: EditorProps & { upload: (file: File) => Promise<void> },
) {
  const { certificates } = props.content;
  const [opened, setOpened] = useState("");
  const index = props.content.homeSections.findIndex(
    (section) => section.id === "certificates",
  );
  function change(
    index: number,
    key: keyof Certificate,
    value: string | boolean,
  ) {
    const item = { ...certificates.items[index], [key]: value };
    if (!["verified", "visible"].includes(key)) {
      item.verified = false;
      item.visible = false;
    }
    if (key === "verified" && !value) item.visible = false;
    props.update(["certificates", "items", index], item);
  }
  function move(index: number, offset: number) {
    const items = [...certificates.items];
    [items[index], items[index + offset]] = [
      items[index + offset],
      items[index],
    ];
    props.update(["certificates", "items"], items);
  }
  return (
    <div className="admin-gallery-editor">
      <p className="admin-hint">
        Présentez uniquement des originaux authentiques, avec le titulaire exact
        et une source officielle. Une autorisation hospitalière ne certifie pas
        l’agence. Masquez les identifiants personnels non nécessaires avant
        import.
      </p>
      <p className="admin-hint">
        Vérifications :{" "}
        <a
          href="https://shgmturizmdb.saglik.gov.tr/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ministère turc de la Santé
        </a>{" "}
        ·{" "}
        <a
          href="https://www.jointcommission.org/en-us/about-us/recognizing-excellence/find-accredited-organizations"
          target="_blank"
          rel="noopener noreferrer"
        >
          Annuaire des organismes accrédités
        </a>
        . Renseignez ensuite la page officielle propre au titulaire, pas
        seulement la page d’accueil de l’organisme.
      </p>
      <Field
        label="Afficher la section Certificats sur l’accueil"
        value={props.content.homeSections[index].visible}
        onChange={(value) =>
          props.update(["homeSections", index, "visible"], value)
        }
      />
      <details className="admin-editor-block">
        <summary>Présentation et libellés de la section</summary>
        <div className="admin-fields">
          {Object.entries(certificates)
            .filter(([key]) => key !== "items")
            .map(([key, value]) => (
              <Field
                key={key}
                label={
                  key === "title"
                    ? "Titre de la section"
                    : key === "introduction"
                      ? "Introduction"
                      : `Texte · ${key}`
                }
                value={value as string}
                onChange={(value) => props.update(["certificates", key], value)}
              />
            ))}
        </div>
      </details>
      <div className="admin-collection-head">
        <p>{certificates.items.length} document(s)</p>
        <button
          className="admin-button"
          onClick={() => {
            const id = crypto.randomUUID();
            setOpened(id);
            props.update(
              ["certificates", "items"],
              [
                ...certificates.items,
                { ...certificateTemplate, id, title: "Nouveau certificat" },
              ],
            );
          }}
        >
          <Plus size={16} />
          Ajouter un certificat
        </button>
      </div>
      {certificates.items.map((item, index) => {
        if (
          props.search &&
          !JSON.stringify(item)
            .toLowerCase()
            .includes(props.search.toLowerCase())
        )
          return null;
        const media = props.media.find((entry) => entry.url === item.image);
        const blocked = !!media?.publicationBlocked;
        return (
          <details
            key={item.id}
            className="admin-editor-block"
            open={opened === item.id || !!props.search ? true : undefined}
          >
            <summary>
              <span>
                {String(index + 1).padStart(2, "0")} · {item.title}
              </span>
              <em>
                {blocked
                  ? "Examen privé"
                  : certificateIsVisible(item)
                    ? "Prêt à publier"
                    : "Masqué"}
              </em>
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
                  disabled={index === certificates.items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  className="danger"
                  onClick={() =>
                    props.update(
                      ["certificates", "items"],
                      certificates.items.filter(
                        (entry) => entry.id !== item.id,
                      ),
                    )
                  }
                >
                  <Trash2 size={15} />
                  Retirer le dossier
                </button>
              </div>
              {blocked && (
                <div className="admin-notice error" role="note">
                  <strong>Visuel non publiable en l’état.</strong>
                  <p>{media.reviewNote}</p>
                  <p>
                    Remplacez-le par l’original authentique et vérifiez son
                    titulaire auprès de l’émetteur.
                  </p>
                </div>
              )}
              {item.image && (
                <img
                  src={item.image}
                  alt="Document réservé à l’examen administratif"
                  style={{
                    width: "100%",
                    height: 300,
                    objectFit: "contain",
                    background: "#f4eeeb",
                    borderRadius: 12,
                  }}
                />
              )}
              <label className="admin-field">
                <span>Image du certificat</span>
                <select
                  value={item.image}
                  onChange={(event) =>
                    change(index, "image", event.target.value)
                  }
                >
                  <option value="">Choisir une image</option>
                  {props.media
                    .filter(
                      (entry) =>
                        !entry.publicationBlocked || entry.url === item.image,
                    )
                    .map((entry) => (
                      <option key={entry.id} value={entry.url}>
                        {entry.name}
                        {entry.publicationBlocked ? " — examen privé" : ""}
                      </option>
                    ))}
                </select>
              </label>
              <label
                className="admin-button secondary"
                style={{ alignSelf: "start" }}
              >
                <Upload size={16} />
                Importer un original
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) await props.upload(file);
                    event.target.value = "";
                  }}
                />
              </label>
              {Object.entries({
                title: "Titre du certificat",
                holder: "Titulaire exact du document",
                issuer: "Organisme émetteur",
                scope: "Portée de l’autorisation",
                reference: "Référence publique du certificat",
                alt: "Description de l’image",
                verificationUrl: "Lien de vérification officiel",
              }).map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={item[key as keyof Certificate] as string}
                  onChange={(value) =>
                    change(index, key as keyof Certificate, value)
                  }
                />
              ))}
              {(["issuedOn", "expiresOn"] as const).map((key) => (
                <label key={key} className="admin-field">
                  <span>
                    {key === "issuedOn"
                      ? "Date de délivrance (facultative)"
                      : "Fin de validité (facultative)"}
                  </span>
                  <input
                    type="date"
                    value={item[key]}
                    onChange={(event) => change(index, key, event.target.value)}
                  />
                </label>
              ))}
              <Field
                label="Original, titulaire et validité vérifiés auprès de l’émetteur"
                value={item.verified}
                readOnly={blocked}
                onChange={(value) => change(index, "verified", value)}
              />
              <Field
                label="Présenter ce certificat sur le site"
                value={item.visible}
                readOnly={blocked || !item.verified}
                onChange={(value) => change(index, "visible", value)}
              />
              <p className="admin-hint">
                Toute modification du document ou de ses informations annule la
                vérification. Les documents expirés sont automatiquement
                masqués. Une restauration depuis l’historique nécessite une
                nouvelle vérification.
              </p>
            </div>
          </details>
        );
      })}
    </div>
  );
}
