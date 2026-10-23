import { useEffect, type RefObject } from "react";

export function usePageReveal(rootRef: RefObject<HTMLElement | null>, routeKey: string) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((entry) => entry.isIntersecting && !seen.has(entry.target))
          .sort((left, right) => {
            const position = left.target.compareDocumentPosition(right.target);
            return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
          });
        entering.forEach((entry, index) => {
          seen.add(entry.target);
          const element = entry.target as HTMLElement;
          element.style.setProperty("--reveal-delay", `${Math.min(index, 6) * 80}ms`);
          element.classList.add("is-in");
          observer.unobserve(element);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -6% 0px" },
    );

    const watch = () => {
      root.querySelectorAll(".reveal:not(.is-in)").forEach((element) => observer.observe(element));
    };
    watch();
    const changes = new MutationObserver(watch);
    changes.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      changes.disconnect();
    };
  }, [rootRef, routeKey]);
}
