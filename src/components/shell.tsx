import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Heart, Home, LogOut, Menu, Search, ShoppingBag, ShoppingCart, Tag, TriangleAlert, User, Wallet } from "lucide-react";
import { useRef, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { usePageReveal } from "@/components/reveal";
import { api } from "@/lib/api";
import { cn, writeToken } from "@/lib/utils";
import { sessionQuery } from "@/lib/queries";
import { Button, Dialog, DialogContent, Input } from "@/components/ui";

const NAV = [
  { to: "/", label: "Início", exact: true },
  { to: "/", label: "Mercado", hash: "catalogo" },
  { to: "/criadores", label: "Criadores" },
  { to: "/", label: "Aprenda", hash: "diario" },
] as const;

function navActive(label: string, path: string) {
  if (label === "Início") return path === "/";
  if (label === "Mercado") return path.startsWith("/nft") || path === "/carrinho" || path === "/pagamento" || path.startsWith("/pedido");
  if (label === "Criadores") return path === "/criadores";
  return false;
}

export function Crumbs({ items }: { items: string[] }) {
  return (
    <p className="text-sm text-muted">
      {items.map((item, index) => (
        <span key={item}>
          {index > 0 ? " / " : null}
          {index === 0 ? (
            <Link to="/" className="hover:text-cream">{item}</Link>
          ) : (
            <span className={index === items.length - 1 ? "text-cream" : undefined}>{item}</span>
          )}
        </span>
      ))}
    </p>
  );
}

function showMobileNav(path: string) {
  return !path.startsWith("/nft") && path !== "/carrinho" && path !== "/pagamento" && !path.startsWith("/pedido");
}

export function Shell({ children }: { children: ReactNode }) {
  const session = useQuery(sessionQuery);
  const cart = useQuery({ queryKey: ["cart"], queryFn: () => api.cart() });
  const count = cart.data?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  const path = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const stageRef = useRef<HTMLDivElement>(null);
  usePageReveal(stageRef, path);
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSearchOpen(false);
    setMenu(false);
    navigate({ to: "/", search: { q: term, pagina: 1 } });
  }

  return (
    <div ref={stageRef} className="min-h-screen bg-ink text-cream">
      <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-ink/95 backdrop-blur lg:block">
        <div className="relative mx-auto flex h-[74px] max-w-[1240px] items-center px-4 md:px-8">
          <Link to="/" className="flex h-[18px] w-12 items-center text-[11px] leading-none font-semibold tracking-[0.12em]" aria-label="Kurio, início">
            KURIO
          </Link>
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-sm text-muted lg:flex" aria-label="Principal">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                hash={"hash" in item ? item.hash : undefined}
                className={cn("relative py-1 hover:text-cream", navActive(item.label, path) && "text-amber")}
              >
                {item.label}
                {navActive(item.label, path) ? (
                  <span className="absolute right-0 -bottom-2 left-0 h-0.5 rounded-full bg-amber" />
                ) : null}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-full text-cream hover:bg-white/5"
              aria-label="Buscar NFTs"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-5" />
            </button>
            <Link to="/carrinho" className="relative grid size-10 place-items-center rounded-full hover:bg-white/5" aria-label={`Carrinho, ${count} itens`}>
              <img src="/icon/Cart%20Icon.svg" alt="" className="size-5" />
              <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-amber px-1 text-[10px] font-bold text-[#2a160c]">
                {count}
              </span>
            </Link>
            {session.data ? (
              <Link to="/perfil" className="hidden h-10 items-center rounded-[6px] bg-amber px-4 text-sm font-semibold text-[#2a160c] sm:inline-flex">
                {session.data.name.split(" ")[0]}
              </Link>
            ) : (
              <Link to="/entrar" className="hidden h-10 items-center rounded-[6px] bg-amber px-4 text-sm font-semibold text-[#2a160c] sm:inline-flex">
                Entrar
              </Link>
            )}
            <button type="button" className="grid size-10 place-items-center rounded-full lg:hidden" aria-label="Abrir menu" onClick={() => setMenu(true)}>
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent title="Buscar no mercado">
          <form onSubmit={submitSearch} className="space-y-3">
            <Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Nome ou criador" aria-label="Busca" autoFocus />
            <Button type="submit" className="w-full">Buscar</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent title="Menu">
          <div className="flex flex-col gap-3 text-base">
            {NAV.map((item) => (
              <Link key={item.label} to={item.to} hash={"hash" in item ? item.hash : undefined} onClick={() => setMenu(false)}>
                {item.label}
              </Link>
            ))}
            <Link to={session.data ? "/perfil" : "/entrar"} onClick={() => setMenu(false)}>
              {session.data ? "Meu perfil" : "Entrar"}
            </Link>
          </div>
        </DialogContent>
      </Dialog>
      <main className={showMobileNav(path) ? "max-lg:pb-[126px]" : undefined}>{children}</main>
      <Footer />
      {showMobileNav(path) ? (
        <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[118px] lg:hidden" aria-label="Navegação móvel">
          <div className="pointer-events-auto absolute inset-x-3 bottom-0 h-[80px]">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 80" preserveAspectRatio="none" aria-hidden="true" style={{ filter: "drop-shadow(0px -10px 24px rgba(10, 6, 4, 0.45))" }}>
              <path
                fill="#241612"
                d="M0 80V58C0 26 26 0 58 0H116C140 0 150 8 166 26C182 44 192 52 200 52C208 52 218 44 234 26C250 8 260 0 284 0H342C374 0 400 26 400 58V80H0Z"
              />
            </svg>
            <div className="relative grid h-full grid-cols-5 items-center">
              <Link to="/" className={cn("grid place-items-center", path === "/" ? "text-[#E89B55]" : "text-[#CFB28C]")} aria-label="Início">
                <Home className="size-[22px]" strokeWidth={1.75} fill={path === "/" ? "currentColor" : "none"} />
              </Link>
              <Link to="/perfil" search={{ aba: "interesses" }} className="grid place-items-center text-[#CFB28C]" aria-label="Favoritos">
                <Heart className="size-[22px]" strokeWidth={1.75} />
              </Link>
              <span aria-hidden="true" />
              <Link to="/carrinho" className="grid place-items-center text-[#CFB28C]" aria-label={`Carrinho, ${count} itens`}>
                <span className="relative">
                  <ShoppingCart className="size-[22px]" strokeWidth={1.75} />
                  {count > 0 ? <span className="absolute -top-1.5 -right-2.5 grid size-4 place-items-center rounded-full bg-[#E89B55] text-[10px] leading-none font-bold text-[#140D0A]">{count}</span> : null}
                </span>
              </Link>
              <button type="button" className="grid place-items-center text-[#CFB28C]" aria-label="Abrir menu" onClick={() => setMenu(true)}>
                <User className="size-[22px]" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <Link
            to="/"
            hash="catalogo"
            aria-label="Explorar coleções"
            className="pointer-events-auto absolute bottom-[48px] left-1/2 z-10 grid size-[65px] -translate-x-1/2 place-items-center rounded-full text-[#F5F1EB]"
            style={{ background: "linear-gradient(180deg, rgba(210, 138, 76, 0.4) -16.92%, #D28A4C 109.23%)" }}
          >
            <img src="/icon/qr.svg" alt="" className="h-6 w-[27px]" />
          </Link>
        </nav>
      ) : null}
      <ScenarioPanel raised={showMobileNav(path)} />
      <div role="status" aria-live="polite" id="live-region" className="sr-only" />
    </div>
  );
}

const SERVICES = [
  ["W", "Segurança da carteira", "Proteja sua carteira e colecione arte digital verificada com confiança."],
  ["C", "Criadores em destaque", "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede."],
  ["D", "Alertas de lançamentos", "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado."],
] as const;

function Footer() {
  return (
    <footer className="mt-16 hidden lg:block">
      <div className="mx-auto max-w-[1240px] bg-[#241612] px-4 py-12 md:px-8">
        <div className="grid gap-8 lg:grid-cols-4 lg:gap-0">
          {SERVICES.map(([mark, title, copy]) => (
            <article key={mark} className="reveal lg:border-r lg:border-amber lg:px-6 lg:first:pl-0">
              <span className="grid size-14 place-items-center rounded-full bg-amber text-lg font-semibold text-[#2a160c]">{mark}</span>
              <h2 className="mt-4 text-sm font-semibold text-cream">{title}</h2>
              <p className="mt-2 max-w-[26ch] text-sm leading-6 text-[#c4b39a]">{copy}</p>
            </article>
          ))}
          <Newsletter />
        </div>

        <div className="mt-8 -mx-4 grid gap-3 bg-[#38220F] px-4 py-4 text-sm text-[#c4b39a] sm:grid-cols-2 md:-mx-8 md:px-8 lg:grid-cols-4 lg:items-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-cream">KURIO</p>
          <p>Feito para colecionadores, criadores e cultura</p>
          <p>contato@email.com</p>
          <p className="lg:text-right">+55 11 4002 8922</p>
        </div>

        <div className="mt-8 grid gap-8 text-sm text-[#c4b39a] sm:grid-cols-2 lg:grid-cols-4">
          <div className="reveal flex flex-col gap-2">
            <p className="mb-1 font-semibold text-cream">Meu perfil</p>
            <Link to="/perfil">Meu perfil</Link>
            <Link to="/perfil" search={{ aba: "colecao" }}>Minha coleção</Link>
            <Link to="/perfil" search={{ aba: "atividade" }}>Atividade</Link>
            <Link to="/criadores">Estúdio do criador</Link>
            <Link to="/perfil" search={{ aba: "interesses" }}>Lista de interesses</Link>
          </div>
          <div className="reveal flex flex-col gap-2">
            <p className="mb-1 font-semibold text-cream">Central de ajuda</p>
            <p>Central de ajuda</p>
            <Link to="/" hash="catalogo">Como comprar NFTs</Link>
            <Link to="/carteiras">Carteira e segurança</Link>
            <p>Política do mercado</p>
            <p>Denunciar item</p>
          </div>
          <div className="reveal flex flex-col gap-2">
            <p className="mb-1 font-semibold text-cream">Coleções</p>
            <Link to="/" search={{ categoria: "arte-digital", pagina: 1 }}>Arte digital</Link>
            <Link to="/" search={{ categoria: "fotografia", pagina: 1 }}>Fotografia</Link>
            <Link to="/" search={{ categoria: "musica", pagina: 1 }}>Música</Link>
            <Link to="/" search={{ categoria: "arte-3d", pagina: 1 }}>Arte 3D</Link>
            <Link to="/" search={{ categoria: "utilidade", pagina: 1 }}>Utilidade</Link>
          </div>
          <div className="reveal">
            <p className="font-semibold text-cream">Redes sociais</p>
            <div className="mt-3 flex gap-2 text-amber">
              <SocialIcon label="Facebook"><FacebookIcon /></SocialIcon>
              <SocialIcon label="Instagram"><InstagramIcon /></SocialIcon>
              <SocialIcon label="Twitter"><TwitterIcon /></SocialIcon>
              <SocialIcon label="LinkedIn"><LinkedInIcon /></SocialIcon>
              <SocialIcon label="YouTube"><YouTubeIcon /></SocialIcon>
            </div>
            <p className="mt-5 font-semibold text-cream">Carteiras compatíveis</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Metamask", "WalletConnect", "Coinbase"].map((wallet) => (
                <span key={wallet} className="rounded-full border border-amber px-2 py-0.5 text-[10px] tracking-[0.08em] text-amber uppercase">{wallet}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="pb-8 text-center text-xs text-[#c4b39a]">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  );
}

function SocialIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="grid size-8 place-items-center rounded-[6px] border border-amber" role="img" aria-label={label}>
      {children}
    </span>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
      <path fill="currentColor" d="M14.5 8.5V6.8c0-.7.5-1 1.2-1H17V3.5h-1.8C12.8 3.5 12 4.8 12 6.6v1.9H10V11h2v9h2.5v-9H17l.4-2.5h-2.9z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
      <path fill="currentColor" d="M8 3.5h8A4.5 4.5 0 0 1 20.5 8v8a4.5 4.5 0 0 1-4.5 4.5H8A4.5 4.5 0 0 1 3.5 16V8A4.5 4.5 0 0 1 8 3.5zm8 1.8H8A2.7 2.7 0 0 0 5.3 8v8A2.7 2.7 0 0 0 8 18.7h8a2.7 2.7 0 0 0 2.7-2.7V8A2.7 2.7 0 0 0 16 5.3zM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 1.6a2.2 2.2 0 1 0 2.2 2.2A2.2 2.2 0 0 0 12 9.8zm4.35-2.55a.9.9 0 1 1-.9.9.9.9 0 0 1 .9-.9z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
      <path fill="currentColor" d="M19.6 7.3c.5-.3.9-.8 1.1-1.4-.5.3-1 .5-1.6.6a2.4 2.4 0 0 0-4.1 2.2A6.8 6.8 0 0 1 5.7 6.6a2.4 2.4 0 0 0 .7 3.2 2.4 2.4 0 0 1-1.1-.3v.1a2.4 2.4 0 0 0 1.9 2.3 2.4 2.4 0 0 1-1.1.1 2.4 2.4 0 0 0 2.2 1.7 4.8 4.8 0 0 1-3.6 1.2 6.8 6.8 0 0 0 10.4-5.7v-.3c.5-.3.9-.8 1.2-1.3z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
      <path fill="currentColor" d="M6.7 9.2H4.2V19h2.5zM5.4 4.8A1.5 1.5 0 1 0 5.5 7.8 1.5 1.5 0 0 0 5.4 4.8zM19.8 19h-2.5v-5.2c0-1.5-.6-2.5-1.9-2.5a2 2 0 0 0-1.9 1.4 2.6 2.6 0 0 0-.1.9V19h-2.5s.1-8.2 0-9.8h2.5v1.6a2.5 2.5 0 0 1 2.2-1.3c1.6 0 2.8 1.1 2.8 3.4z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
      <path fill="currentColor" d="M21.2 8.2a2.7 2.7 0 0 0-1.9-1.9C17.6 6 12 6 12 6s-5.6 0-7.3.3a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2.5 12a28 28 0 0 0 .3 3.8 2.7 2.7 0 0 0 1.9 1.9C6.4 18 12 18 12 18s5.6 0 7.3-.3a2.7 2.7 0 0 0 1.9-1.9 28 28 0 0 0 .3-3.8 28 28 0 0 0-.3-3.8zM10.2 14.8V9.2L15.5 12z" />
    </svg>
  );
}

function Newsletter() {
  const [note, setNote] = useState("");
  return (
    <form
      className="reveal lg:px-6"
      onSubmit={(event) => {
        event.preventDefault();
        setNote("A lista de novidades ainda não envia mensagens. Nenhum cadastro foi concluído.");
      }}
    >
      <h2 className="max-w-[16ch] text-sm leading-snug font-semibold text-cream">Antecipe-se ao próximo lançamento</h2>
      <div className="mt-3 flex gap-2">
        <Input type="email" required placeholder="digite seu e-mail..." aria-label="E-mail para novidades" className="h-9 rounded-[6px] bg-[#241911] text-xs" />
        <Button type="submit" className="h-9 shrink-0 px-4 text-xs">Enviar</Button>
      </div>
      <p className="mt-3 max-w-[34ch] text-xs leading-5 text-[#c4b39a]">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
      {note ? <p role="status" className="mt-2 text-xs text-amber">{note}</p> : null}
    </form>
  );
}

const SCENARIOS = [
  ["padrao", "Padrão"],
  ["lento", "Carregamento lento"],
  ["vazio", "Catálogo vazio"],
  ["erro-catalogo", "Falha no catálogo"],
  ["offline", "Sem conexão"],
  ["sessao-expirada", "Sessão expirada"],
  ["favorito-falha", "Falha ao favoritar"],
  ["pagamento-recusado", "Pagamento recusado"],
  ["timeout-pedido", "Timeout do pedido"],
  ["pedido-pendente", "Pedido pendente"],
  ["preco-muda", "Preço muda no carrinho"],
] as const;

function ScenarioPanel({ raised }: { raised: boolean }) {
  const [open, setOpen] = useState(false);
  const current = localStorage.getItem("kurio.scenario") ?? "padrao";
  return (
    <div className={cn("fixed bottom-4 left-4 z-40", raised ? "max-lg:bottom-[150px]" : "max-lg:bottom-auto max-lg:top-3 max-lg:left-14")} data-testid="scenario-panel">
      <button type="button" className="rounded-full bg-panel px-3 py-2 text-xs text-muted" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        Simulação
      </button>
      {open ? (
        <div className="mt-2 w-64 rounded-2xl border border-line bg-ink-2 p-3 text-xs">
          <label className="mb-2 block text-muted" htmlFor="scenario">Cenário de rede</label>
          <select
            id="scenario"
            className="w-full rounded-[6px] border border-line bg-ink p-2"
            value={current}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "padrao") localStorage.removeItem("kurio.scenario");
              else localStorage.setItem("kurio.scenario", value);
              window.location.reload();
            }}
          >
            {SCENARIOS.map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            className="mt-2 underline"
            onClick={async () => {
              localStorage.removeItem("kurio.db");
              sessionStorage.clear();
              await api.resetDemo();
              window.location.href = "/";
            }}
          >
            Resetar dados
          </button>
        </div>
      ) : null}
    </div>
  );
}

const ACCOUNT_LINKS: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: "/perfil", label: "Dados do perfil", icon: User },
  { href: "/carteiras", label: "Carteiras", icon: Wallet },
  { href: "/perfil?aba=atividade", label: "Atividade", icon: ShoppingBag },
  { href: "/perfil?aba=interesses", label: "Lista de interesse", icon: Heart },
];

const ACCOUNT_NOTES: { label: string; icon: ComponentType<{ className?: string }> }[] = [
  { label: "Ofertas", icon: Tag },
  { label: "Arquivos baixados", icon: Download },
  { label: "Suporte", icon: TriangleAlert },
];

export function AccountNav() {
  const path = useRouterState({ select: (state) => state.location.pathname + state.location.searchStr });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <aside className="bg-[#241612] px-4 py-5 lg:sticky lg:top-24">
      <h2 className="px-3 text-base font-bold text-[#F5F1EB]">Meu perfil</h2>
      <nav className="mt-4 flex flex-col" aria-label="Conta">
        {ACCOUNT_LINKS.map((item) => {
          const active = path === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.href}
              className="relative flex items-center gap-3 px-3 py-2.5 text-sm text-[#E89B55]"
              aria-current={active ? "page" : undefined}
            >
              {active ? <span className="absolute top-2 bottom-2 left-0 w-0.5 bg-[#D28A4C]" /> : null}
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        {ACCOUNT_NOTES.map((item) => {
          const Icon = item.icon;
          return (
            <span key={item.label} className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#E89B55]">
              <Icon className="size-4" />
              {item.label}
            </span>
          );
        })}
        <div className="my-3 h-px bg-[#D28A4C]" />
        <button
          type="button"
          className="flex items-center gap-3 px-3 py-2.5 text-left text-sm text-[#E89B55]"
          onClick={async () => {
            await api.logout();
            writeToken(null);
            queryClient.clear();
            navigate({ to: "/" });
          }}
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </nav>
    </aside>
  );
}
