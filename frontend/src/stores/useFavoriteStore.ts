import { create } from "zustand";
import { notification } from "antd";
import type { TravelNode } from "@/stores/useTravelStore";

/** 路线收藏记录（路线节点快照，独立于公共图数据存储） */
export type FavoriteRoute = {
  id: string;
  name: string;
  startId: string;
  startName?: string;
  endId: string;
  endName?: string;
  strategy: string;
  totalDistanceMeters: number;
  pathNodeIds: string[];
  pathNodes: TravelNode[];
  segmentDistanceMeters: number[];
  createdAt: string;
};

export type NewFavorite = Omit<FavoriteRoute, "id" | "createdAt">;

type Source = "remote" | "local";

type State = {
  favorites: FavoriteRoute[];
  favoritesLoading: boolean;
  /** 当前数据来源：后端（remote）或浏览器本地（local） */
  source: Source;
};

type Actions = {
  loadFavorites: () => Promise<void>;
  addFavorite: (input: NewFavorite) => Promise<FavoriteRoute | undefined>;
  removeFavorite: (id: string) => Promise<void>;
};

const apiBase = import.meta.env.VITE_API_BASE || "/api";
const STORAGE_KEY = "cq-travel:favorites:v1";

function genId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `fav-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeNode(raw: unknown): TravelNode | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const n = raw as Record<string, unknown>;
  const id = String(n.id ?? "").trim();
  const lat = Number(n.lat);
  const lng = Number(n.lng);
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return {
    id,
    name: typeof n.name === "string" && n.name ? n.name : id,
    lat,
    lng,
    type: typeof n.type === "string" ? n.type : undefined,
    desc: typeof n.desc === "string" ? n.desc : undefined,
  };
}

function sanitizeOne(raw: unknown): FavoriteRoute | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? "").trim();
  const name = String(r.name ?? "").trim();
  const startId = String(r.startId ?? "").trim();
  const endId = String(r.endId ?? "").trim();
  if (!id || !name || !startId || !endId) return undefined;
  return {
    id,
    name,
    startId,
    startName: typeof r.startName === "string" ? r.startName : undefined,
    endId,
    endName: typeof r.endName === "string" ? r.endName : undefined,
    strategy: typeof r.strategy === "string" && r.strategy ? r.strategy : "distance",
    totalDistanceMeters: Number.isFinite(Number(r.totalDistanceMeters)) ? Number(r.totalDistanceMeters) : 0,
    pathNodeIds: Array.isArray(r.pathNodeIds) ? (r.pathNodeIds as unknown[]).map(String) : [],
    pathNodes: Array.isArray(r.pathNodes)
      ? (r.pathNodes as unknown[]).map(sanitizeNode).filter((n): n is TravelNode => Boolean(n))
      : [],
    segmentDistanceMeters: Array.isArray(r.segmentDistanceMeters)
      ? (r.segmentDistanceMeters as unknown[]).map((v) => Number(v)).filter((v) => Number.isFinite(v))
      : [],
    createdAt: typeof r.createdAt === "string" && r.createdAt ? r.createdAt : new Date().toISOString(),
  };
}

function sanitizeList(raw: unknown): FavoriteRoute[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(sanitizeOne).filter((f): f is FavoriteRoute => Boolean(f));
}

function readLocal(): FavoriteRoute[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return sanitizeList(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeLocal(list: FavoriteRoute[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* 本地存储不可用（如隐私模式）时静默忽略 */
  }
}

export const useFavoriteStore = create<State & Actions>((set, get) => ({
  favorites: [],
  favoritesLoading: false,
  source: "local",

  loadFavorites: async () => {
    set({ favoritesLoading: true });
    try {
      const res = await fetch(`${apiBase}/favorites`);
      if (!res.ok) throw new Error("favorites_fetch_failed");
      const data = await res.json();
      set({ favorites: sanitizeList(data), source: "remote" });
    } catch {
      // 后端不可用时降级到浏览器本地存储，刷新页面后仍可见
      set({ favorites: readLocal(), source: "local" });
    } finally {
      set({ favoritesLoading: false });
    }
  },

  addFavorite: async (input) => {
    const record: FavoriteRoute = { ...input, id: genId(), createdAt: new Date().toISOString() };
    if (get().source === "remote") {
      try {
        const res = await fetch(`${apiBase}/favorites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          notification.error({ message: "收藏失败", description: data?.error || "后端错误" });
          return undefined;
        }
        const saved = sanitizeOne(data) ?? record;
        set({ favorites: [saved, ...get().favorites] });
        notification.success({ message: "已收藏", description: `已保存「${saved.name}」` });
        return saved;
      } catch {
        // 网络异常：降级保存到本地，保证数据不丢失
        const next = [record, ...get().favorites];
        writeLocal(next);
        set({ favorites: next, source: "local" });
        notification.warning({ message: "后端不可用", description: "已改为保存到浏览器本地存储" });
        return record;
      }
    }
    const next = [record, ...get().favorites];
    writeLocal(next);
    set({ favorites: next });
    notification.success({ message: "已收藏", description: `已保存「${record.name}」到本地` });
    return record;
  },

  removeFavorite: async (id) => {
    if (get().source === "remote") {
      try {
        const res = await fetch(`${apiBase}/favorites/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (!res.ok && res.status !== 404) {
          const data = await res.json().catch(() => null);
          notification.error({ message: "删除失败", description: data?.error || "后端错误" });
          return;
        }
        set({ favorites: get().favorites.filter((f) => f.id !== id) });
        notification.success({ message: "已删除收藏" });
        return;
      } catch {
        notification.error({ message: "删除失败", description: "网络异常或后端不可用" });
        return;
      }
    }
    const next = get().favorites.filter((f) => f.id !== id);
    writeLocal(next);
    set({ favorites: next });
    notification.success({ message: "已删除收藏" });
  },
}));
