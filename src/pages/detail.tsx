import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Crumbs } from "@/components/shell";
import { Button, Skeleton } from "@/components/ui";
import { api, toApiError } from "@/lib/api";
import { sessionQuery } from "@/lib/queries";
import { usePageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";

function tokenCode(name: string) {
  const digits = name.match(/(\d+)/)?.[1] ?? "0000";
  return `#${digits.padStart(4, "0")}`;
}

export function DetailPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const nft = useQuery({ queryKey: ["nft", id], queryFn: () => api.getNft(id), retry: false });
  const session = useQuery(sessionQuery);
  const favorites = useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.favorites(),
    enabled: Boolean(session.data),
  });
  const related = useQuery({ queryKey: ["nfts", { pagina: 1 }], queryFn: () => api.listNfts({ pagina: 1 }) });
  const [editionId, setEditionId] = useState<string>();
  const [quantity, setQuantity] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [tab, setTab] = useState<"detalhes" | "avaliacoes">("detalhes");
  usePageMeta(
    nft.data ? `${nft.data.name} — Kurio` : "NFT — Kurio",
    nft.data?.description,
    nft.data?.image,
  );

  const favorite = useMutation({
    mutationFn: async () => {
      if (!nft.data) return;
      if (favorites.data?.includes(nft.data.id)) await api.removeFavorite(nft.data.id);
      else await api.addFavorite(nft.data.id);
    },
    onMutate: async () => {
      if (!nft.data) return;
      await queryClient.cancelQueries({ queryKey: ["favorites"] });
      const previous = queryClient.getQueryData<string[]>(["favorites"]) ?? [];
      const next = previous.includes(nft.data.id)
        ? previous.filter((item) => item !== nft.data!.id)
        : [...previous, nft.data.id];
      queryClient.setQueryData(["favorites"], next);
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["favorites"], context.previous);
      toast.error(toApiError(error).message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const add = useMutation({
    mutationFn: () => {
      const edition = nft.data?.editions.find((item) => item.id === editionId) ?? nft.data?.editions[0];
      if (!nft.data || !edition) throw new Error("NFT indisponível");
      return api.addCartItem({ nftId: nft.data.id, editionId: edition.id, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("NFT adicionado ao carrinho.");
      navigate({ to: "/carrinho" });
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  if (nft.isLoading) {
    return (
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-10 md:grid-cols-2 md:px-8" aria-busy="true">
        <Skeleton className="aspect-square" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (nft.isError) {
    const status = toApiError(nft.error).status;
    return (
      <div className="mx-auto max-w-xl px-4 py-20" role="alert">
        <h1 className="text-3xl font-semibold">{status === 404 ? "NFT não encontrado" : "Falha ao abrir o NFT"}</h1>
        <p className="mt-3 text-muted">O endereço pode estar incorreto ou o catálogo não respondeu.</p>
        <Button className="mt-6" onClick={() => (status === 404 ? navigate({ to: "/" }) : nft.refetch())}>
          {status === 404 ? "Voltar ao mercado" : "Tentar de novo"}
        </Button>
      </div>
    );
  }

  if (!nft.data) return null;
  const item = nft.data;
  const edition =
    item.editions.find((entry) => entry.id === editionId) ??
    item.editions.find((entry) => entry.name === "1/50") ??
    item.editions[0];
  const loved = favorites.data?.includes(item.id);
  const thumbs = [0, 1, 2, 3];
  const traits = item.id === "emerald-ape-042" ? "Óculos, Esmeralda, Raro" : "Digital, Verificado, Raro";
  const collection = item.id.startsWith("emerald") || item.id.includes("ape") ? "Kurio Apes" : "Kurio Editions";

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 md:px-8 max-lg:pt-4 max-lg:pb-36">
      <div className="mb-3 flex items-center lg:hidden">
        <Link to="/" aria-label="Voltar" className="grid size-10 place-items-center rounded-full text-[#F5F1EB]">
          <ChevronLeft className="size-5" />
        </Link>
      </div>
      <div className="max-lg:hidden">
        <Crumbs items={["Início", "Mercado"]} />
      </div>
      <div className="mt-6 grid items-start gap-5 max-lg:mt-0 lg:grid-cols-[84px_minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="reveal flex gap-3 max-lg:hidden lg:flex-col">
          {thumbs.map((index) => (
            <img key={index} src={item.image} alt="" className="size-16 rounded-xl object-cover lg:size-[76px]" />
          ))}
        </div>
        <div className="reveal relative">
          <img src={item.image} alt={item.name} fetchPriority="high" className="aspect-square w-full rounded-[18px] bg-paper object-cover max-lg:rounded-[22px]" />
          <button
            type="button"
            aria-label="Ampliar imagem"
            className="absolute top-4 right-4 max-lg:hidden"
            onClick={() => setZoom(true)}
          >
            <img src="/icon/search.svg" alt="" className="size-[30px]" />
          </button>
        </div>
        <section className="max-lg:flex max-lg:flex-col">
          <div className="reveal flex items-start justify-between gap-3 max-lg:order-1">
            <h1 className="text-[28px] leading-tight font-bold max-lg:text-[20px] md:text-[32px]">{item.name}</h1>
            <p className="shrink-0 rounded-full bg-[#3a2a22] px-2 py-1 text-xs text-amber lg:hidden">
              <span aria-hidden="true">★ </span>4.8 (19)
            </p>
          </div>
          <div className="reveal mt-3 hidden flex-wrap items-center justify-between gap-3 border-b border-amber pb-3 lg:flex">
            <p className="text-xl font-bold text-amber">{item.priceEth} ETH</p>
            <p className="text-sm text-[#c4b39a]">
              <span className="mr-1 text-amber" aria-hidden="true">★★★★★</span>
              <span className="sr-only">5 de 5. </span>
              19 avaliações de colecionadores
            </p>
          </div>
          <p className="mt-5 text-sm font-semibold text-cream max-lg:hidden">Sobre este NFT:</p>
          <p className="reveal mt-2 max-w-[46ch] text-sm leading-6 text-[#c4b39a] max-lg:order-2">
            Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.
          </p>
          <div className="reveal mt-4 max-lg:order-3">
            <p className="text-sm font-semibold text-cream">Edição:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.editions.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setEditionId(entry.id);
                    setQuantity(1);
                  }}
                  className={cn(
                    "rounded-[6px] border px-2.5 py-1 text-xs",
                    entry.id === edition.id ? "border-amber bg-amber text-[#2a160c]" : "border-[#4a3b32] text-cream",
                  )}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:mt-0 max-lg:flex-col max-lg:items-stretch max-lg:gap-3 max-lg:border-t max-lg:border-white/10 max-lg:bg-[#140e0b] max-lg:px-4 max-lg:pt-3 max-lg:pb-4">
            <div className="flex items-center gap-3 max-lg:w-full max-lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-[#c4b39a] max-lg:inline">Qtd.</span>
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-full border border-[#6b5648]"
                  aria-label="Diminuir quantidade"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-4 text-center text-sm">{quantity}</span>
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-full border border-[#6b5648]"
                  aria-label="Aumentar quantidade"
                  onClick={() => setQuantity((value) => Math.min(edition.available, value + 1))}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <p className="text-lg font-bold text-[#E89B55] lg:hidden">{item.priceEth} ETH</p>
            </div>
            <div className="flex flex-wrap gap-3 max-lg:w-full">
              <Button
                className="relative px-6 max-lg:h-12 max-lg:w-full max-lg:rounded-full"
                aria-label={edition.available < 1 ? "Edição esgotada" : "COMPRAR Comprar NFT, adicionar ao carrinho"}
                onClick={() => add.mutate()}
                disabled={add.isPending || edition.available < 1 || quantity < 1 || quantity > edition.available}
              >
                {edition.available < 1 ? "Edição esgotada" : <><span className="max-lg:hidden">COMPRAR</span><span className="hidden max-lg:inline">Comprar NFT</span><ShoppingBag className="absolute right-5 hidden size-4 max-lg:block" /></>}
              </Button>
              <Button
                variant="outline"
                className="max-lg:fixed max-lg:top-4 max-lg:right-4 max-lg:z-30 max-lg:size-10 max-lg:rounded-full max-lg:px-0"
                aria-pressed={loved}
                onClick={() => {
                  if (!session.data) {
                    navigate({ to: "/entrar", search: { redirect: `/nft/${item.id}` } });
                    return;
                  }
                  favorite.mutate();
                }}
              >
                <Heart className={loved ? "size-4 fill-amber text-amber" : "size-4"} />
                <span className="max-lg:sr-only">{loved ? "Favorito" : "Favoritar"}</span>
              </Button>
            </div>
          </div>
          {quantity > edition.available ? <p className="mt-3 text-sm text-[#ffb4a8]">A edição disponível limita a quantidade.</p> : null}
          <dl className="reveal mt-5 space-y-1 text-sm text-[#c4b39a] max-lg:order-4">
            <div><dt className="inline">ID do token: </dt><dd className="inline">{tokenCode(item.name)}</dd></div>
            <div><dt className="inline">Coleção: </dt><dd className="inline">{collection}</dd></div>
            <div><dt className="inline">Atributos: </dt><dd className="inline">{traits}</dd></div>
          </dl>
          <p className="mt-4 flex items-center gap-2 text-sm text-[#c4b39a] max-lg:hidden">
            Compartilhar este NFT:
            <span className="inline-flex items-center gap-2 text-cream" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="size-4">
                <path fill="currentColor" d="M4.7 3.2a1.8 1.8 0 1 0 .1 3.6 1.8 1.8 0 0 0-.1-3.6zM3.2 8.4h3V21h-3zM10 8.4h2.9v1.7h.1c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5v7.6h-3v-6.7c0-1.6 0-3.6-2.2-3.6s-2.6 1.7-2.6 3.5V21H10z" />
              </svg>
              <svg viewBox="0 0 24 24" className="size-4">
                <path fill="currentColor" d="M22 5.8c-.7.3-1.4.5-2.2.6a3.8 3.8 0 0 0 1.7-2.1 7.7 7.7 0 0 1-2.4 1 3.8 3.8 0 0 0-6.6 3.5A11 11 0 0 1 3.2 4.9a3.8 3.8 0 0 0 1.2 5.1 3.8 3.8 0 0 1-1.7-.5v.1a3.8 3.8 0 0 0 3.1 3.7 3.8 3.8 0 0 1-1.7.1 3.8 3.8 0 0 0 3.6 2.6A7.8 7.8 0 0 1 2 18.3a11 11 0 0 0 6 1.8c7.1 0 11-6 11-11.1v-.5A7.7 7.7 0 0 0 22 5.8z" />
              </svg>
            </span>
          </p>
        </section>
      </div>
      {zoom ? (
        <button type="button" className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6" aria-label="Fechar imagem ampliada" onClick={() => setZoom(false)}>
          <img src={item.image} alt="" className="max-h-[88vh] max-w-4xl rounded-[18px]" />
        </button>
      ) : null}

      <div className="mt-10 flex gap-6 border-b border-line text-sm max-lg:hidden">
        <button type="button" className={cn("pb-3", tab === "detalhes" ? "border-b-2 border-amber text-cream" : "text-muted")} onClick={() => setTab("detalhes")}>
          Detalhes do NFT
        </button>
        <button type="button" className={cn("pb-3", tab === "avaliacoes" ? "border-b-2 border-amber text-cream" : "text-muted")} onClick={() => setTab("avaliacoes")}>
          Avaliações de colecionadores (19)
        </button>
      </div>
      {tab === "detalhes" ? (
        <div className="mt-6 max-w-4xl space-y-4 text-sm leading-7 text-muted max-lg:hidden">
          <p>{item.description} A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência.</p>
          <p><span className="text-cream">Rede: </span>Cunhado na {item.network} com procedência imutável e metadados armazenados no IPFS.</p>
          <p><span className="text-cream">Contrato: </span>{item.contract} • Contrato inteligente ERC-721 verificado.</p>
          <p><span className="text-cream">Direitos autorais: </span>Royalty do criador de 5% nas vendas secundárias, paga automaticamente pelos mercados compatíveis.</p>
        </div>
      ) : (
        <p className="mt-6 max-w-3xl text-sm leading-7 text-muted max-lg:hidden">
          As 19 avaliações aparecem no projeto como referência visual. Esta entrega não publica notas novas nem simula uma avaliação enviada.
        </p>
      )}

      <section className="reveal mt-12 max-lg:hidden">
        <h2 className="text-lg font-semibold text-amber">Mais desta coleção</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {related.data?.items
            .filter((entry) => entry.id !== item.id)
            .slice(0, 5)
            .map((entry) => (
              <Link key={entry.id} to="/nft/$id" params={{ id: entry.id }} className="rounded-2xl border border-line bg-ink-2 p-3">
                <img src={entry.image} alt={entry.name} className="aspect-square w-full rounded-xl object-cover" />
                <p className="mt-3 text-sm">{entry.name}</p>
                <p className="text-sm text-amber">{entry.priceEth} ETH</p>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
