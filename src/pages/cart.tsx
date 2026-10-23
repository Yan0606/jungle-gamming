import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Crumbs } from "@/components/shell";
import { Button, Skeleton } from "@/components/ui";
import { api, toApiError } from "@/lib/api";
import { usePageMeta } from "@/lib/meta";

function tokenCode(name: string) {
  const digits = name.match(/(\d+)/)?.[1] ?? "0000";
  return `#${digits.padStart(4, "0")}`;
}

export function CartPage() {
  usePageMeta("Carrinho de NFTs — Kurio", "Revise os NFTs, a quantidade e o cupom antes de finalizar a compra na Kurio.");
  const queryClient = useQueryClient();
  const cart = useQuery({ queryKey: ["cart"], queryFn: () => api.cart() });
  const related = useQuery({ queryKey: ["nfts", { pagina: 1 }], queryFn: () => api.listNfts({ pagina: 1 }) });
  const [coupon, setCoupon] = useState("");
  const [couponError, setCouponError] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["cart"] });
  const update = useMutation({
    mutationFn: (input: { nftId: string; editionId: string; quantity: number }) =>
      api.updateCartItem(input.nftId, input.editionId, input.quantity),
    onSuccess: (quote) => queryClient.setQueryData(["cart"], quote),
    onError: (error) => toast.error(toApiError(error).message),
  });
  const remove = useMutation({
    mutationFn: (input: { nftId: string; editionId: string }) => api.removeCartItem(input.nftId, input.editionId),
    onSuccess: (quote) => queryClient.setQueryData(["cart"], quote),
  });
  const apply = useMutation({
    mutationFn: () => api.applyCoupon(coupon),
    onSuccess: (quote) => {
      queryClient.setQueryData(["cart"], quote);
      setCouponError("");
      toast.success("Cupom aplicado.");
    },
    onError: (error) => setCouponError(toApiError(error).message),
  });
  const clearCoupon = useMutation({
    mutationFn: () => api.removeCoupon(),
    onSuccess: (quote) => queryClient.setQueryData(["cart"], quote),
  });

  if (cart.isLoading) {
    return (
      <div className="mx-auto grid max-w-[1240px] gap-6 px-4 py-10 md:grid-cols-[1fr_320px]" aria-busy="true">
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (cart.isError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16" role="alert">
        <p>Não foi possível carregar o carrinho.</p>
        <Button className="mt-4" onClick={refresh}>Tentar de novo</Button>
      </div>
    );
  }

  const quote = cart.data;
  if (!quote || quote.lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Crumbs items={["Início", "Mercado", "Carrinho"]} />
        <h1 className="mt-6 text-3xl font-semibold">Carrinho de NFTs</h1>
        <p className="mt-3 text-muted">Escolha um NFT no mercado para começar a coleção.</p>
        <Link to="/" className="mt-6 inline-flex"><Button>Explorar</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 md:px-8">
      <div className="relative max-lg:mb-2">
        <Link to="/" aria-label="Voltar" className="absolute top-0 left-0 grid size-10 place-items-center lg:hidden">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="max-lg:hidden">
          <Crumbs items={["Início", "Mercado", "Carrinho"]} />
        </div>
        <h1 className="mt-4 text-lg font-semibold max-lg:mt-2 max-lg:text-center max-lg:text-[17px]">Carrinho de NFTs</h1>
      </div>
      {quote.warnings.length ? (
        <div className="mt-4 rounded-2xl border border-amber/40 bg-amber/10 p-4 text-sm" role="status">
          {quote.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : null}
      <div className="mt-6 flex flex-col items-start justify-between gap-8 font-mono max-lg:font-sans lg:flex-row">
        <div className="reveal w-full max-w-[782px] overflow-x-auto max-lg:overflow-visible">
          <div className="flex min-w-[758px] items-center justify-between pr-6 text-base leading-4 text-[#F5F1EB] max-lg:hidden">
            <span className="w-[250px] font-bold">NFTs</span>
            <span className="w-[77px] text-center font-medium">Preço</span>
            <span className="w-[88px] text-center font-bold">Edições</span>
            <span className="w-[87px] text-center font-medium">Total</span>
            <span className="w-6" />
          </div>
          <div className="mt-3 h-px bg-[#D28A4C] max-lg:hidden" />
          <div className="mt-3 flex flex-col gap-3">
            {quote.lines.map((line) => (
              <div key={`${line.nftId}-${line.editionId}`} className="flex h-[70px] min-w-[758px] items-center justify-between bg-[#241612] pr-6 max-lg:h-auto max-lg:min-w-0 max-lg:rounded-[18px] max-lg:bg-[#2a1c16] max-lg:p-3 max-lg:pr-3">
                <div className="flex w-[250px] items-center gap-4 max-lg:w-auto max-lg:min-w-0 max-lg:flex-1">
                  <img src={line.image} alt="" className="size-[70px] rounded-[6px] object-cover max-lg:size-14 max-lg:rounded-xl" />
                  <div className="min-w-0">
                    <Link to="/nft/$id" params={{ id: line.nftId }} className="block text-base leading-4 font-bold text-[#F5F1EB] max-lg:text-sm">{line.name}</Link>
                    <p className="mt-1.5 text-sm leading-4 text-[#B39463] max-lg:text-xs">
                      <span className="max-lg:hidden">ID do token: {tokenCode(line.name)}</span>
                      <span className="hidden max-lg:inline">Edição: {line.editionName}</span>
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#E89B55] lg:hidden">{line.unitPriceEth} ETH</p>
                  </div>
                </div>
                <p className="w-[77px] text-center text-base leading-4 font-bold text-[#CFB28C] max-lg:hidden">{line.unitPriceEth} ETH</p>
                <div className="flex w-[88px] shrink-0 items-center justify-center gap-3 max-lg:w-auto">
                  <button
                    type="button"
                    className="grid h-[30px] w-5 shrink-0 place-items-center rounded-[20px] border border-[#140D0A] bg-[#D28A4C] text-black shadow-[0_4px_12px_-2px_rgba(20,13,10,0.15)]"
                    aria-label="Diminuir"
                    onClick={() => update.mutate({ nftId: line.nftId, editionId: line.editionId, quantity: Math.max(1, line.quantity - 1) })}
                  >
                    <Minus className="size-3.5" strokeWidth={3} />
                  </button>
                  <input
                    aria-label="Quantidade"
                    inputMode="numeric"
                    value={line.quantity}
                    className="w-6 shrink-0 bg-transparent text-center text-[17px] leading-6 text-[#F5F1EB] outline-none"
                    onChange={(event) => {
                      const quantity = Number(event.target.value);
                      if (!Number.isInteger(quantity) || quantity < 1) return;
                      update.mutate({ nftId: line.nftId, editionId: line.editionId, quantity: Math.min(line.available, quantity) });
                    }}
                  />
                  <button
                    type="button"
                    className="grid h-[30px] w-5 shrink-0 place-items-center rounded-[20px] border border-[#140D0A] bg-[#D28A4C] text-black shadow-[0_4px_12px_-2px_rgba(20,13,10,0.15)]"
                    aria-label="Aumentar"
                    onClick={() => update.mutate({ nftId: line.nftId, editionId: line.editionId, quantity: Math.min(line.available, line.quantity + 1) })}
                  >
                    <Plus className="size-3.5" strokeWidth={3} />
                  </button>
                </div>
                <p className="w-[87px] text-center text-base leading-4 font-bold text-[#E89B55] max-lg:hidden">{line.lineTotalEth} ETH</p>
                <button type="button" className="text-[#B39463]" aria-label="Remover" onClick={() => remove.mutate(line)}>
                  <Trash2 className="size-6" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <aside className="reveal w-full lg:w-[332px]">
          <h2 className="text-lg leading-4 font-bold text-[#F5F1EB] max-lg:hidden">Resumo da carteira</h2>
          <div className="mt-3 h-px bg-[#D28A4C] max-lg:hidden" />
          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              apply.mutate();
            }}
          >
            <label htmlFor="coupon" className="text-sm leading-4 font-bold text-[#F5F1EB] max-lg:sr-only">Código promocional</label>
            <div className="mt-2 flex h-10 overflow-hidden rounded-[3px] border border-[#D28A4C] max-lg:mt-0 max-lg:rounded-full max-lg:border-[#3F2319] max-lg:bg-[#2a1c16]">
              <input
                id="coupon"
                value={coupon}
                placeholder="Digite o código promocional..."
                aria-label="Cupom"
                aria-describedby={couponError ? "coupon-error" : undefined}
                onChange={(event) => setCoupon(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-2 text-xs text-[#F5F1EB] outline-none placeholder:text-[#B39463]"
              />
              <button type="submit" className="h-10 w-[102px] bg-[#D28A4C] text-[15px] font-bold text-[#140D0A]">Aplicar</button>
            </div>
            {couponError ? <p id="coupon-error" className="mt-2 text-xs text-[#ffb4a8]">{couponError}</p> : null}
            {quote.coupon ? (
              <button type="button" className="mt-2 text-xs text-[#E89B55] underline" onClick={() => clearCoupon.mutate()}>
                Remover {quote.coupon}
              </button>
            ) : null}
          </form>
          <dl className="mt-6 space-y-3 text-[15px] leading-5 text-[#F5F1EB] max-lg:space-y-2.5">
            <div className="flex items-center justify-between"><dt>Subtotal</dt><dd className="text-lg leading-4 max-lg:text-[15px] max-lg:leading-5 max-lg:font-medium">{quote.subtotalEth} ETH</dd></div>
            <div className="flex items-center justify-between"><dt>Desconto do lançamento</dt><dd className="max-lg:font-medium max-lg:text-[#E89B55]">(-) {Number(quote.discountEth).toFixed(2)}</dd></div>
            <div className="flex items-start justify-between">
              <dt>Taxa de rede</dt>
              <dd className="text-right">
                <span className="block text-lg leading-4 max-lg:text-[15px] max-lg:leading-5 max-lg:font-medium">{quote.networkFeeEth} ETH</span>
                <span className="block text-xs leading-4 font-normal text-[#E89B55]">Taxa estimada</span>
              </dd>
            </div>
            <div className="flex items-center justify-between text-base leading-4 font-bold max-lg:pt-1"><dt>Total</dt><dd className="text-lg text-[#E89B55] max-lg:text-base max-lg:leading-5">{quote.totalEth} ETH</dd></div>
          </dl>
          <Link to="/pagamento" className="mt-6 flex h-10 w-full items-center justify-center rounded-[3px] bg-[#D28A4C] text-[15px] leading-4 font-bold text-[#140D0A] max-lg:h-12 max-lg:rounded-full">
            Conectar e finalizar
          </Link>
          <Link to="/" className="mt-3 block text-center text-[15px] leading-5 text-[#E89B55] max-lg:hidden">Continuar explorando</Link>
        </aside>
      </div>
      <section className="mt-12 max-lg:hidden">
        <h2 className="text-lg font-semibold text-amber">Colecionadores também viram</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {related.data?.items.slice(0, 5).map((entry) => (
            <Link key={entry.id} to="/nft/$id" params={{ id: entry.id }} className="reveal rounded-2xl border border-line bg-ink-2 p-3">
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
