import { expect, test, type Page } from "@playwright/test";

async function reset(page: Page, scenario = "padrao") {
  await page.addInitScript((name) => {
    if (sessionStorage.getItem("kurio.test-ready")) return;
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem("kurio.test-ready", "1");
    if (name !== "padrao") localStorage.setItem("kurio.scenario", name);
  }, scenario);
}

async function login(page: Page, email = "ana@kurio.dev") {
  const firstName = email.startsWith("bruno") ? "Bruno" : "Ana";
  await page.goto("/entrar");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("coleciona123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expectLoggedIn(page, firstName);
}

async function expectLoggedIn(page: Page, firstName: string) {
  if ((page.viewportSize()?.width ?? 1440) < 640) {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("link", { name: "Meu perfil" })).toBeVisible();
    await page.keyboard.press("Escape");
    return;
  }
  await expect(page.getByRole("link", { name: firstName })).toBeVisible();
}

test("busca, filtros, ordenação e paginação ficam na URL", async ({ page }) => {
  await reset(page);
  await page.goto("/");
  const mobile = (page.viewportSize()?.width ?? 1440) < 1024;
  await expect(page.getByRole("heading", { name: mobile ? /cultura digital/i : /seja dono do futuro/i })).toBeVisible();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await page.goBack();
  await expect(page).not.toHaveURL(/pagina=2/);
  if (mobile) await page.getByRole("button", { name: "Filtrar" }).click();
  await page.getByRole("checkbox", { name: /Arte digital/ }).check();
  await expect(page).toHaveURL(/categoria=arte-digital/);
  await expect(page).toHaveURL(/pagina=1/);
  await page.getByLabel("Ordenar por").selectOption("price-asc");
  await expect(page).toHaveURL(/ordem=price-asc/);
  if (mobile) {
    await page.getByRole("textbox", { name: "Explorar coleções" }).fill("Sage");
    await page.getByRole("textbox", { name: "Explorar coleções" }).press("Enter");
  } else {
    await page.getByRole("button", { name: "Buscar NFTs" }).click();
    await page.getByRole("textbox", { name: "Busca" }).fill("Sage");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
  }
  await expect(page).toHaveURL(/q=Sage/);
});

test("detalhe direto e NFT inexistente", async ({ page }) => {
  await reset(page);
  await page.goto("/nft/sage-nomad-009");
  await expect(page.getByRole("heading", { name: "Sage Nomad #009" })).toBeVisible();
  await page.goto("/nft/nao-existe");
  await expect(page.getByRole("heading", { name: "NFT não encontrado" })).toBeVisible();
});

test("cadastro, login, logout e troca de usuário", async ({ page }) => {
  await reset(page);
  const email = `novo${Date.now()}@kurio.dev`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome", { exact: true }).fill("Nova Pessoa");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("curta");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("A senha precisa de 8 caracteres.")).toBeVisible();
  await page.getByLabel("Senha", { exact: true }).fill("senhasegura");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expectLoggedIn(page, "Nova");
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Sair" }).click();
  await login(page, "bruno@kurio.dev");
});

test("favorito com falha e recuperação", async ({ page }) => {
  await reset(page, "favorito-falha");
  await login(page);
  await page.goto("/nft/golden-signal-168");
  await page.getByRole("button", { name: "Favoritar" }).click();
  await expect(page.getByText("Não foi possível salvar o favorito.")).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("kurio.scenario"));
  await page.reload();
  await page.getByRole("button", { name: "Favoritar" }).click();
  await expect(page.getByRole("button", { name: "Favorito" })).toBeVisible();
});

test("carrinho, cupom e persistência", async ({ page }) => {
  await reset(page);
  await page.goto("/nft/golden-signal-168");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByRole("heading", { name: "Carrinho de NFTs" })).toBeVisible();
  await page.getByLabel("Quantidade").fill("2");
  await page.getByLabel("Cupom").fill("INVALIDO");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Cupom inválido.")).toBeVisible();
  await page.getByLabel("Cupom").fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Remover KURIO10")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Remover KURIO10")).toBeVisible();
});

test("compra completa até o recibo", async ({ page }) => {
  await reset(page);
  await login(page);
  await page.goto("/nft/golden-signal-168");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await page.getByLabel("Tipo de carteira").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Conectar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("heading", { name: "Pedido confirmado" })).toBeVisible();
});

test("skeleton no carregamento lento", async ({ page }) => {
  await reset(page, "lento");
  await page.goto("/");
  await expect(page.getByLabel("Carregando catálogo")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Emerald Ape #042" })).toBeVisible();
});
