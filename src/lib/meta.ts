import { useEffect } from "react";

const DEFAULT_TITLE = "Kurio — Marketplace de NFTs";
const DEFAULT_DESCRIPTION =
  "Kurio é o marketplace de NFTs para colecionar arte digital com procedência verificada.";

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!(tag instanceof HTMLMetaElement)) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function clip(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 160 ? `${clean.slice(0, 157).trimEnd()}...` : clean;
}

export function usePageMeta(title: string, description = DEFAULT_DESCRIPTION, image = "/nfts/emerald.webp") {
  useEffect(() => {
    const nextDescription = clip(description);
    document.title = title;
    setMeta("name", "description", nextDescription);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", nextDescription);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:locale", "pt_BR");
    setMeta("property", "og:image", new URL(image, window.location.origin).href);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!(canonical instanceof HTMLLinkElement)) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}${window.location.pathname}`);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta("name", "description", DEFAULT_DESCRIPTION);
      setMeta("property", "og:title", DEFAULT_TITLE);
      setMeta("property", "og:description", DEFAULT_DESCRIPTION);
      setMeta("property", "og:image", new URL("/nfts/emerald.webp", window.location.origin).href);
    };
  }, [title, description, image]);
}
