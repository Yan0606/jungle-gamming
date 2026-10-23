import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/shell";
import { sessionQuery } from "@/lib/queries";
import { HomePage, type HomeSearch } from "@/pages/home";
import { DetailPage } from "@/pages/detail";
import { CartPage } from "@/pages/cart";
import { CheckoutPage } from "@/pages/checkout";
import { OrderPage } from "@/pages/order";
import { AuthDialog } from "@/pages/auth";
import { CreatorsPage, ProfilePage, WalletsPage } from "@/pages/account";
import { usePageMeta } from "@/lib/meta";

export interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundPage() {
  usePageMeta("Página não encontrada — Kurio", "Esse endereço não faz parte do marketplace Kurio.");
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <p className="mt-3 text-muted">Esse endereço não faz parte do marketplace.</p>
    </div>
  );
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
  notFoundComponent: NotFoundPage,
});

function emptySearch(search: Record<string, unknown>): HomeSearch {
  return {
    q: typeof search.q === "string" ? search.q : "",
    categoria: typeof search.categoria === "string" ? search.categoria : "",
    rede: typeof search.rede === "string" ? search.rede : "",
    min: typeof search.min === "string" ? search.min : "",
    max: typeof search.max === "string" ? search.max : "",
    ordem: typeof search.ordem === "string" ? search.ordem : "recent",
    pagina: Number(search.pagina ?? 1) || 1,
    aba: typeof search.aba === "string" ? search.aba : "todos",
  };
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: emptySearch,
  component: function Index() {
    const search = indexRoute.useSearch();
    return <HomePage search={search} />;
  },
});

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nft/$id",
  component: function Nft() {
    const { id } = nftRoute.useParams();
    return <DetailPage id={id} />;
  },
});

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/carrinho",
  component: CartPage,
});

async function requireUser(context: RouterContext) {
  const session = await context.queryClient.ensureQueryData(sessionQuery);
  if (!session) throw redirect({ to: "/entrar", search: { redirect: window.location.pathname } });
  return session;
}

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pagamento",
  beforeLoad: ({ context }) => requireUser(context),
  component: CheckoutPage,
});

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pedido/$id",
  beforeLoad: ({ context }) => requireUser(context),
  component: function Order() {
    const { id } = orderRoute.useParams();
    return <OrderPage id={id} />;
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/entrar",
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: function Login() {
    const { redirect: next } = loginRoute.useSearch();
    return (
      <>
        <HomePage search={emptySearch({})} />
        <AuthDialog mode="login" redirect={next} />
      </>
    );
  },
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cadastro",
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: function Register() {
    const { redirect: next } = registerRoute.useSearch();
    return (
      <>
        <HomePage search={emptySearch({})} />
        <AuthDialog mode="register" redirect={next} />
      </>
    );
  },
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/perfil",
  validateSearch: (search: Record<string, unknown>): { aba?: string } => ({
    aba: typeof search.aba === "string" ? search.aba : undefined,
  }),
  beforeLoad: ({ context }) => requireUser(context),
  component: function Profile() {
    const { aba } = profileRoute.useSearch();
    return <ProfilePage aba={aba} />;
  },
});

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/carteiras",
  beforeLoad: ({ context }) => requireUser(context),
  component: WalletsPage,
});

const creatorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/criadores",
  component: CreatorsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  nftRoute,
  cartRoute,
  checkoutRoute,
  orderRoute,
  loginRoute,
  registerRoute,
  profileRoute,
  walletsRoute,
  creatorsRoute,
]);

export const router = createRouter({
  routeTree,
  context: { queryClient: undefined! },
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
