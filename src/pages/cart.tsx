import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
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
      <Crumbs items={["Início", "Mercado", "Carrinho"]} />
      <h1 className="mt-4 text-lg font-semibold">Carrinho de NFTs</h1>
      {quote.warnings.length ? (
        <div className="mt-4 rounded-2xl border border-amber/40 bg-amber/10 p-4 text-sm" role="status">
          {quote.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : null}
      <div className="mt-6 flex flex-col items-start justify-between gap-8 font-mono lg:flex-row">
        <div className="w-full max-w-[782px] overflow-x-auto">
          <div className="flex min-w-[758px] items-center justify-between pr-6 text-base leading-4 text-[#F5F1EB]">
            <span className="w-[250px] font-bold">NFTs</span>
            <span className="w-[77px] text-center font-medium">Preço</span>
            <span className="w-[88px] text-center font-bold">Edições</span>
            <span className="w-[87px] text-center font-medium">Total</span>
            <span className="w-6" />
          </div>
          <div className="mt-3 h-px bg-[#D28A4C]" />
          <div className="mt-3 flex flex-col gap-3">
            {quote.lines.map((line) => (
              <div key={`${line.nftId}-${line.editionId}`} className="flex h-[70px] min-w-[758px] items-center justify-between bg-[#241612] pr-6">
                <div className="flex w-[250px] items-center gap-4">
                  <img src={line.image} alt="" className="size-[70px] rounded-[6px] object-cover" />
                  <div>
                    <Link to="/nft/$id" params={{ id: line.nftId }} className="block text-base leading-4 font-bold text-[#F5F1EB]">{line.name}</Link>
                    <p className="mt-1.5 text-sm leading-4 text-[#B39463]">ID do token: {tokenCode(line.name)}</p>
                  </div>
                </div>
                <p className="w-[77px] text-center text-base leading-4 font-bold text-[#CFB28C]">{line.unitPriceEth} ETH</p>
                <div className="flex w-[88px] shrink-0 items-center justify-center gap-3">
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
                <p className="w-[87px] text-center text-base leading-4 font-bold text-[#E89B55]">{line.lineTotalEth} ETH</p>
                <button type="button" className="text-[#B39463]" aria-label="Remover" onClick={() => remove.mutate(line)}>
                  <Trash2 className="size-6" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <aside className="w-full lg:w-[332px]">
          <h2 className="text-lg leading-4 font-bold text-[#F5F1EB]">Resumo da carteira</h2>
          <div className="mt-3 h-px bg-[#D28A4C]" />
          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              apply.mutate();
            }}
          >
            <label htmlFor="coupon" className="text-sm leading-4 font-bold text-[#F5F1EB]">Código promocional</label>
            <div className="mt-2 flex h-10 overflow-hidden rounded-[3px] border border-[#D28A4C]">
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
          <dl className="mt-6 space-y-3 text-[15px] leading-5 text-[#F5F1EB]">
            <div className="flex items-start justify-between"><dt>Subtotal</dt><dd className="text-lg leading-4">{quote.subtotalEth} ETH</dd></div>
            <div className="flex items-start justify-between"><dt>Desconto do lançamento</dt><dd>(-) {Number(quote.discountEth).toFixed(2)}</dd></div>
            <div className="flex items-start justify-between">
              <dt>Taxa de rede</dt>
              <dd className="text-right">
                <span className="block text-lg leading-4">{quote.networkFeeEth} ETH</span>
                <span className="block text-xs leading-4 font-normal text-[#E89B55]">Taxa estimada</span>
              </dd>
            </div>
            <div className="flex items-start justify-between text-base leading-4 font-bold"><dt>Total</dt><dd className="text-lg text-[#E89B55]">{quote.totalEth} ETH</dd></div>
          </dl>
          <Link to="/pagamento" className="mt-6 flex h-10 w-full items-center justify-center rounded-[3px] bg-[#D28A4C] text-[15px] leading-4 font-bold text-[#140D0A]">
            Conectar e finalizar
          </Link>
          <Link to="/" className="mt-3 block text-center text-[15px] leading-5 text-[#E89B55]">Continuar explorando</Link>
        </aside>
      </div>
      <section className="mt-12">
        <h2 className="text-lg font-semibold text-amber">Colecionadores também viram</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {related.data?.items.slice(0, 5).map((entry) => (
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
