import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui";
import { usePageMeta } from "@/lib/meta";

export function OrderPage({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const order = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.getOrder(id),
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 3000 : false),
  });
  const statusTitle =
    order.data?.status === "confirmed"
      ? "Pedido confirmado"
      : order.data?.status === "declined"
        ? "Pagamento recusado"
        : order.data
          ? "Pedido pendente"
          : "Pedido";
  usePageMeta(`${statusTitle} — Kurio`);

  if (order.isLoading) return <p className="px-8 py-16">Carregando pedido...</p>;
  if (order.isError || !order.data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16" role="alert">
        <h1 className="text-3xl font-semibold">Pedido indisponível</h1>
        <Button className="mt-4" onClick={() => order.refetch()}>Tentar de novo</Button>
      </div>
    );
  }

  const data = order.data;
  const title =
    data.status === "confirmed" ? "Pedido confirmado" : data.status === "declined" ? "Pagamento recusado" : "Pedido pendente";

  return (
    <div className="mx-auto max-w-xl px-4 py-12 md:px-8">
      <article className="rounded-[28px] border border-line bg-ink-2 p-6">
        <p className="text-sm tracking-[0.16em] text-amber">KURIO</p>
        <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-muted" role="status">
          {data.status === "confirmed"
            ? "Transferência confirmada na simulação. O preço e a procedência ficam registrados neste recibo."
            : data.status === "declined"
              ? "Nenhum item foi comprado. O carrinho foi preservado."
              : "Aguardando a rede simulada. Você pode atualizar a página sem criar outra compra."}
        </p>
        <h2 className="mt-6 text-sm font-semibold">Detalhes da transação</h2>
        <ul className="mt-3 space-y-3">
          {data.items.map((item) => (
            <li key={item.nftId} className="flex items-center gap-3 text-sm">
              <img src={item.image} alt="" className="size-12 rounded-xl object-cover" />
              <div className="flex-1">
                <p>{item.name}</p>
                <p className="text-xs text-muted">{item.editionName} · {item.quantity} × {item.unitPriceEth} ETH</p>
              </div>
              <p>{item.lineTotalEth} ETH</p>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-1 text-sm">
          <div className="flex justify-between gap-4"><dt>Pedido</dt><dd>{data.id}</dd></div>
          <div className="flex justify-between gap-4"><dt>Transação</dt><dd className="break-all text-right">{data.txRef}</dd></div>
          <div className="flex justify-between gap-4"><dt>Carteira</dt><dd>{data.walletLabel}</dd></div>
          <div className="flex justify-between gap-4"><dt>Rede</dt><dd className="capitalize">{data.network}</dd></div>
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{data.subtotalEth} ETH</dd></div>
          <div className="flex justify-between"><dt>Desconto</dt><dd>{data.discountEth} ETH</dd></div>
          <div className="flex justify-between"><dt>Taxa</dt><dd>{data.networkFeeEth} ETH</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd className="text-amber">{data.totalEth} ETH</dd></div>
        </dl>
        <a href={data.explorerUrl} className="mt-5 inline-flex h-10 items-center rounded-[6px] bg-amber px-5 text-sm font-semibold text-[#2a160c]">
          Ver no Etherscan
        </a>
      {data.status === "pending" ? (
        <div className="mt-6 flex gap-2">
          <Button
            onClick={async () => {
              await api.resolveOrder(data.id, "confirmed");
              queryClient.invalidateQueries({ queryKey: ["order", id] });
            }}
          >
            Resolver como confirmado
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await api.resolveOrder(data.id, "declined");
              queryClient.invalidateQueries({ queryKey: ["order", id] });
            }}
          >
            Resolver como recusado
          </Button>
        </div>
      ) : null}
      <Link to="/" className="mt-8 inline-flex"><Button variant="outline">Voltar ao mercado</Button></Link>
      </article>
    </div>
  );
}
