"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoLoader } from "./logo-loader";
import { useTranslate } from "./locale-provider";

export const SITE_NAVIGATION_START_EVENT = "lea:navigation-start";

const MAXIMUM_WAIT = 12_000;

function delay(milliseconds: number) {
  return new Promise<void>((resolve) =>
    window.setTimeout(resolve, milliseconds),
  );
}

function nextPaint() {
  return new Promise<void>((resolve) =>
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => resolve()),
    ),
  );
}

async function loadPageImage(image: HTMLImageElement) {
  if (image.complete) {
    if (image.naturalWidth > 0)
      try {
        await image.decode();
      } catch {
        // A decoded fallback is optional once the browser has the image bytes.
      }
    return;
  }
  await new Promise<void>((resolve) => {
    const preload = new window.Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    preload.decoding = "async";
    preload.onload = finish;
    preload.onerror = finish;
    if (image.sizes) preload.sizes = image.sizes;
    if (image.srcset) preload.srcset = image.srcset;
    preload.src = image.currentSrc || image.src;
    if (preload.complete) finish();
  });
}

function pageImages() {
  return [...document.images].filter(
    (image) => !image.hasAttribute("data-site-loader-image"),
  );
}

export function SiteLoader({ logo }: { logo: string }) {
  const pathname = usePathname();
  const t = useTranslate();
  const [state, setState] = useState({ active: true, loaded: 0, total: 0 });
  const generation = useRef(0);
  const active = useRef(true);
  const firstPath = useRef(true);
  const finishTimer = useRef<number | undefined>(undefined);
  const safetyTimer = useRef<number | undefined>(undefined);

  const hide = useCallback((expectedGeneration: number) => {
    if (expectedGeneration !== generation.current) return;
    active.current = false;
    document.documentElement.dataset.siteImagesReady = "true";
    document.documentElement.classList.remove("site-loading");
    setState((current) => ({ ...current, active: false }));
  }, []);

  const finishWhenReady = useCallback(
    async (expectedGeneration: number, minimumDuration = 220) => {
      const startedAt = performance.now();
      await nextPaint();

      const routeDeadline = Date.now() + MAXIMUM_WAIT;
      while (
        document.querySelector("[data-route-loading]") &&
        Date.now() < routeDeadline
      )
        await delay(60);

      if (expectedGeneration !== generation.current) return;
      const images = pageImages();
      setState((current) => ({
        ...current,
        loaded: 0,
        total: images.length,
      }));

      let loaded = 0;
      const imagesReady = Promise.allSettled(
        images.map(async (image) => {
          await loadPageImage(image);
          loaded += 1;
          if (expectedGeneration === generation.current)
            setState((current) => ({ ...current, loaded }));
        }),
      );
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      await Promise.race([
        Promise.allSettled([imagesReady, fontsReady]),
        delay(MAXIMUM_WAIT),
      ]);

      const remaining = minimumDuration - (performance.now() - startedAt);
      if (remaining > 0) await delay(remaining);
      hide(expectedGeneration);
    },
    [hide],
  );

  const scheduleFinish = useCallback(
    (wait = 60, minimumDuration = 220) => {
      if (finishTimer.current) window.clearTimeout(finishTimer.current);
      const expectedGeneration = generation.current;
      finishTimer.current = window.setTimeout(
        () => void finishWhenReady(expectedGeneration, minimumDuration),
        wait,
      );
    },
    [finishWhenReady],
  );

  const begin = useCallback(() => {
    generation.current += 1;
    active.current = true;
    delete document.documentElement.dataset.siteImagesReady;
    document.documentElement.classList.add("site-loading");
    setState({ active: true, loaded: 0, total: 0 });
    if (safetyTimer.current) window.clearTimeout(safetyTimer.current);
    const expectedGeneration = generation.current;
    safetyTimer.current = window.setTimeout(
      () => hide(expectedGeneration),
      MAXIMUM_WAIT + 3_000,
    );
  }, [hide]);

  useEffect(() => {
    document.documentElement.classList.add("site-loading");
    scheduleFinish(0, 480);

    const onClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.origin !== current.origin) return;
      if (
        destination.pathname === current.pathname &&
        destination.search === current.search
      )
        return;
      begin();
    };
    const onNavigationStart = () => begin();
    const onPopState = () => begin();
    document.addEventListener("click", onClick, true);
    window.addEventListener(SITE_NAVIGATION_START_EVENT, onNavigationStart);
    window.addEventListener("popstate", onPopState);

    const main = document.querySelector("main");
    const observer = new MutationObserver(() => {
      if (active.current) scheduleFinish();
    });
    if (main) observer.observe(main, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(
        SITE_NAVIGATION_START_EVENT,
        onNavigationStart,
      );
      window.removeEventListener("popstate", onPopState);
      observer.disconnect();
      if (finishTimer.current) window.clearTimeout(finishTimer.current);
      if (safetyTimer.current) window.clearTimeout(safetyTimer.current);
      document.documentElement.classList.remove("site-loading");
    };
  }, [begin, scheduleFinish]);

  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    if (active.current) scheduleFinish(40);
  }, [pathname, scheduleFinish]);

  return (
    <LogoLoader
      logo={logo}
      active={state.active}
      loaded={state.loaded}
      total={state.total}
      label={t("Chargement des visuels")}
    />
  );
}
