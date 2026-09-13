"use client";
import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/components/use-hydrated";
import Link from "@/components/localized-link";
import { ArrowUpRight, LoaderCircle, Send } from "lucide-react";
import type { SiteContent } from "@/lib/cms/types";
import { useLocale, useTranslate } from "./locale-provider";
type Errors = Record<string, string>;
export function ContactForm({
  initialIntervention = "",
  mode,
  copy,
  treatments,
  whatsappUrl,
}: {
  copy: SiteContent["copy"]["form"];
  treatments: SiteContent["treatments"];
  whatsappUrl: string;
  initialIntervention?: string;
  mode: "resend" | "mock" | "unavailable";
}) {
  const whatsapp = () => whatsappUrl;
  const { locale } = useLocale();
  const t = useTranslate();
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false),
    [errors, setErrors] = useState<Errors>({}),
    [status, setStatus] = useState<{
      success: boolean;
      message: string;
    } | null>(null);
  const form = useRef<HTMLFormElement>(null),
    notice = useRef<HTMLDivElement>(null),
    started = useRef<number>(0),
    requestId = useRef<string>(""),
    submittedSignature = useRef<string>("");
  useEffect(() => {
    started.current = Date.now();
  }, []);
  function begin() {
    if (!started.current) started.current = Date.now();
    if (!requestId.current) requestId.current = crypto.randomUUID();
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setErrors({});
    setStatus(null);
    setPending(true);
    begin();
    const values = new FormData(event.currentTarget);
    const signature = JSON.stringify(
      ["name", "contact", "intervention", "message", "consent"].map((key) =>
        String(values.get(key) || "").trim(),
      ),
    );
    if (submittedSignature.current && submittedSignature.current !== signature)
      requestId.current = crypto.randomUUID();
    submittedSignature.current = signature;
    const payload = {
      name: values.get("name"),
      contact: values.get("contact"),
      intervention: values.get("intervention"),
      message: values.get("message"),
      consent: values.get("consent") === "on",
      website: values.get("website") || "",
      startedAt: started.current,
      requestId: requestId.current,
    };
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lea-language": locale,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(18000),
      });
      const data = await response.json();
      const success = response.ok && data.success === true;
      setStatus({
        success,
        message:
          data.message ||
          t("L’envoi n’a pas pu être confirmé. Contactez-nous sur WhatsApp."),
      });
      if (data.errors) {
        setErrors(data.errors);
        const key = Object.keys(data.errors).find((key) =>
          ["name", "contact", "intervention", "message", "consent"].includes(
            key,
          ),
        );
        if (key)
          requestAnimationFrame(() =>
            form.current
              ?.querySelector<HTMLElement>(`[name="${key}"]`)
              ?.focus(),
          );
      }
      if (success) {
        form.current?.reset();
        started.current = Date.now();
        requestId.current = crypto.randomUUID();
      }
      if (
        !data.errors ||
        !Object.keys(data.errors).some((k) =>
          ["name", "contact", "intervention", "message", "consent"].includes(k),
        )
      )
        requestAnimationFrame(() => notice.current?.focus());
    } catch {
      setStatus({
        success: false,
        message: t(
          "La connexion a été interrompue ou l’envoi n’a pas pu être confirmé. Vous pouvez réessayer ou nous joindre sur WhatsApp.",
        ),
      });
      requestAnimationFrame(() => notice.current?.focus());
    } finally {
      setPending(false);
    }
  }
  const error = (key: string) =>
    errors[key] ? (
      <p className="field-error" id={`${key}-error`}>
        {errors[key]}
      </p>
    ) : null;
  return (
    <form
      className="contact-form"
      ref={form}
      onSubmit={submit}
      onFocusCapture={begin}
      onChange={begin}
      aria-label={t("Formulaire de premier contact")}
    >
      <h2>{copy.text001}</h2>
      <p className="form-intro">{copy.text002}</p>
      {mode === "unavailable" && (
        <div className="form-unavailable" role="status">
          {copy.text003}{" "}
          <a href={whatsapp()} target="_blank" rel="noopener noreferrer">
            {copy.text004}
          </a>{" "}
          {copy.text005}
        </div>
      )}
      {mode === "mock" && (
        <div className="form-unavailable">{copy.text006}</div>
      )}
      {status && (
        <div
          className={`form-status ${status.success ? "form-success" : ""}`}
          role={status.success ? "status" : "alert"}
          tabIndex={-1}
          ref={notice}
        >
          {status.message}
          {!status.success && (
            <>
              <br />
              <a href={whatsapp()} target="_blank" rel="noopener noreferrer">
                {copy.text007}{" "}
                <ArrowUpRight size={13} style={{ display: "inline" }} />
              </a>
            </>
          )}
        </div>
      )}
      {errors.startedAt && (
        <div className="form-status" role="alert">
          {errors.startedAt}
        </div>
      )}
      <noscript>
        <p className="form-unavailable">{copy.text008}</p>
      </noscript>
      <fieldset disabled={pending || !hydrated} className="form-fields">
        <legend className="sr-only">{copy.text009}</legend>
        <div className="field">
          <label htmlFor="name">{copy.text010}</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
            placeholder={copy.text011}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {error("name")}
        </div>
        <div className="field">
          <label htmlFor="contact-detail">{copy.text012}</label>
          <input
            id="contact-detail"
            name="contact"
            autoComplete="email"
            maxLength={160}
            required
            placeholder={copy.text013}
            aria-invalid={!!errors.contact}
            aria-describedby={`contact-help${errors.contact ? " contact-error" : ""}`}
          />
          <small id="contact-help">{copy.text014}</small>
          {error("contact")}
        </div>
        <div className="field">
          <label htmlFor="intervention">{copy.text015}</label>
          <select
            id="intervention"
            name="intervention"
            defaultValue={initialIntervention}
            required
            aria-invalid={!!errors.intervention}
            aria-describedby={
              errors.intervention ? "intervention-error" : undefined
            }
          >
            <option value="" disabled>
              {copy.text016}
            </option>
            {treatments.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
            <option value="a-definir">{copy.text017}</option>
          </select>
          {error("intervention")}
        </div>
        <div className="field">
          <label htmlFor="message">{copy.text018}</label>
          <textarea
            id="message"
            name="message"
            minLength={10}
            maxLength={1200}
            required
            rows={4}
            placeholder={copy.text019}
            aria-invalid={!!errors.message}
            aria-describedby={`message-help${errors.message ? " message-error" : ""}`}
          />
          <small id="message-help">{copy.text020}</small>
          {error("message")}
        </div>
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="website">{copy.text021}</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <label className="form-consent">
          <input
            name="consent"
            type="checkbox"
            required
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? "consent-error" : undefined}
          />
          <span>
            {copy.text022} <Link href={copy.text023}>{copy.text024}</Link>.
          </span>
        </label>
        {error("consent")}
      </fieldset>
      <button
        className="button"
        type="submit"
        disabled={pending || !hydrated || mode === "unavailable"}
        aria-disabled={pending || !hydrated || mode === "unavailable"}
      >
        {pending ? (
          <>
            {copy.text025}
            <LoaderCircle className="spinner" size={18} />
          </>
        ) : mode === "unavailable" ? (
          t("Envoi temporairement indisponible")
        ) : (
          <>
            {copy.text026}
            <Send size={17} />
          </>
        )}
      </button>
      <p className="form-footnote">{copy.text027}</p>
    </form>
  );
}
