import type { Article, CategoryId, NetworkId, Nft } from "@/types";

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "arte-digital", label: "Arte digital" },
  { id: "fotografia", label: "Fotografia" },
  { id: "musica", label: "Música" },
  { id: "arte-3d", label: "Arte 3D" },
  { id: "colecionaveis", label: "Colecionáveis" },
  { id: "generativa", label: "Generativa" },
  { id: "jogos", label: "Jogos" },
  { id: "assinaturas", label: "Assinaturas" },
  { id: "utilidade", label: "Utilidade" },
];

export const NETWORKS: { id: NetworkId; label: string; feeEth: string }[] = [
  { id: "ethereum", label: "Ethereum", feeEth: "0.0042" },
  { id: "polygon", label: "Polygon", feeEth: "0.0015" },
  { id: "solana", label: "Solana", feeEth: "0.0008" },
];

export const ARTICLES: Article[] = [
  {
    id: "propriedade",
    dateLabel: "12 de setembro | Leitura de 6 min",
    title: "Como funciona a propriedade de NFTs",
    excerpt: "Aprenda a colecionar, negociar e verificar ativos digitais.",
    image: "/nfts/emerald.webp",
  },
  {
    id: "edicoes",
    dateLabel: "28 de agosto | Leitura de 4 min",
    title: "Edições limitadas e o que conferir antes de comprar",
    excerpt: "Disponibilidade, procedência e o que muda quando o preço se atualiza.",
    image: "/nfts/sage.webp",
  },
  {
    id: "carteiras",
    dateLabel: "03 de agosto | Leitura de 5 min",
    title: "Carteiras, redes e taxas sem surpresa",
    excerpt: "Como escolher a rede e revisar a cotação antes de confirmar o pedido.",
    image: "/nfts/neon.webp",
  },
  {
    id: "colecao",
    dateLabel: "19 de julho | Leitura de 7 min",
    title: "Montando uma coleção com intenção",
    excerpt: "Um guia curto para equilibrar raridade, criadores e orçamento.",
    image: "/nfts/golden.webp",
  },
];

const IMAGES = ["/nfts/emerald.webp", "/nfts/sage.webp", "/nfts/neon.webp", "/nfts/golden.webp"];

interface Seed {
  id: string;
  name: string;
  priceEth: string;
  previousPriceEth?: string;
  image?: string;
  category: CategoryId;
  network?: NetworkId;
  creator?: string;
  trending?: boolean;
  fresh?: boolean;
  available?: number;
}

const PRIMARY: Seed[] = [
  { id: "emerald-ape-042", name: "Emerald Ape #042", priceEth: "1.19", category: "colecionaveis", network: "ethereum", creator: "Mina Sol", image: "/nfts/emerald.webp", fresh: true },
  { id: "sage-nomad-009", name: "Sage Nomad #009", priceEth: "1.69", category: "arte-digital", network: "ethereum", creator: "Otto Vale", image: "/nfts/sage.webp", trending: true, fresh: true },
  { id: "neon-vessel-552", name: "Neon Vessel #552", priceEth: "1.99", previousPriceEth: "2.29", category: "generativa", network: "polygon", creator: "Lina Park", image: "/nfts/neon.webp", trending: true },
  { id: "cosmic-bloom-118", name: "Cosmic Bloom #118", priceEth: "1.29", category: "arte-3d", network: "ethereum", creator: "Ivo Mendes", image: "/nfts/sage.webp", fresh: true },
  { id: "violet-nomad-314", name: "Violet Nomad #314", priceEth: "1.39", category: "fotografia", network: "solana", creator: "Nora Kim", image: "/nfts/golden.webp" },
  { id: "ivory-baron-088", name: "Ivory Baron #088", priceEth: "1.79", category: "musica", network: "ethereum", creator: "Caio Luz", image: "/nfts/golden.webp", trending: true },
  { id: "golden-beat-207", name: "Golden Beat #207", priceEth: "0.99", category: "musica", network: "polygon", creator: "Bela Ruiz", image: "/nfts/golden.webp", fresh: true },
  { id: "golden-signal-168", name: "Golden Signal #168", priceEth: "0.39", category: "jogos", network: "solana", creator: "Ravi Cole", image: "/nfts/golden.webp" },
  { id: "amber-relic-021", name: "Amber Relic #021", priceEth: "2.15", category: "assinaturas", network: "ethereum", creator: "Mina Sol", image: "/nfts/emerald.webp" },
];

const EXTRA_NAMES = [
  "Marble Witness",
  "Copper Psalm",
  "Indigo Harbor",
  "Silent Medal",
  "Paper Crown",
  "Velvet Orbit",
  "Cedar Signal",
  "Lunar Ticket",
  "Brass Garden",
  "Opal Circuit",
  "Honey Archive",
  "Night Ledger",
  "Quartz Pilot",
  "Saffron Key",
  "Moss Atlas",
  "Ruby Station",
  "Pearl Index",
  "Cobalt Diary",
  "Umber Gate",
  "Iris Contract",
  "Flint Sonata",
  "Juniper Badge",
  "Silver Folio",
  "Ochre Relay",
  "Plum Vault",
  "Nimbus Stamp",
  "Terra Chorus",
];

const CREATORS = ["Mina Sol", "Otto Vale", "Lina Park", "Ivo Mendes", "Nora Kim", "Caio Luz", "Bela Ruiz", "Ravi Cole"];
const CATEGORY_CYCLE: CategoryId[] = CATEGORIES.map((item) => item.id);
const NETWORK_CYCLE: NetworkId[] = ["ethereum", "polygon", "solana", "ethereum", "solana", "polygon"];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function createCatalog(): Nft[] {
  const seeds: Seed[] = [
    ...PRIMARY,
    ...EXTRA_NAMES.map((name, index) => ({
      id: `${name.toLowerCase().replace(/\s+/g, "-")}-${index + 11}`,
      name: `${name} #${String(index + 11).padStart(3, "0")}`,
      priceEth: (0.22 + ((index * 37) % 180) / 100).toFixed(2),
      category: CATEGORY_CYCLE[index % CATEGORY_CYCLE.length],
      network: NETWORK_CYCLE[index % NETWORK_CYCLE.length],
      creator: CREATORS[index % CREATORS.length],
      image: IMAGES[index % IMAGES.length],
      trending: index % 5 === 0,
      fresh: index % 4 === 0,
      available: index % 11 === 0 ? 0 : 8,
    })),
  ];

  return seeds.map((seed, index) => {
    const creator = seed.creator ?? CREATORS[index % CREATORS.length];
    const available = seed.available ?? 12;
    return {
      id: seed.id,
      name: seed.name,
      creator,
      creatorInitials: initials(creator),
      category: seed.category,
      network: seed.network ?? "ethereum",
      priceEth: seed.priceEth,
      previousPriceEth: seed.previousPriceEth,
      image: seed.image ?? IMAGES[index % IMAGES.length],
      description: `${seed.name} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      editions: [
        { id: `${seed.id}-1`, name: "1/1", available: Math.min(1, available), total: 1 },
        { id: `${seed.id}-10`, name: "1/10", available: Math.min(10, available), total: 10 },
        { id: `${seed.id}-50`, name: "1/50", available, total: 50 },
        { id: `${seed.id}-open`, name: "ABERTA", available, total: 100 },
      ],
      createdAt: new Date(Date.UTC(2026, 8, 30 - index, 12, 0, 0)).toISOString(),
      trending: Boolean(seed.trending),
      fresh: Boolean(seed.fresh),
      version: 1,
      contract: `0x${(index + 1).toString(16).padStart(4, "0")}…${(8900 + index).toString(16)}`,
    };
  });
}

export const HERO_NFT_ID = "emerald-ape-042";
export const FEATURED_NFT_ID = "sage-nomad-009";

export async function sha256(value: string) {
  const data = new TextEncoder().encode(`kurio::${value}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
