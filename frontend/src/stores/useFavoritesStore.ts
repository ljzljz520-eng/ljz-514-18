import { create } from "zustand";
import { notification } from "antd";
import type { FavoriteRoute } from "@/stores/useTravelStore";

// 收藏记录仅保存在浏览器 localStorage，不写入后端数据库，
// 因此不会影响公共图数据（nodes/edges）。
const STORAGE_KEY = "cq-travel:route-favorites:v1";

function isValidFavorite(v: unknown): v is FavoriteRoute {
  const f = v as FavoriteRoute;
  return (
    !!f &&
    typeof f.id === "string" &&
    typeof f.name === "string" &&
    typeof f.startId === "string" &&
    typeof f.endId === "string" &&
    typeof f.strategy === "string" &&
    typeof f.totalDistanceMeters === "number" &&
    typeof f.createdAt === "number" &&
    Array.isArray(f.pathNodeIds) &&
    Array.isArray(f.pathNodes) &&
    Array.isArray(f.segmentDistanceMeters)
  );
}

function readFavorites(): FavoriteRoute[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidFavorite);
  } catch {
    return [];
  }
}

function writeFavorites(list: FavoriteRoute[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `fav_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

type State = {
  favorites: FavoriteRoute[];
};

type Actions = {
  addFavorite: (input: Omit<FavoriteRoute, "id" | "createdAt">) => FavoriteRoute | null;
  removeFavorite: (id: string) => void;
};

export const useFavoritesStore = create<State & Actions>((set, get) => ({
  // 初始化时从 localStorage 读取，刷新页面后收藏仍在
  favorites: readFavorites(),

  addFavorite: (input) => {
    const fav: FavoriteRoute = { ...input, id: createId(), createdAt: Date.now() };
    const next = [fav, ...get().favorites];
    if (!writeFavorites(next)) {
      notification.error({ message: "收藏失败", description: "浏览器本地存储不可用或空间不足" });
      return null;
    }
    set({ favorites: next });
    return fav;
  },

  removeFavorite: (id) => {
    const next = get().favorites.filter((f) => f.id !== id);
    if (!writeFavorites(next)) {
      notification.error({ message: "删除失败", description: "浏览器本地存储不可用" });
      return;
    }
    set({ favorites: next });
  },
}));
