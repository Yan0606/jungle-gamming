import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { ARTICLES, CATEGORIES, FEATURED_NFT_ID, NETWORKS } from "@/mocks/catalog";
import { api, type NftQuery } from "@/lib/api";
import { Button, Checkbox, RangeSlider, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/lib/meta";

export interface HomeSearch {
  q?: string;
  categoria?: string;
  rede?: string;
  min?: string;
  max?: string;
  ordem?: string;
  pagina?: number;
  aba?: string;
}

const TABS = [
  { id: "todos", label: "Todos os NFTs" },
  { id: "novos", label: "Novos lançamentos" },
  { id: "alta", label: "Em alta" },
];

const SORTS = [
  { id: "recent", label: "Listados recentemente" },
  { id: "price-asc", label: "Menor preço" },
  { id: "price-desc", label: "Maior preço" },
  { id: "name", label: "Nome" },
];

export function HomePage({ search }: { search: HomeSearch }) {
  usePageMeta("Kurio — Marketplace de NFTs");
  const navigate = useNavigate();
  const query: NftQuery = {
    q: search.q || undefined,
    categoria: search.categoria || undefined,
    rede: search.rede || undefined,
    min: search.min || undefined,
    max: search.max || undefined,
    ordem: search.ordem || "recent",
    pagina: search.pagina || 1,
    aba: search.aba || "todos",
  };
  const catalog = useQuery({
    queryKey: ["nfts", query],
    queryFn: () => api.listNfts(query),
  });
  const featured = useQuery({
    queryKey: ["nft", FEATURED_NFT_ID],
    queryFn: () => api.getNft(FEATURED_NFT_ID),
  });

  function update(patch: Partial<HomeSearch>) {
    navigate({ to: "/", search: { ...search, pagina: 1, ...patch } });
  }

  const selectedCategories = (search.categoria ?? "").split(",").filter(Boolean);
  const selectedNetworks = (search.rede ?? "").split(",").filter(Boolean);
  const currentPage = search.pagina || 1;
  const pages = catalog.data ? Math.max(1, Math.ceil(catalog.data.total / catalog.data.pageSize)) : 1;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [seek, setSeek] = useState(search.q ?? "");

  return (
    <div>
      <form
        className="mx-auto flex max-w-[1240px] items-center gap-2 px-4 pt-4 lg:hidden"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: seek });
        }}
      >
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#2a1c16] px-4">
          <Search className="size-4 shrink-0 text-[#c4b39a]" />
          <input
            value={seek}
            onChange={(event) => setSeek(event.target.value)}
            placeholder="Explorar coleções"
            aria-label="Explorar coleções"
            className="w-full bg-transparent text-sm text-[#F5F1EB] outline-none placeholder:text-[#b5a394]"
          />
        </label>
        <button type="button" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#2a1c16] text-[#F5F1EB]" aria-label="Filtrar" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((value) => !value)}>
          <SlidersHorizontal className="size-4" />
        </button>
      </form>
      <section className="mx-auto hidden max-w-[1240px] items-center gap-10 px-4 py-12 md:px-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div>
          <p className="reveal text-sm leading-4 text-cream">Bem-vindo à Kurio</p>
          <h1 className="reveal mt-5 max-w-[640px] text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] uppercase md:text-[48px]">
            Seja dono do futuro
            <br />
            da arte digital
          </h1>
          <p className="reveal mt-5 max-w-[34rem] text-[15px] leading-6 text-[#c4a882]">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.
          </p>
          <a href="#catalogo" className="reveal block w-fit">
            <Button className="mt-8 h-10 w-[140px] px-0 tracking-[0.04em]">EXPLORAR</Button>
          </a>
        </div>
        <img
          src="/nfts/emerald.webp"
          alt="Emerald Ape, destaque da coleção Kurio"
          width={450}
          height={450}
          fetchPriority="high"
          className="reveal aspect-square w-full rounded-[28px] object-cover"
        />
      </section>

      <section className="mx-auto px-4 pt-4 lg:hidden">
        <div className="relative isolate h-[190px] overflow-hidden rounded-[30px] bg-[#140e0b]">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "linear-gradient(104.74deg, rgba(210, 138, 76, 0.2) 1.08%, rgba(210, 138, 76, 0.1) 99.23%)" }}
          />
          <div
            aria-hidden="true"
            className="absolute size-[248px] rounded-full"
            style={{ left: -80, top: -31, background: "linear-gradient(160.25deg, rgba(221, 154, 95, 0.43) 22.1%, rgba(210, 138, 76, 0.04) 87.42%)" }}
          />
          <div
            aria-hidden="true"
            className="absolute size-[248px] rounded-full"
            style={{ left: 73, top: -10, background: "linear-gradient(160.25deg, rgba(221, 154, 95, 0.37) 22.1%, rgba(210, 138, 76, 0) 87.42%)" }}
          />
          <div className="relative z-[1] flex h-full items-center gap-2 px-4 font-mono">
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-xs font-medium leading-4 text-[#F5F1EB]">Bem-vindo à Kurio</p>
              <h1 className="mt-1.5 text-[18px] font-bold leading-[29px] uppercase text-[#F5F1EB]">
                Seja dono da
                <br />
                cultura digital
              </h1>
              <p className="mt-1.5 text-xs font-normal leading-[18px] text-[#CFB28C]">Descubra NFTs selecionados de criadores do mundo todo.</p>
              <a href="#catalogo" className="mt-4 inline-flex items-center gap-2 text-xs font-bold leading-[14px] text-[#E89B55]">
                EXPLORAR
                <ChevronRight className="size-4 text-[#D28A4C]" aria-hidden="true" />
              </a>
            </div>
            <div className="relative h-[146px] w-[138px] shrink-0">
              <img src="/nfts/emerald.webp" alt="Emerald Ape, destaque da coleção Kurio" width={138} height={138} className="absolute top-[5px] left-0 size-[138px] rounded-[16px] object-cover" />
              <img src="/nfts/sage.webp" alt="" width={58} height={58} className="absolute top-[88px] left-[14px] size-[58px] rounded-[16px] object-cover" />
            </div>
          </div>
        </div>
        <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden="true">
          <span className="size-[7px] rounded-full bg-[#D28A4C]" />
          <span className="size-[7px] rounded-full bg-[#D28A4C]/35" />
          <span className="size-[7px] rounded-full bg-[#D28A4C]/35" />
        </div>
      </section>

      <section id="catalogo" className="mx-auto grid max-w-[1240px] gap-8 px-4 pt-5 pb-8 md:px-8 lg:grid-cols-[250px_1fr] lg:pt-0">
        <aside className={cn("reveal space-y-8", filtersOpen ? "max-lg:rounded-[24px] max-lg:border max-lg:border-line max-lg:bg-[#241612] max-lg:p-4" : "max-lg:hidden")}>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Coleções</h2>
            <div className="space-y-1">
              {CATEGORIES.map((category) => (
                <Checkbox
                  key={category.id}
                  label={category.label}
                  count={catalog.data?.counts.categories[category.id]}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...selectedCategories, category.id]
                      : selectedCategories.filter((id) => id !== category.id);
                    update({ categoria: next.join(",") });
                  }}
                />
              ))}
            </div>
          </div>
          <PriceFilter search={search} onApply={(min, max) => update({ min, max })} />
          <div>
            <h2 className="mb-3 text-sm font-semibold">Rede</h2>
            {NETWORKS.map((network) => (
              <Checkbox
                key={network.id}
                label={network.label}
                count={catalog.data?.counts.networks[network.id]}
                checked={selectedNetworks.includes(network.id)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selectedNetworks, network.id]
                    : selectedNetworks.filter((id) => id !== network.id);
                  update({ rede: next.join(",") });
                }}
              />
            ))}
          </div>
          <Link to="/nft/$id" params={{ id: featured.data?.id ?? FEATURED_NFT_ID }} className="relative block overflow-hidden rounded-[24px]">
            {featured.data ? (
              <img src={featured.data.image} alt={`${featured.data.name}, oferta limitada`} className="aspect-[4/5] w-full object-cover" />
            ) : (
              <Skeleton className="aspect-[4/5] w-full" />
            )}
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-4 py-5 text-center">
              <p className="text-xs tracking-[0.18em]">NFT EM DESTAQUE</p>
              <p className="text-sm font-semibold tracking-[0.14em]">OFERTA LIMITADA</p>
            </div>
          </Link>
        </aside>

        <div>
          <div className="reveal mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-4 text-sm" role="tablist" aria-label="Recortes do catálogo">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={(search.aba || "todos") === tab.id}
                  className={(search.aba || "todos") === tab.id ? "border-b border-amber pb-1 text-cream" : "pb-1 text-muted"}
                  onClick={() => update({ aba: tab.id })}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <label className={cn("text-sm text-muted", filtersOpen ? "" : "max-lg:hidden")}>
              Ordenar por:{" "}
              <select
                aria-label="Ordenar por"
                className="bg-transparent text-cream"
                value={search.ordem || "recent"}
                onChange={(event) => update({ ordem: event.target.value })}
              >
                {SORTS.map((sort) => (
                  <option key={sort.id} value={sort.id} className="bg-ink">
                    {sort.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {search.q ? <p className="mb-4 text-sm text-muted">Resultados para “{search.q}”</p> : null}

          {catalog.isLoading ? (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3" aria-busy="true" aria-label="Carregando catálogo">
              {Array.from({ length: 9 }, (_, index) => (
                <Skeleton key={index} className="aspect-[3/4]" />
              ))}
            </div>
          ) : null}

          {catalog.isError ? (
            <div className="rounded-3xl border border-line p-8" role="alert">
              <p>Não foi possível carregar o catálogo.</p>
              <Button className="mt-4" onClick={() => catalog.refetch()}>Tentar de novo</Button>
            </div>
          ) : null}

          {catalog.data && catalog.data.items.length === 0 ? (
            <p className="rounded-3xl border border-line p-8 text-muted">Nenhum NFT encontrado com esses filtros.</p>
          ) : null}

          {catalog.data && catalog.data.items.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 xl:grid-cols-3">
              {catalog.data.items.map((nft) => (
                <article key={nft.id} className="reveal">
                  <Link to="/nft/$id" params={{ id: nft.id }}>
                    <img src={nft.image} alt={nft.name} className="aspect-square w-full rounded-[22px] bg-paper object-cover max-lg:rounded-[18px]" />
                  </Link>
                  <h3 className="mt-3 text-sm text-[#d9cdc2]">
                    <Link to="/nft/$id" params={{ id: nft.id }}>{nft.name}</Link>
                  </h3>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-amber">
                    <span className="hidden size-6 place-items-center rounded-full bg-[#3a2a22] text-[10px] text-cream lg:grid" aria-hidden="true">
                      {nft.creatorInitials}
                    </span>
                    <span>
                      {nft.previousPriceEth ? (
                        <span className="mr-2 font-normal text-faint line-through">{nft.previousPriceEth} ETH</span>
                      ) : null}
                      {nft.priceEth} ETH
                    </span>
                  </p>
                </article>
              ))}
            </div>
          ) : null}

          <nav className="mt-8 flex items-center justify-end gap-2" aria-label="Paginação">
            {Array.from({ length: Math.min(pages, 6) }, (_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  type="button"
                  aria-current={page === currentPage ? "page" : undefined}
                  className={page === currentPage ? "grid size-8 place-items-center rounded-[6px] bg-amber text-sm text-[#2a160c]" : "grid size-8 place-items-center rounded-[6px] text-sm text-muted"}
                  onClick={() => navigate({ to: "/", search: { ...search, pagina: page } })}
                >
                  {page}
                </button>
              );
            })}
            <button
              type="button"
              className="grid size-8 place-items-center text-muted"
              aria-label="Próxima página"
              disabled={currentPage >= pages}
              onClick={() => navigate({ to: "/", search: { ...search, pagina: currentPage + 1 } })}
            >
              <ChevronRight className="size-4" />
            </button>
          </nav>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-4 px-4 py-10 md:grid-cols-2 md:px-8">
        <Promo
          image="/nfts/emerald.webp"
          title="Limited-edition genesis drops"
          text="Colecione edições escassas diretamente dos criadores antes da revelação pública."
        />
        <Promo
          image="/nfts/neon.webp"
          title="Curated digital art & much more"
          text="Explore novos artistas, coleções verificadas e obras digitais que definem a cultura."
        />
      </section>

      <section id="diario" className="mx-auto max-w-[1240px] px-4 py-8 md:px-8">
        <h2 className="reveal text-3xl font-semibold">Diário da Cunhagem</h2>
        <p className="reveal mt-2 max-w-xl text-sm text-muted">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ARTICLES.map((article) => (
            <article key={article.id} className="reveal overflow-hidden rounded-[24px] border border-line bg-panel">
              <img src={article.image} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-4">
                <p className="text-xs text-faint">{article.dateLabel}</p>
                <h3 className="text-base font-semibold">{article.title}</h3>
                <p className="text-sm text-muted">{article.excerpt}</p>
                <a className="inline-flex text-sm text-amber" href={`#artigo-${article.id}`}>
                  Ler mais →
                </a>
                <p id={`artigo-${article.id}`} className="text-sm text-muted">
                  {article.excerpt} Este texto faz parte do diário e não conclui uma compra.
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
      </div>
  );
}

function PriceFilter({ search, onApply }: { search: HomeSearch; onApply: (min: string, max: string) => void }) {
  const [range, setRange] = useState([Number(search.min || 0.02) * 100, Number(search.max || 12.3) * 100]);
  const min = (range[0] / 100).toFixed(2).replace(".", ",");
  const max = (range[1] / 100).toFixed(2).replace(".", ",");
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Faixa de preço</h2>
      <RangeSlider value={range} onValueChange={setRange} min={2} max={1230} />
      <p className="mt-3 text-xs text-muted">Preço: {min} - {max} ETH</p>
      <Button
        size="sm"
        className="mt-3"
        onClick={() => onApply((range[0] / 100).toFixed(2), (range[1] / 100).toFixed(2))}
      >
        Aplicar
      </Button>
    </div>
  );
}

function Promo({ image, title, text }: { image: string; title: string; text: string }) {
  return (
    <a href="#catalogo" className="reveal grid grid-cols-[140px_1fr] overflow-hidden rounded-[24px] border border-line bg-[#1b130f] sm:grid-cols-[180px_1fr]">
      <img src={image} alt="" className="h-full w-full object-cover" />
      <div className="flex flex-col justify-center p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{text}</p>
        <span className="mt-4 text-sm text-amber">Explorar →</span>
      </div>
    </a>
  );
}
