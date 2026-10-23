import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Crumbs } from "@/components/shell";
import { Button, FieldError, Input, Label, Skeleton } from "@/components/ui";
import { api, toApiError } from "@/lib/api";
import { sessionQuery } from "@/lib/queries";
import { NETWORKS } from "@/mocks/catalog";
import type { NetworkId } from "@/types";
import { usePageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";

function tokenCode(name: string) {
  const digits = name.match(/(\d+)/)?.[1] ?? "0000";
  return `#${digits.padStart(4, "0")}`;
}

export function CheckoutPage() {
  usePageMeta("Pagamento — Kurio", "Conecte a carteira, revise a cotação e confirme a compra dos NFTs na Kurio.");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useQuery(sessionQuery);
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: () => api.wallets(), enabled: Boolean(session.data) });
  const [network, setNetwork] = useState<NetworkId>("ethereum");
  const [walletId, setWalletId] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [otherWallet, setOtherWallet] = useState(false);
  const [note, setNote] = useState("");
  const [referral, setReferral] = useState("");
  const [key] = useState(() => sessionStorage.getItem("kurio.order-key") ?? crypto.randomUUID());
  const priceShifted = useRef(false);
  const quote = useQuery({
    queryKey: ["cart", network],
    queryFn: () => api.quote(network),
    enabled: Boolean(session.data),
  });

  useEffect(() => {
    sessionStorage.setItem("kurio.order-key", key);
  }, [key]);

  useEffect(() => {
    if (priceShifted.current) return;
    if (localStorage.getItem("kurio.scenario") !== "preco-muda") return;
    const first = quote.data?.lines[0];
    if (!first) return;
    priceShifted.current = true;
    const nftId = first.nftId;
    window.setTimeout(() => {
      void api.changePrice(nftId, "3.33").then(() => {
        queryClient.invalidateQueries({ queryKey: ["cart"] });
        queryClient.invalidateQueries({ queryKey: ["nfts"] });
      });
    }, 1200);
  }, [quote.data?.lines, queryClient]);

  const connect = useMutation({
    mutationFn: (action: "connect" | "refuse" | "disconnect") => api.connectWallet(walletId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      toast.success("Estado da carteira atualizado.");
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const place = useMutation({
    mutationFn: () => api.createOrder({ network, walletId, quoteVersion: quote.data?.version ?? 0, idempotencyKey: key }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      sessionStorage.removeItem("kurio.order-key");
      navigate({ to: "/pedido/$id", params: { id: order.id } });
    },
    onError: async (error) => {
      const apiError = toApiError(error);
      if (apiError.code === "timeout" || apiError.code === "offline") {
        toast.message("A compra pode ter sido registrada. Recuperando o mesmo pedido.");
        try {
          const order = await api.createOrder({ network, walletId, quoteVersion: quote.data?.version ?? 0, idempotencyKey: key });
          navigate({ to: "/pedido/$id", params: { id: order.id } });
          return;
        } catch (retryError) {
          toast.error(toApiError(retryError).message);
          return;
        }
      }
      if (apiError.code === "stale-quote") {
        setAccepted(false);
        queryClient.invalidateQueries({ queryKey: ["cart"] });
      }
      toast.error(apiError.message);
    },
  });

  if (!session.isLoading && !session.data) return null;
  if (quote.isLoading || wallets.isLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-10"><Skeleton className="h-80" /></div>;
  }

  const selected = wallets.data?.find((wallet) => wallet.id === walletId);
  const blocked = Boolean(quote.data?.warnings.length) && !accepted;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 md:px-8">
      <Crumbs items={["Início", "Mercado", "Pagamento"]} />
      <form
        className="mt-6 grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]"
        onSubmit={(event) => {
          event.preventDefault();
          if (blocked) return;
          place.mutate();
        }}
      >
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">Perfil do colecionador</h1>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="collector-name">Nome do colecionador</Label>
              <Input id="collector-name" className="mt-1" value={session.data?.name ?? ""} readOnly />
            </div>
            <div>
              <Label htmlFor="collector-email">E-mail</Label>
              <Input id="collector-email" className="mt-1" value={session.data?.email ?? ""} readOnly />
            </div>
            <div>
              <Label htmlFor="wallet-address">Endereço da carteira</Label>
              <Input id="wallet-address" className="mt-1" readOnly value={selected?.address ?? ""} placeholder="Endereço 0x da carteira" />
            </div>
            <div>
              <Label htmlFor="ens">ENS ou carteira secundária (opcional)</Label>
              <Input id="ens" className="mt-1" placeholder="nome.eth" />
            </div>
            <div>
              <Label htmlFor="wallet">Tipo de carteira</Label>
              <select
                id="wallet"
                className="mt-1 h-10 w-full rounded-[6px] border border-line bg-ink px-3"
                value={walletId}
                onChange={(event) => setWalletId(event.target.value)}
                required
              >
                <option value="">Selecione uma carteira</option>
                {wallets.data?.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>{wallet.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="referral">Código de indicação</Label>
              <Input id="referral" className="mt-1" value={referral} onChange={(event) => setReferral(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="network">Rede</Label>
              <select id="network" className="mt-1 h-10 w-full rounded-[6px] border border-line bg-ink px-3" value={network} onChange={(event) => setNetwork(event.target.value as NetworkId)}>
                {NETWORKS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={otherWallet}
              onChange={(event) => {
                setOtherWallet(event.target.checked);
                if (event.target.checked) setWalletId("");
              }}
            />
            Usar outra carteira?
          </label>
          <div>
            <Label htmlFor="note">Observação do colecionador (opcional)</Label>
            <textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 h-28 w-full rounded-[6px] border border-line bg-ink p-3 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => connect.mutate("connect")} disabled={!walletId}>Conectar</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => connect.mutate("refuse")} disabled={!walletId}>Simular recusa</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => connect.mutate("disconnect")} disabled={!walletId}>Desconectar</Button>
          </div>
          <p className="text-sm text-muted">{selected?.connected ? "Carteira conectada nesta simulação." : "A carteira ainda não está conectada."}</p>
          {quote.data?.warnings.length ? (
            <div className="rounded-2xl border border-amber/40 p-4" role="alert">
              {quote.data.warnings.map((warning) => <p key={warning}>{warning}</p>)}
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={async (event) => {
                    const next = event.target.checked;
                    setAccepted(next);
                    if (next) {
                      const fresh = await api.quote(network, true);
                      queryClient.setQueryData(["cart", network], fresh);
                    }
                  }}
                />
                Revisar e aceitar a cotação atualizada
              </label>
            </div>
          ) : null}
          <FieldError id="checkout-error">{blocked ? "Confirme a cotação atualizada antes de continuar." : undefined}</FieldError>
        </div>
        <aside className="rounded-[24px] border border-line bg-ink-2 p-5">
          <h2 className="font-semibold">Seus NFTs</h2>
          <ul className="mt-4 space-y-4">
            {quote.data?.lines.map((line) => (
              <li key={line.editionId} className="flex items-center gap-3 text-sm">
                <img src={line.image} alt="" className="size-14 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-semibold">{line.name} <span className="font-normal text-muted">(x {line.quantity})</span></p>
                  <p className="text-xs text-muted">ID do token: {tokenCode(line.name)}</p>
                </div>
                <p className="font-semibold">{line.lineTotalEth} ETH</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Tem um código promocional? <Link to="/carrinho" className="text-amber underline">Aplique aqui</Link>
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{quote.data?.subtotalEth} ETH</dd></div>
            <div className="flex justify-between"><dt>Desconto do lançamento</dt><dd>(-) {quote.data?.discountEth}</dd></div>
            <div className="flex justify-between"><dt>Taxa de rede</dt><dd>{quote.data?.networkFeeEth} ETH</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="text-amber">{quote.data?.totalEth} ETH</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm font-semibold">Carteira e rede</p>
          <div className="mt-3 space-y-2">
            {wallets.data?.map((wallet) => (
              <label key={wallet.id} className={cn("flex cursor-pointer items-center gap-3 rounded-[6px] border px-3 py-3 text-sm", walletId === wallet.id ? "border-amber" : "border-line")}>
                <input type="radio" name="wallet-card" checked={walletId === wallet.id} onChange={() => setWalletId(wallet.id)} />
                {wallet.label}
              </label>
            ))}
          </div>
          <Button type="submit" className="mt-4 w-full" disabled={place.isPending || blocked || !walletId}>
            {place.isPending ? "Enviando pedido..." : "Confirmar compra"}
          </Button>
        </aside>
      </form>
    </div>
  );
}
