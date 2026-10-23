const SCALE = 100_000_000n;

export function parseEth(value: string): bigint {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const raw = negative ? trimmed.slice(1) : trimmed;
  const [wholeRaw, fracRaw = ""] = raw.split(".");
  if (!/^\d+$/.test(wholeRaw || "0") || (fracRaw && !/^\d+$/.test(fracRaw))) {
    throw new Error(`Valor ETH inválido: ${value}`);
  }
  const whole = BigInt(wholeRaw || "0");
  const frac = BigInt((fracRaw + "00000000").slice(0, 8));
  const amount = whole * SCALE + frac;
  return negative ? -amount : amount;
}

export function formatEth(value: bigint, digits = 2): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / SCALE;
  const fracFull = (abs % SCALE).toString().padStart(8, "0");
  const frac = fracFull.slice(0, digits).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}${frac ? `.${frac}` : ""}`;
}

export function addEth(a: string, b: string): string {
  return formatEth(parseEth(a) + parseEth(b), 8).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function subEth(a: string, b: string): string {
  return formatEth(parseEth(a) - parseEth(b), 8).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function mulEth(a: string, quantity: number): string {
  return formatEth(parseEth(a) * BigInt(quantity), 8)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

export function percentEth(a: string, percent: number): string {
  const amount = (parseEth(a) * BigInt(percent)) / 100n;
  return formatEth(amount, 8).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function compareEth(a: string, b: string): number {
  const delta = parseEth(a) - parseEth(b);
  if (delta === 0n) return 0;
  return delta > 0n ? 1 : -1;
}
