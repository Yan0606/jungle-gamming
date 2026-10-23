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

async function expectLoggedOut(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) < 640) {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
    return;
  }
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
}

async function addAndOpenCheckout(page: Page) {
  await page.goto("/nft/golden-signal-168");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await page.getByLabel("Tipo de carteira").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Conectar", exact: true }).click();
  await expect(page.getByText("Carteira conectada nesta simulação.")).toBeVisible();
}

test("cupom expirado e remoção do item", async ({ page }) => {
  await reset(page);
  await page.goto("/nft/golden-signal-168");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.getByLabel("Cupom").fill("EXPIRADO");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Este cupom expirou.")).toBeVisible();
  await page.getByRole("button", { name: "Remover" }).click();
  await expect(page.getByRole("heading", { name: "Carrinho de NFTs" })).toBeVisible();
  await expect(page.getByText("Escolha um NFT no mercado para começar a coleção.")).toBeVisible();
});

test("catálogo vazio, falha e nova tentativa", async ({ page }) => {
  await reset(page, "vazio");
  await page.goto("/");
  await expect(page.getByText("Nenhum NFT encontrado com esses filtros.")).toBeVisible();

  await page.evaluate(() => localStorage.setItem("kurio.scenario", "erro-catalogo"));
  await page.reload();
  await expect(page.getByText("Não foi possível carregar o catálogo.")).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("kurio.scenario"));
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByRole("heading", { name: "Emerald Ape #042" })).toBeVisible();
});

test("sessão expirada encerra o acesso privado", async ({ page }) => {
  await reset(page);
  await login(page);
  await page.evaluate(() => localStorage.setItem("kurio.scenario", "sessao-expirada"));
  await page.reload();
  await expectLoggedOut(page);
  await page.goto("/perfil");
  await expect(page).toHaveURL(/entrar/);
});

test("perfil e carteira exibem erros de validação", async ({ page }) => {
  await reset(page);
  await login(page);
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Informe o nome de usuário.")).toBeVisible();
  await page.goto("/carteiras");
  await page.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByText("Dê um nome à carteira.")).toBeVisible();
  await expect(page.getByText("Endereço inválido.")).toBeVisible();
});

test("busca abre em diálogo e fecha pelo teclado", async ({ page }) => {
  await reset(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Buscar NFTs" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Busca" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("pagamento recusado preserva o carrinho", async ({ page }) => {
  await reset(page, "pagamento-recusado");
  await login(page);
  await addAndOpenCheckout(page);
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("heading", { name: "Pagamento recusado" })).toBeVisible({ timeout: 15_000 });
  await page.goto("/carrinho");
  await expect(page.getByRole("link", { name: "Golden Signal #168" })).toBeVisible();
});

test("mudança de preço exige nova confirmação", async ({ page }) => {
  await reset(page, "preco-muda");
  await login(page);
  await addAndOpenCheckout(page);
  await expect(page.getByText(/preço ou a disponibilidade atualizados/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Confirmar compra" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Revisar e aceitar a cotação atualizada" }).check();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("heading", { name: "Pedido confirmado" })).toBeVisible();
});

test("timeout recupera o mesmo pedido", async ({ page }) => {
  test.setTimeout(45_000);
  await reset(page, "timeout-pedido");
  await login(page);
  await addAndOpenCheckout(page);
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByText("A compra pode ter sido registrada. Recuperando o mesmo pedido.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Pedido confirmado" })).toBeVisible({ timeout: 20_000 });
  const orderUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(orderUrl);
  await expect(page.getByRole("heading", { name: "Pedido confirmado" })).toBeVisible();
});
