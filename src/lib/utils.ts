import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function guestId(): string {
  const key = "kurio.guest";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

export function readToken(): string | null {
  return sessionStorage.getItem("kurio.token");
}

export function writeToken(token: string | null) {
  if (token) sessionStorage.setItem("kurio.token", token);
  else sessionStorage.removeItem("kurio.token");
}
