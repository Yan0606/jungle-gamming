import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Eye, EyeOff, Smile } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AccountNav } from "@/components/shell";
import { Button, FieldError, Input, Label } from "@/components/ui";
import { api, toApiError } from "@/lib/api";
import { sessionQuery } from "@/lib/queries";
import { usePageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { NETWORKS } from "@/mocks/catalog";
import type { NetworkId } from "@/types";

export function ProfilePage({ aba = "perfil" }: { aba?: string }) {
  usePageMeta(
    aba === "atividade"
      ? "Atividade — Kurio"
      : aba === "interesses" || aba === "colecao"
        ? "Lista de interesse — Kurio"
        : "Dados do perfil — Kurio",
  );
  const session = useQuery(sessionQuery);
  const favorites = useQuery({ queryKey: ["favorites"], queryFn: () => api.favorites(), enabled: Boolean(session.data) });
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => api.orders(), enabled: Boolean(session.data) });
  const nfts = useQuery({ queryKey: ["nfts", { pagina: 1, ordem: "recent" }], queryFn: () => api.listNfts({ pagina: 1 }) });
  if (!session.data) return null;

  return (
    <div className="mx-auto grid max-w-[1240px] items-start gap-8 px-4 py-8 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <AccountNav />
      <section>
        {aba === "colecao" ? <Collection ids={favorites.data ?? []} names={nfts.data?.items ?? []} /> : null}
        {aba === "atividade" ? (
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold">Atividade</h1>
            {orders.data?.length ? orders.data.map((order) => (
              <article key={order.id} className="rounded-2xl border border-line p-4 text-sm">
                <p>{order.id} · {order.status}</p>
                <p>{order.totalEth} ETH</p>
              </article>
            )) : <p className="text-muted">Nenhum pedido ainda.</p>}
          </div>
        ) : null}
        {aba === "interesses" ? (
          <div>
            <h1 className="text-3xl font-semibold">Lista de interesses</h1>
            <p className="mt-3 text-muted">Seus favoritos também aparecem em Minha coleção. Esta lista não publica nada fora da conta.</p>
          </div>
        ) : null}
        {aba === "perfil" ? <ProfileForm /> : null}
      </section>
    </div>
  );
}

function Collection({ ids, names }: { ids: string[]; names: { id: string; name: string; image: string }[] }) {
  const known = names.filter((item) => ids.includes(item.id));
  return (
    <div>
      <h1 className="text-3xl font-semibold">Minha coleção</h1>
      {ids.length === 0 ? <p className="mt-3 text-muted">Você ainda não favoritou um NFT.</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {known.map((item) => (
          <article key={item.id}>
            <img src={item.image} alt={item.name} className="aspect-square rounded-2xl object-cover" />
            <p className="mt-2 text-sm">{item.name}</p>
          </article>
        ))}
        {ids.filter((id) => !known.some((item) => item.id === id)).map((id) => (
          <p key={id} className="text-sm text-muted">{id}</p>
        ))}
      </div>
    </div>
  );
}

function ProfileForm() {
  const queryClient = useQueryClient();
  const session = useQuery(sessionQuery);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(session.data?.name ?? "");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(session.data?.email ?? "");
  const [ensSuffix, setEnsSuffix] = useState(".eth");
  const [ensName, setEnsName] = useState("");
  const [walletNickname, setWalletNickname] = useState("");
  const bio = session.data?.bio ?? "";
  const [avatar, setAvatar] = useState(session.data?.avatar ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const save = useMutation({
    mutationFn: () => api.updateProfile({ name, bio, avatar }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      setErrors({});
    },
    onError: (error) => setErrors(toApiError(error).fields ?? { form: toApiError(error).message }),
  });
  const password = useMutation({
    mutationFn: () => api.changePassword({ currentPassword, nextPassword }),
    onSuccess: () => {
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
    },
    onError: (error) => setErrors((current) => ({ ...current, ...(toApiError(error).fields ?? { form: toApiError(error).message }) })),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Informe o nome de exibição.";
    if (username.trim().length < 2) next.username = "Informe o nome de usuário.";
    if (!email.includes("@")) next.email = "Informe um e-mail válido.";
    if (ensName.trim().length < 2) next.ensName = "Informe o nome ENS.";
    if (walletNickname.trim().length < 2) next.walletNickname = "Informe o apelido da carteira.";
    const changingPassword = Boolean(currentPassword || nextPassword || confirmPassword);
    if (changingPassword) {
      if (!currentPassword) next.currentPassword = "Informe a senha atual.";
      if (nextPassword.length < 8) next.nextPassword = "A nova senha precisa de 8 caracteres.";
      if (nextPassword !== confirmPassword) next.confirmPassword = "As senhas não conferem.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(undefined, {
      onSuccess: () => {
        if (!changingPassword) {
          toast.success("Perfil atualizado.");
          return;
        }
        password.mutate(undefined, {
          onSuccess: () => toast.success("Perfil atualizado."),
        });
      },
    });
  }

  return (
    <form onSubmit={submit}>
      <h1 className="text-base font-bold text-[#F5F1EB]">Perfil do colecionador</h1>
      <div className="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-2">
        <div>
          <Label htmlFor="profile-name" className="text-[#F5F1EB]">Nome de exibição *</Label>
          <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby="profile-name-error" className={`${fieldClass} mt-2`} />
          <FieldError id="profile-name-error">{errors.name}</FieldError>
        </div>
        <div>
          <Label htmlFor="username" className="text-[#F5F1EB]">Nome de usuário *</Label>
          <Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} aria-describedby="username-error" className={`${fieldClass} mt-2`} />
          <FieldError id="username-error">{errors.username}</FieldError>
        </div>
        <div>
          <Label htmlFor="profile-email" className="text-[#F5F1EB]">E-mail *</Label>
          <Input id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby="profile-email-error" className={`${fieldClass} mt-2`} />
          <FieldError id="profile-email-error">{errors.email}</FieldError>
        </div>
        <div>
          <Label htmlFor="profile-ens" className="text-[#F5F1EB]">Nome ENS *</Label>
          <div className="mt-2 flex gap-2">
            <DarkSelect
              label="Sufixo ENS"
              className="w-[88px] shrink-0"
              value={ensSuffix}
              options={[{ value: ".eth", label: ".eth" }, { value: ".xyz", label: ".xyz" }]}
              onChange={setEnsSuffix}
            />
            <Input id="profile-ens" value={ensName} onChange={(event) => setEnsName(event.target.value)} aria-describedby="profile-ens-error" className={fieldClass} />
          </div>
          <FieldError id="profile-ens-error">{errors.ensName}</FieldError>
        </div>
        <div>
          <Label htmlFor="wallet-nickname" className="text-[#F5F1EB]">Apelido da carteira *</Label>
          <Input id="wallet-nickname" value={walletNickname} onChange={(event) => setWalletNickname(event.target.value)} aria-describedby="wallet-nickname-error" className={`${fieldClass} mt-2`} />
          <FieldError id="wallet-nickname-error">{errors.walletNickname}</FieldError>
        </div>
        <div>
          <p className="text-sm text-[#F5F1EB]">Avatar</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid size-10 place-items-center overflow-hidden rounded-full border border-[#3F2319] bg-[#241612]">
              {avatar ? <img src={avatar} alt="" className="size-full object-cover" /> : <Smile className="size-5 text-[#E89B55]" />}
            </span>
            <button type="button" className="h-10 rounded-[3px] bg-[#D28A4C] px-4 text-sm font-semibold text-[#140D0A]" onClick={() => fileRef.current?.click()}>
              Alterar
            </button>
            <button type="button" className="text-sm text-[#E89B55]" onClick={() => setAvatar("")}>Remover</button>
            <input
              ref={fileRef}
              id="avatar"
              type="file"
              accept="image/*"
              className="sr-only"
              aria-describedby="avatar-error"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setAvatar(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
          </div>
          <FieldError id="avatar-error">{errors.avatar}</FieldError>
        </div>
      </div>
      <h2 className="mt-8 text-base font-bold text-[#F5F1EB]">Alterar senha</h2>
      <div className="mt-4 grid md:grid-cols-2">
        <div className="space-y-5">
          <PasswordField id="current-password" label="Senha atual" value={currentPassword} error={errors.currentPassword} onChange={setCurrentPassword} />
          <PasswordField id="next-password" label="Nova senha" value={nextPassword} error={errors.nextPassword} onChange={setNextPassword} />
          <PasswordField id="confirm-password" label="Confirmar nova senha" value={confirmPassword} error={errors.confirmPassword} onChange={setConfirmPassword} />
          {errors.form ? <p className="text-xs text-[#ffb4a8]">{errors.form}</p> : null}
          <div className="flex justify-center pt-2">
            <Button type="submit" className="rounded-[3px] bg-[#D28A4C] px-8 text-[#140D0A]">Salvar</Button>
          </div>
        </div>
      </div>
    </form>
  );
}

const fieldClass = "h-10 w-full rounded-[3px] border border-[#3F2319] bg-transparent px-3 text-sm text-[#F5F1EB] outline-none placeholder:text-[#948071] focus-visible:border-[#3F2319]";
const WALLET_TYPES = ["MetaMask", "WalletConnect", "Coinbase"];

function PasswordField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Label htmlFor={id} className="text-[#F5F1EB]">{label}</Label>
      <div className="relative mt-2">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          aria-describedby={`${id}-error`}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass} pr-10`}
        />
        <button
          type="button"
          className="absolute top-1/2 right-3 -translate-y-1/2 text-[#E89B55]"
          aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

function DarkSelect({
  id,
  label,
  value,
  placeholder,
  options,
  describedBy,
  onChange,
  className,
}: {
  id?: string;
  label?: string;
  value: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  describedBy?: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((item) => item.value === value);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-describedby={describedBy}
        onClick={() => setOpen((next) => !next)}
        className={cn(fieldClass, "flex items-center justify-between gap-2 text-left", !current && "text-[#948071]")}
      >
        <span className="truncate">{current?.label ?? placeholder}</span>
        <ChevronDown className="size-4 shrink-0 text-[#E89B55]" />
      </button>
      {open ? (
        <ul role="listbox" className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-[3px] border border-[#3F2319] bg-[#241612] py-1">
          {options.map((item) => {
            const selected = item.value === value;
            return (
              <li key={item.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    "block w-full px-3 py-2 text-left text-sm text-[#F5F1EB] hover:bg-[#D28A4C] hover:text-[#140D0A]",
                    selected && "bg-[#D28A4C] text-[#140D0A]",
                  )}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function WalletsPage() {
  usePageMeta("Carteiras — Kurio", "Cadastre a carteira principal e as carteiras secundárias usadas para colecionar na Kurio.");
  const queryClient = useQueryClient();
  const wallets = useQuery({ queryKey: ["wallets"], queryFn: () => api.wallets() });
  const [displayName, setDisplayName] = useState("");
  const [label, setLabel] = useState("");
  const [network, setNetwork] = useState<NetworkId | "">("");
  const [profileName, setProfileName] = useState("");
  const [address, setAddress] = useState("");
  const [ensSecondary, setEnsSecondary] = useState("");
  const [walletType, setWalletType] = useState("");
  const [referral, setReferral] = useState("");
  const [email, setEmail] = useState("");
  const [ensSuffix, setEnsSuffix] = useState(".eth");
  const [ensName, setEnsName] = useState("");
  const [sameAs, setSameAs] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (input: { label: string; address: string; network: NetworkId; primary: boolean }) => api.saveWallet(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      toast.success("Carteira salva.");
      setErrors({});
    },
    onError: (error) => setErrors(toApiError(error).fields ?? { form: toApiError(error).message }),
  });

  const secondary = wallets.data?.filter((wallet) => !wallet.primary) ?? [];

  function resetForm() {
    setDisplayName("");
    setLabel("");
    setNetwork("");
    setProfileName("");
    setAddress("");
    setEnsSecondary("");
    setWalletType("");
    setReferral("");
    setEmail("");
    setEnsSuffix(".eth");
    setEnsName("");
    setErrors({});
  }

  function submitPrimary(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (displayName.trim().length < 2) next.displayName = "Informe o nome de exibição.";
    if (label.trim().length < 2) next.label = "Dê um nome à carteira.";
    if (!network) next.network = "Escolha a rede.";
    if (profileName.trim().length < 2) next.profileName = "Informe o nome do perfil.";
    if (address.trim().length < 8) next.address = "Endereço inválido.";
    if (!walletType) next.walletType = "Selecione uma carteira.";
    if (referral.trim().length < 2) next.referral = "Informe o código de indicação.";
    if (!email.includes("@")) next.email = "Informe um e-mail válido.";
    if (ensName.trim().length < 2) next.ensName = "Informe o nome ENS.";
    setErrors(next);
    if (Object.keys(next).length || !network) return;
    save.mutate({ label: label.trim(), address: address.trim(), network, primary: true });
  }

  function addSecondary() {
    const main = wallets.data?.find((wallet) => wallet.primary);
    const nextAddress = sameAs ? main?.address ?? "" : address.trim();
    const nextNetwork = sameAs ? main?.network : network;
    if (!nextAddress || nextAddress.length < 8 || !nextNetwork) {
      setErrors({ address: "Informe o endereço da carteira principal antes de adicionar a secundária." });
      return;
    }
    save.mutate({
      label: sameAs ? "Carteira secundária" : label.trim() || "Carteira secundária",
      address: nextAddress,
      network: nextNetwork,
      primary: false,
    });
  }

  return (
    <div className="mx-auto grid max-w-[1240px] items-start gap-8 px-4 py-8 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <AccountNav />
      <section>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-base font-bold text-[#F5F1EB]">Carteira principal</h1>
          <button type="button" className="text-sm font-semibold text-[#E89B55]" onClick={resetForm}>Adicionar</button>
        </div>
        <p className="mt-2 text-sm text-[#c4b39a]">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
        <form className="mt-6" onSubmit={submitPrimary}>
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            <div>
              <Label htmlFor="display-name" className="text-[#F5F1EB]">Nome de exibição *</Label>
              <Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} aria-describedby="display-name-error" className={`${fieldClass} mt-2`} />
              <FieldError id="display-name-error">{errors.displayName}</FieldError>
            </div>
            <div>
              <Label htmlFor="wallet-label" className="text-[#F5F1EB]">Apelido da carteira *</Label>
              <Input id="wallet-label" value={label} onChange={(event) => setLabel(event.target.value)} aria-describedby="wallet-label-error" className={`${fieldClass} mt-2`} />
              <FieldError id="wallet-label-error">{errors.label}</FieldError>
            </div>
            <div>
              <Label htmlFor="wallet-network" className="text-[#F5F1EB]">Rede *</Label>
              <DarkSelect
                id="wallet-network"
                className="mt-2"
                value={network}
                placeholder="Selecione uma rede"
                describedBy="wallet-network-error"
                options={NETWORKS.map((item) => ({ value: item.id, label: item.label }))}
                onChange={(next) => setNetwork(next as NetworkId)}
              />
              <FieldError id="wallet-network-error">{errors.network}</FieldError>
            </div>
            <div>
              <Label htmlFor="profile-name" className="text-[#F5F1EB]">Nome do perfil *</Label>
              <Input id="profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} aria-describedby="profile-name-error" className={`${fieldClass} mt-2`} />
              <FieldError id="profile-name-error">{errors.profileName}</FieldError>
            </div>
            <div>
              <Label htmlFor="wallet-address" className="text-[#F5F1EB]">Endereço da carteira *</Label>
              <Input id="wallet-address" value={address} placeholder="Endereço 0x da carteira" onChange={(event) => setAddress(event.target.value)} aria-describedby="wallet-address-error" className={`${fieldClass} mt-2`} />
              <FieldError id="wallet-address-error">{errors.address}</FieldError>
            </div>
            <div>
              <Label htmlFor="ens-secondary" className="text-[#F5F1EB]">ENS ou carteira secundária (opcional)</Label>
              <Input id="ens-secondary" value={ensSecondary} placeholder="ENS ou carteira secundária (opcional)" onChange={(event) => setEnsSecondary(event.target.value)} className={`${fieldClass} mt-2`} />
            </div>
            <div>
              <Label htmlFor="wallet-type" className="text-[#F5F1EB]">Tipo de carteira *</Label>
              <DarkSelect
                id="wallet-type"
                className="mt-2"
                value={walletType}
                placeholder="Selecione uma carteira"
                describedBy="wallet-type-error"
                options={WALLET_TYPES.map((item) => ({ value: item, label: item }))}
                onChange={setWalletType}
              />
              <FieldError id="wallet-type-error">{errors.walletType}</FieldError>
            </div>
            <div>
              <Label htmlFor="referral" className="text-[#F5F1EB]">Código de indicação *</Label>
              <Input id="referral" value={referral} onChange={(event) => setReferral(event.target.value)} aria-describedby="referral-error" className={`${fieldClass} mt-2`} />
              <FieldError id="referral-error">{errors.referral}</FieldError>
            </div>
            <div>
              <Label htmlFor="wallet-email" className="text-[#F5F1EB]">E-mail *</Label>
              <Input id="wallet-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby="wallet-email-error" className={`${fieldClass} mt-2`} />
              <FieldError id="wallet-email-error">{errors.email}</FieldError>
            </div>
            <div>
              <Label htmlFor="ens-name" className="text-[#F5F1EB]">Nome ENS *</Label>
              <div className="mt-2 flex gap-2">
                <DarkSelect
                  label="Sufixo ENS"
                  className="w-[88px] shrink-0"
                  value={ensSuffix}
                  options={[{ value: ".eth", label: ".eth" }, { value: ".xyz", label: ".xyz" }]}
                  onChange={setEnsSuffix}
                />
                <Input id="ens-name" value={ensName} onChange={(event) => setEnsName(event.target.value)} aria-describedby="ens-name-error" className={fieldClass} />
              </div>
              <FieldError id="ens-name-error">{errors.ensName}</FieldError>
            </div>
          </div>
          {errors.form ? <p className="mt-3 text-xs text-[#ffb4a8]">{errors.form}</p> : null}
          <Button type="submit" className="mt-6 rounded-[3px] bg-[#D28A4C] px-4 text-[#140D0A]">Salvar carteira</Button>
        </form>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-[#F5F1EB]">Carteira secundária</h2>
            {secondary.length ? (
              <ul className="mt-1 space-y-1 text-sm text-[#c4b39a]">
                {secondary.map((wallet) => (
                  <li key={wallet.id}>{wallet.label} · {wallet.address}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-[#c4b39a]">Você ainda não adicionou uma carteira secundária.</p>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-[#F5F1EB]">
              <input
                type="checkbox"
                className="size-4 appearance-none rounded-full border border-[#c4b39a] bg-transparent checked:border-[#D28A4C] checked:bg-[radial-gradient(circle,#D28A4C_45%,transparent_50%)]"
                checked={sameAs}
                onChange={(event) => setSameAs(event.target.checked)}
              />
              Igual à carteira principal
            </label>
            <button type="button" className="font-semibold text-[#E89B55]" onClick={addSecondary}>Adicionar</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CreatorsPage() {
  usePageMeta("Criadores — Kurio", "Criadores com obras publicadas no catálogo da Kurio.");
  const nfts = useQuery({ queryKey: ["nfts", { pagina: 1 }], queryFn: () => api.listNfts({ pagina: 1 }) });
  const creators = [...new Set(nfts.data?.items.map((item) => item.creator) ?? [])];
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Criadores</h1>
      <p className="mt-3 text-muted">O estúdio de publicação não faz parte desta entrega. A lista abaixo só mostra quem já tem obra no catálogo.</p>
      <ul className="mt-6 space-y-2">
        {creators.map((creator) => <li key={creator} className="rounded-2xl border border-line px-4 py-3">{creator}</li>)}
      </ul>
    </div>
  );
}
