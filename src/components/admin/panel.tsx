"use client";
/* eslint-disable @next/next/no-img-element -- Private media is served only to the authenticated owner before publication. */
/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation refreshes the published/preview snapshot and triggers the unsaved-changes guard. */
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Eye,
  FileText,
  Globe,
  History,
  House,
  Image as ImageIcon,
  LayoutList,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  AssetEditor,
  CollectionEditor,
  CopyEditor,
  HomeSections,
  SEOEditor,
  SettingsEditor,
  type Path,
} from "./editor";
import type { ContentState, MediaItem, SiteContent } from "@/lib/cms/types";
import definitions from "@/content/cms-fields.json";
import { Brand } from "@/components/brand";
import { GalleryEditor } from "./gallery-editor";
import { TranslationsEditor } from "./translations-editor";
import { CertificatesEditor } from "./certificates-editor";
type Identity = { email: string; csrf: string };
type Status = {
  configured: boolean;
  setup?: boolean;
  session?: Identity | null;
  message?: string;
};
type HistoryItem = {
  id: string;
  createdAt: number;
  email: string;
  revision: number;
};
const sections = [
  { id: "overview", label: "Vue d’ensemble", icon: House },
  { id: "home", label: "Accueil", icon: LayoutList },
  { id: "agence", label: "À propos", icon: FileText },
  { id: "interventions", label: "Interventions", icon: FileText },
  { id: "visualGuides", label: "Guides visuels", icon: ImageIcon },
  { id: "gallery", label: "Avant / après", icon: ImageIcon },
  {
    id: "certificates",
    label: "Certificats et autorisations",
    icon: ShieldCheck,
  },
  { id: "chirurgien", label: "Le chirurgien", icon: FileText },
  { id: "parcours", label: "Votre parcours", icon: FileText },
  { id: "faq", label: "FAQ", icon: MessageCircle },
  { id: "contact", label: "Contact et formulaire", icon: MessageCircle },
  { id: "legal", label: "Informations légales", icon: ShieldCheck },
  { id: "shared", label: "Éléments communs", icon: LayoutList },
  { id: "translations", label: "Langues et traductions", icon: Globe },
  { id: "media", label: "Images et logo", icon: ImageIcon },
  { id: "settings", label: "Coordonnées et réglages", icon: Settings },
  { id: "seo", label: "Référencement", icon: Globe },
  { id: "history", label: "Historique", icon: History },
  { id: "account", label: "Mon compte", icon: LockKeyhole },
];
const formatDate = (value: number) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
export function AdminPanel({
  initialBrand,
}: {
  initialBrand: { logo: string; name: string; location: string };
}) {
  const [status, setStatus] = useState<Status | null>(null),
    [identity, setIdentity] = useState<Identity | null>(null),
    [state, setState] = useState<ContentState | null>(null),
    [content, setContent] = useState<SiteContent | null>(null);
  const [active, setActive] = useState("overview"),
    [search, setSearch] = useState(""),
    [mobileMenu, setMobileMenu] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]),
    [history, setHistory] = useState<HistoryItem[]>([]);
  const [review, setReview] = useState<"publish" | "discard" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const dirty =
    !!state &&
    !!content &&
    JSON.stringify(state.draft) !== JSON.stringify(content);
  const unpublished =
    !!state && JSON.stringify(state.published) !== JSON.stringify(state.draft);
  const currentBrand = state
    ? {
        logo: state.published.settings.assets.logo,
        name: state.published.settings.name,
        location: state.published.settings.location,
      }
    : initialBrand;
  async function request<T>(
    action: string,
    body?: unknown,
    session = identity,
  ): Promise<T> {
    const response = await fetch(`/api/admin/${action}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { "x-csrf-token": session.csrf } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 && action !== "login") {
        setIdentity(null);
        setState(null);
        setContent(null);
      }
      throw new Error(data.message || "La demande n’a pas abouti.");
    }
    return data as T;
  }
  async function load(session = identity) {
    const [next, images, versions] = await Promise.all([
      request<ContentState>("content", undefined, session),
      request<MediaItem[]>("media", undefined, session),
      request<HistoryItem[]>("history", undefined, session),
    ]);
    setState(next);
    setContent(next.draft);
    setMedia(images);
    setHistory(versions);
  }
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    fetch("/api/admin/status", { cache: "no-store" })
      .then(async (response) => {
        const next = await response.json();
        if (!response.ok) throw new Error(next.message);
        setStatus(next);
        setPreview(!!next.preview);
        if (next.session) {
          setIdentity(next.session);
          await load(next.session);
        }
      })
      .catch((e) => setError(e.message));
    // Initial bootstrap only. Later requests are explicitly driven by user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (review) dialog.current?.showModal();
    else dialog.current?.close();
  }, [review]);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function update(path: Path, value: unknown) {
    setContent((previous) => {
      const next = structuredClone(previous)!;
      let cursor: Record<string | number, unknown> = next as unknown as Record<
        string | number,
        unknown
      >;
      for (const key of path.slice(0, -1))
        cursor = cursor[key] as Record<string | number, unknown>;
      cursor[path[path.length - 1]] = value;
      return next;
    });
  }
  async function save() {
    const next = await request<ContentState>("save", {
      revision: state!.revision,
      content,
    });
    setState(next);
    setContent(next.draft);
    setMessage(
      "Brouillon enregistré. Le site public reste sur la dernière version publiée.",
    );
    return next;
  }
  function navigate(id: string) {
    setActive(id);
    setSearch("");
    setMobileMenu(false);
    window.scrollTo({ top: 0 });
  }
  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      const next = await request<Identity>(status?.setup ? "setup" : "login", {
        email: form.get("email"),
        password: form.get("password"),
        ...(status?.setup ? { token: form.get("token") } : {}),
      });
      setIdentity(next);
      setStatus({ configured: true, setup: false, session: next });
      await load(next);
      setMessage("Bienvenue dans votre espace de gestion.");
    });
  }
  async function upload(file: File) {
    await run(async () => {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("La taille maximale est de 5 Mo.");
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          "x-csrf-token": identity!.csrf,
          "x-file-name": encodeURIComponent(file.name),
        },
        body: file,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMedia((previous) => [data, ...previous]);
      setMessage(
        "Image ajoutée. Sélectionnez son emplacement ci-dessous, puis enregistrez le brouillon.",
      );
    });
    if (fileInput.current) fileInput.current.value = "";
  }
  const flash = (
    <div className="admin-notices" aria-live="polite">
      {error && (
        <p role="alert" className="admin-notice error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="admin-notice success">
          <Check size={18} />
          {message}
        </p>
      )}
    </div>
  );
  if (!identity)
    return (
      <div className="admin-login">
        <div className="admin-login-story">
          <a
            href="/"
            className="admin-brand"
            aria-label="LEA Aesthetic, accueil"
          >
            <Brand
              src={currentBrand.logo}
              name={currentBrand.name}
              location={currentBrand.location}
              priority
            />
          </a>
          <div>
            <p className="admin-kicker">VOTRE ESPACE ÉDITORIAL</p>
            <h1>
              Un site vivant.
              <br />
              <em>Une gestion simple.</em>
            </h1>
            <p>
              Vos pages, vos images et vos informations, réunies dans un espace
              privé.
            </p>
          </div>
          <small>LEA Aesthetic · Administration du site</small>
        </div>
        <div className="admin-login-form">
          <a href="/" className="admin-back">
            Voir le site <ArrowUpRight size={16} />
          </a>
          <div className="admin-login-card">
            <span className="admin-lock">
              <LockKeyhole size={23} />
            </span>
            <p className="admin-kicker">ACCÈS RÉSERVÉ</p>
            <h2>
              {status?.setup
                ? "Créons votre accès."
                : "Heureux de vous retrouver."}
            </h2>
            {!status && !error && (
              <p role="status">Vérification de l’espace…</p>
            )}
            {flash}
            {status?.configured === false ? (
              <p>{status.message}</p>
            ) : (
              status && (
                <form onSubmit={authenticate}>
                  <p>
                    {status.setup
                      ? "Choisissez votre identifiant et un mot de passe personnel pour administrer le site."
                      : "Connectez-vous pour retrouver vos contenus et vos brouillons."}
                  </p>
                  {status.setup && (
                    <label className="admin-field">
                      <span>Code d’installation privé</span>
                      <input
                        name="token"
                        type="password"
                        required
                        autoComplete="off"
                      />
                      <small>
                        En local : fichier .data/admin-setup-token.txt du
                        projet. Sur Vercel : valeur ADMIN_SETUP_TOKEN.
                      </small>
                    </label>
                  )}
                  <label className="admin-field">
                    <span>Adresse e-mail</span>
                    <input
                      name="email"
                      type="email"
                      autoComplete="username"
                      required
                      maxLength={160}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Mot de passe</span>
                    <input
                      name="password"
                      type="password"
                      autoComplete={
                        status.setup ? "new-password" : "current-password"
                      }
                      minLength={12}
                      maxLength={128}
                      required
                    />
                    <small>
                      12 caractères minimum. Utilisez un mot de passe unique.
                    </small>
                  </label>
                  <button className="admin-button" disabled={busy}>
                    {busy ? (
                      <LoaderCircle className="spinner" size={18} />
                    ) : (
                      <LockKeyhole size={17} />
                    )}{" "}
                    {status.setup ? "Créer mon compte" : "Me connecter"}
                  </button>
                </form>
              )
            )}
            <p className="admin-hint">
              Cet accès est destiné à la gestion du site. Les visiteurs n’ont
              pas besoin de compte pour contacter LEA.
            </p>
          </div>
        </div>
      </div>
    );
  if (!state || !content)
    return (
      <div className="admin-loading">
        <LoaderCircle className="spinner" />
        <p>Chargement de vos contenus…</p>
        {flash}
        <button className="admin-button" onClick={() => run(() => load())}>
          Réessayer
        </button>
      </div>
    );
  const props = { content, update, media, search };
  const changed = Object.entries(state.draft.copy)
    .filter(
      ([key, value]) =>
        JSON.stringify(value) !==
        JSON.stringify(state.published.copy[key as keyof SiteContent["copy"]]),
    )
    .map(([key]) => definitions[key as keyof typeof definitions].label);
  for (const key of [
    "settings",
    "navigation",
    "treatments",
    "visualGuides",
    "gallery",
    "certificates",
    "steps",
    "faqs",
    "homeSections",
    "seo",
    "translations",
  ] as const)
    if (
      JSON.stringify(state.draft[key]) !== JSON.stringify(state.published[key])
    )
      changed.push(
        {
          settings: "Coordonnées et images",
          navigation: "Navigation",
          treatments: "Interventions",
          visualGuides: "Guides visuels",
          gallery: "Avant / après",
          certificates: "Certificats et autorisations",
          steps: "Étapes du parcours",
          faqs: "Questions fréquentes",
          homeSections: "Organisation de l’accueil",
          seo: "Référencement",
          translations: "Langues et traductions",
        }[key],
      );
  return (
    <div className="admin-shell">
      <aside
        className={`admin-sidebar ${mobileMenu ? "is-open" : ""}`}
        onKeyDown={(event) => {
          if (!mobileMenu) return;
          if (event.key === "Escape") {
            setMobileMenu(false);
            document
              .querySelector<HTMLButtonElement>(".admin-mobile-toggle")
              ?.focus();
          }
          if (event.key === "Tab") {
            const focusable = [
              ...event.currentTarget.querySelectorAll<HTMLElement>(
                "a,button:not(:disabled)",
              ),
            ];
            const first = focusable[0],
              last = focusable.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <a href="/" className="admin-brand" aria-label="LEA Aesthetic, accueil">
          <Brand
            src={currentBrand.logo}
            name={currentBrand.name}
            location={currentBrand.location}
            priority
          />
        </a>
        <div className="admin-sidebar-label">GESTION DU SITE</div>
        <nav aria-label="Sections administrables">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={id === active ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={17} />
              {label}
              {id === active && <ChevronRight size={14} />}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <span className="admin-avatar">
            {identity.email[0].toUpperCase()}
          </span>
          <div>
            <strong>Administrateur</strong>
            <small>{identity.email}</small>
          </div>
          <button
            aria-label="Se déconnecter"
            title="Se déconnecter"
            disabled={busy}
            onClick={() => {
              if (dirty) {
                setError(
                  "Enregistrez ou abandonnez vos modifications avant de vous déconnecter.",
                );
                return;
              }
              run(async () => {
                await request("logout", {});
                setIdentity(null);
                setState(null);
                setContent(null);
              });
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {mobileMenu && (
        <button
          aria-label="Fermer la navigation"
          className="admin-scrim"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="admin-workspace">
        <header className="admin-topbar">
          <button
            className="admin-mobile-toggle"
            aria-label="Ouvrir la navigation"
            onClick={() => {
              setMobileMenu(!mobileMenu);
              if (!mobileMenu)
                requestAnimationFrame(() =>
                  document
                    .querySelector<HTMLButtonElement>(
                      '.admin-sidebar button[aria-current="page"]',
                    )
                    ?.focus(),
                );
            }}
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
          <div className="admin-breadcrumb">
            Mon site <ChevronRight size={13} />
            <strong>{sections.find((x) => x.id === active)?.label}</strong>
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer">
            Voir le site <ArrowUpRight size={16} />
          </a>
        </header>
        <main className="admin-main" id="admin-content">
          <div className="admin-page-heading">
            <div>
              <p className="admin-kicker">LEA AESTHETIC · ESPACE ÉDITORIAL</p>
              <h1>
                {active === "overview"
                  ? "Votre site, à votre image."
                  : sections.find((x) => x.id === active)?.label}
              </h1>
              <p>
                {active === "overview"
                  ? "Prenez soin de votre présence en ligne. Préparez vos changements, puis publiez-les à votre rythme."
                  : "Les modifications sont préparées en brouillon avant d’être visibles sur le site."}
              </p>
            </div>
            <span
              className={`admin-status ${dirty || unpublished ? "draft" : ""}`}
            >
              <span />
              {dirty
                ? "Modifications non enregistrées"
                : unpublished
                  ? "Brouillon à publier"
                  : "Site à jour"}
            </span>
          </div>
          {flash}
          <div className="admin-savebar">
            <span>
              <Save size={16} />
              {dirty
                ? "Pensez à enregistrer vos modifications."
                : `Enregistré le ${formatDate(state.updatedAt)}`}
            </span>
            <div>
              <button
                className="admin-button secondary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    if (dirty) await save();
                    await request("preview", { enabled: !preview });
                    setPreview(!preview);
                    setMessage(
                      !preview
                        ? "Aperçu du brouillon activé. Ouvrez le site avec le lien « Voir l’aperçu »."
                        : "Aperçu désactivé. Votre navigateur affiche à nouveau le site publié.",
                    );
                  })
                }
              >
                <Eye size={16} />
                {preview ? "Quitter l’aperçu" : "Activer l’aperçu"}
              </button>
              {preview && (
                <a
                  className="admin-button secondary"
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Voir l’aperçu <ArrowUpRight size={15} />
                </a>
              )}
              <button
                className="admin-button secondary"
                disabled={!dirty || busy}
                onClick={() =>
                  run(async () => {
                    await save();
                  })
                }
              >
                <Save size={16} />
                {busy ? "En cours…" : "Enregistrer"}
              </button>
              <button
                className="admin-button"
                disabled={busy || dirty || !unpublished}
                onClick={() => setReview("publish")}
              >
                <Globe size={16} />
                Publier
              </button>
            </div>
          </div>
          {dirty && (
            <div className="admin-unsaved">
              Votre saisie est conservée lorsque vous changez de section.{" "}
              <button onClick={() => setReview("discard")}>
                Abandonner / recharger
              </button>
            </div>
          )}
          {active === "overview" ? (
            <>
              <div className="admin-overview-banner">
                <div>
                  <span className="admin-kicker">
                    PRÉPARER. VÉRIFIER. PUBLIER.
                  </span>
                  <h2>
                    Tout commence
                    <br />
                    <em>par votre contenu.</em>
                  </h2>
                  <p>
                    Personnalisez chaque page, actualisez vos coordonnées et
                    choisissez les images qui racontent LEA.
                  </p>
                  <button
                    className="admin-button"
                    onClick={() => navigate("home")}
                  >
                    Modifier l’accueil <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="admin-brand-art">
                  <Brand src={currentBrand.logo} caption={false} />
                </div>
              </div>
              <div className="admin-stats">
                <div>
                  <small>CONTENU</small>
                  <strong>
                    {content.treatments.filter((x) => x.visible).length}
                  </strong>
                  <span>interventions visibles</span>
                </div>
                <div>
                  <small>INFORMATION</small>
                  <strong>
                    {content.faqs.filter((x) => x.visible).length}
                  </strong>
                  <span>réponses dans la FAQ</span>
                </div>
                <div>
                  <small>PUBLICATION</small>
                  <strong className="admin-date">
                    {formatDate(state.publishedAt)}
                  </strong>
                  <span>dernière version publiée</span>
                </div>
              </div>
              <h2 className="admin-section-title">
                Que souhaitez-vous mettre à jour ?
              </h2>
              <div className="admin-quicklinks">
                {sections
                  .filter((x) =>
                    [
                      "home",
                      "interventions",
                      "chirurgien",
                      "media",
                      "gallery",
                      "contact",
                      "settings",
                    ].includes(x.id),
                  )
                  .map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => navigate(id)}>
                      <Icon />
                      <span>
                        {label}
                        <small>Consulter et modifier</small>
                      </span>
                      <ArrowUpRight size={18} />
                    </button>
                  ))}
              </div>
              <div className="admin-note">
                <ShieldCheck />
                <div>
                  <strong>Une publication maîtrisée</strong>
                  <p>
                    Les brouillons sont privés. Les 30 versions précédentes
                    restent disponibles dans l’historique. Les images médicales
                    et les informations professionnelles doivent être vérifiées
                    avant publication.
                  </p>
                </div>
              </div>
            </>
          ) : active === "history" ? (
            <div className="admin-card">
              <h2>Versions précédentes</h2>
              <p>
                Restaurer une version crée un nouveau brouillon. Le site ne
                change qu’après votre publication.
              </p>
              {!history.length && (
                <p className="admin-empty">
                  Votre première version sera conservée lors de la prochaine
                  publication.
                </p>
              )}
              {history.map((item) => (
                <div key={item.id} className="admin-history-row">
                  <div>
                    <strong>Version {item.revision}</strong>
                    <span>
                      {formatDate(item.createdAt)} · {item.email}
                    </span>
                  </div>
                  <button
                    className="admin-button secondary"
                    disabled={busy || dirty}
                    onClick={() =>
                      run(async () => {
                        const next = await request<ContentState>("restore", {
                          id: item.id,
                          revision: state.revision,
                        });
                        setState(next);
                        setContent(next.draft);
                        setMessage(
                          "Version restaurée en brouillon. Vérifiez-la avant de publier. Les dossiers avant / après sont masqués et nécessitent une nouvelle confirmation des autorisations.",
                        );
                      })
                    }
                  >
                    Restaurer en brouillon
                  </button>
                </div>
              ))}
            </div>
          ) : active === "account" ? (
            <div className="admin-card">
              <h2>Sécurité de votre accès</h2>
              <p>
                Compte propriétaire : <strong>{identity.email}</strong>
              </p>
              <p>
                Le changement de mot de passe ferme toutes les sessions.
                Reconnectez-vous ensuite avec le nouveau mot de passe.
              </p>
              <form
                className="admin-account-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (dirty) {
                    setError(
                      "Enregistrez vos modifications avant de changer votre mot de passe.",
                    );
                    return;
                  }
                  const values = new FormData(e.currentTarget);
                  run(async () => {
                    await request("password", {
                      oldPassword: values.get("oldPassword"),
                      password: values.get("password"),
                    });
                    setIdentity(null);
                    setState(null);
                    setContent(null);
                    setMessage("Mot de passe modifié. Reconnectez-vous.");
                  });
                }}
              >
                <label className="admin-field">
                  <span>Mot de passe actuel</span>
                  <input
                    type="password"
                    name="oldPassword"
                    autoComplete="current-password"
                    required
                    maxLength={128}
                  />
                </label>
                <label className="admin-field">
                  <span>Nouveau mot de passe</span>
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={128}
                  />
                </label>
                <button className="admin-button" disabled={busy}>
                  Modifier le mot de passe
                </button>
              </form>
            </div>
          ) : active === "media" ? (
            <div className="admin-card">
              <h2>Les images de votre site</h2>
              <p>
                Ajoutez vos images, attribuez-les à un emplacement, puis
                enregistrez et publiez. Les fichiers ajoutés restent privés tant
                qu’ils ne sont pas utilisés dans une publication.
              </p>
              <div className="admin-upload">
                <Upload />
                <div>
                  <strong>Ajouter une image</strong>
                  <p>
                    JPEG, PNG ou WebP · 5 Mo maximum. Utilisez uniquement des
                    images dont vous détenez les droits.
                  </p>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Choisir une image"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload(file);
                  }}
                />
              </div>
              <AssetEditor {...props} />
              <h3>Médiathèque</h3>
              {!media.length && (
                <p className="admin-empty">
                  Les images originales sont déjà disponibles. Vos nouveaux
                  fichiers apparaîtront ici.
                </p>
              )}
              <div className="admin-media-grid">
                {media.map((item) => (
                  <div key={item.id}>
                    <img src={item.url} alt={item.name} loading="lazy" />
                    <strong>{item.name}</strong>
                    <small>
                      {item.width} × {item.height} px
                    </small>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await request("media-delete", { id: item.id });
                          setMedia(media.filter((x) => x.id !== item.id));
                          setMessage("Image inutilisée supprimée.");
                        })
                      }
                    >
                      Supprimer si inutilisée
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="admin-card">
              <div className="admin-editor-heading">
                <h2>
                  {active === "shared"
                    ? "Navigation et blocs partagés"
                    : active === "settings"
                      ? "Informations de l’agence"
                      : "Contenus à modifier"}
                </h2>
                {!["settings", "seo"].includes(active) && (
                  <label className="admin-search">
                    <Search size={17} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher dans cette section"
                      aria-label="Rechercher un contenu"
                    />
                  </label>
                )}
              </div>
              <fieldset disabled={busy} className="admin-editable">
                {active === "home" && (
                  <>
                    <h3>Ordre et visibilité des sections</h3>
                    <HomeSections {...props} />
                    <h3>Textes de l’accueil</h3>
                    <CopyEditor group="home" {...props} />
                  </>
                )}
                {(["agence", "chirurgien", "legal"] as string[]).includes(
                  active,
                ) && (
                  <CopyEditor
                    group={active as "agence" | "chirurgien" | "legal"}
                    {...props}
                  />
                )}
                {active === "interventions" && (
                  <>
                    <CollectionEditor type="treatments" {...props} />
                    <h3>Page de présentation</h3>
                    <CopyEditor group="interventions" {...props} />
                    <h3>Textes communs des fiches</h3>
                    <CopyEditor group="treatment" {...props} />
                  </>
                )}
                {active === "visualGuides" && (
                  <>
                    <p className="admin-hint">
                      Gérez les titres, catégories, images, ordre, association à
                      une intervention et visibilité. Les guides fournis peuvent
                      être masqués, mais restent disponibles dans le panneau.
                    </p>
                    <CollectionEditor type="visualGuides" {...props} />
                    <h3>Présentation et avertissements</h3>
                    <CopyEditor group="interventions" {...props} />
                  </>
                )}
                {active === "gallery" && (
                  <GalleryEditor {...props} upload={upload} />
                )}
                {active === "certificates" && (
                  <CertificatesEditor {...props} upload={upload} />
                )}
                {active === "parcours" && (
                  <>
                    <CollectionEditor type="steps" {...props} />
                    <h3>Présentation du parcours</h3>
                    <CopyEditor group="parcours" {...props} />
                  </>
                )}
                {active === "faq" && (
                  <>
                    <CollectionEditor type="faqs" {...props} />
                    <h3>Présentation de la FAQ</h3>
                    <CopyEditor group="faq" {...props} />
                  </>
                )}
                {active === "contact" && (
                  <>
                    <CopyEditor group="contact" {...props} />
                    <h3>Libellés et textes du formulaire</h3>
                    <CopyEditor group="form" {...props} />
                    <p className="admin-hint">
                      Les réglages de livraison des e-mails sont configurés côté
                      serveur. Modifier les libellés n’active pas l’envoi.
                    </p>
                  </>
                )}
                {active === "shared" && (
                  <>
                    <h3>Navigation principale</h3>
                    <CollectionEditor type="navigation" {...props} />
                    {(
                      ["header", "footer", "invitation", "notFound"] as const
                    ).map((group) => (
                      <div key={group}>
                        <h3>{definitions[group].label}</h3>
                        <CopyEditor group={group} {...props} />
                      </div>
                    ))}
                  </>
                )}
                {active === "settings" && <SettingsEditor {...props} />}{" "}
                {active === "seo" && <SEOEditor {...props} />}
                {active === "translations" && <TranslationsEditor {...props} />}
              </fieldset>
            </div>
          )}
          <footer className="admin-workspace-footer">
            LEA Aesthetic · Espace de gestion privé{" "}
            <span>Version publiée {state.publishedRevision}</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        className="admin-dialog"
        onCancel={() => setReview(null)}
      >
        <button
          className="admin-dialog-close"
          aria-label="Fermer"
          onClick={() => setReview(null)}
        >
          <X />
        </button>
        <p className="admin-kicker">
          {review === "publish" ? "MISE EN LIGNE" : "MODIFICATIONS LOCALES"}
        </p>
        <h2>
          {review === "publish"
            ? "Publier votre brouillon ?"
            : "Recharger le dernier brouillon ?"}
        </h2>
        {review === "publish" ? (
          <>
            <p>
              Ces contenus seront visibles par tous les visiteurs immédiatement
              après la publication.
            </p>
            <ul>
              {changed.map((label, index) => (
                <li key={index}>{label}</li>
              ))}
            </ul>
          </>
        ) : (
          <p>
            Votre saisie non enregistrée sera abandonnée. Le dernier brouillon
            enregistré sera chargé.
          </p>
        )}
        <div className="admin-dialog-actions">
          <button
            className="admin-button secondary"
            onClick={() => setReview(null)}
          >
            Annuler
          </button>
          <button
            className="admin-button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                if (review === "publish") {
                  const next = await request<ContentState>("publish", {
                    revision: state.revision,
                  });
                  setState(next);
                  setContent(next.draft);
                  setHistory(await request<HistoryItem[]>("history"));
                  await request("preview", { enabled: false });
                  setPreview(false);
                  setMessage(
                    "Votre nouvelle version est publiée et visible sur le site.",
                  );
                } else {
                  await load();
                  setMessage("Le dernier brouillon enregistré a été chargé.");
                }
                setReview(null);
              })
            }
          >
            {review === "publish" ? "Confirmer la publication" : "Recharger"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
