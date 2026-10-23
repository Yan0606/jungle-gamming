import { expect, test, type Page } from "@playwright/test";

async function reset(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("kurio.test-ready")) return;
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem("kurio.test-ready", "1");
  });
}

async function settle(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function login(page: Page) {
  await page.goto("/entrar");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("ana@kurio.dev");
  await page.getByLabel("Senha", { exact: true }).fill("coleciona123");
  await page.getByRole("button", { name: "Entrar" }).click();
  if ((page.viewportSize()?.width ?? 1440) < 640) {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("link", { name: "Meu perfil" })).toBeVisible();
    await page.keyboard.press("Escape");
    return;
  }
  await expect(page.getByRole("link", { name: "Ana" })).toBeVisible();
}

test("início", async ({ page }) => {
  await reset(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /seja dono do futuro/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Emerald Ape #042" })).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("inicio.png", { fullPage: true });
});

test("detalhe", async ({ page }) => {
  await reset(page);
  await page.goto("/nft/emerald-ape-042");
  await expect(page.getByRole("heading", { name: "Emerald Ape #042" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Adicionar ao carrinho" })).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("detalhe.png", { fullPage: true });
});

test("carrinho", async ({ page }) => {
  await reset(page);
  await page.goto("/nft/golden-signal-168");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByRole("heading", { name: "Carrinho de NFTs" })).toBeVisible();
  await expect(page.getByText("Colecionadores também viram")).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("carrinho.png", { fullPage: true });
});

test("pagamento", async ({ page }) => {
  await reset(page);
  await login(page);
  await page.goto("/nft/golden-signal-168");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await page.getByLabel("Tipo de carteira").selectOption({ index: 1 });
  await expect(page.getByLabel("Endereço da carteira")).toHaveValue(/0x/);
  await expect(page.getByRole("heading", { name: "Seus NFTs" })).toBeVisible();
  await settle(page);
  await expect(page).toHaveScreenshot("pagamento.png", { fullPage: true });
});
