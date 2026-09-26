import { create } from "zustand";
import { notification } from "antd";
import { DEFAULT_STRATEGY, type Strategy } from "@/lib/strategy";

export type TravelNode = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type?: string;
  desc?: string;
};

export type PathResult = {
  startId: string;
  endId: string;
  totalDistanceMeters: number;
  pathNodeIds: string[];
  pathNodes: TravelNode[];
  segmentDistanceMeters: number[];
  strategy?: string;
};

export type RouteSnapshot = {
  startId: string;
  endId: string;
  strategy: Strategy;
  route: PathResult;
};

type State = {
  nodes: TravelNode[];
  nodesLoading: boolean;
  startId?: string;
  endId?: string;
  strategy: Strategy;
  route?: PathResult;
  routeLoading: boolean;
  selectedNodeId?: string;
};

type Actions = {
  loadNodes: () => Promise<void>;
  setStartId: (id?: string) => void;
  setEndId: (id?: string) => void;
  setStrategy: (strategy: Strategy) => void;
  swap: () => void;
  clear: () => void;
  setSelectedNodeId: (id?: string) => void;
  fetchRoute: () => Promise<void>;
  /** 将收藏的路线快照恢复到规划器（起点/终点/策略/路线节点） */
  applyRouteSnapshot: (snapshot: RouteSnapshot) => void;
};

const apiBase = import.meta.env.VITE_API_BASE || "/api";

export const useTravelStore = create<State & Actions>((set, get) => ({
  nodes: [],
  nodesLoading: false,
  routeLoading: false,
  strategy: DEFAULT_STRATEGY,

  loadNodes: async () => {
    if (get().nodesLoading) return;
    set({ nodesLoading: true });
    try {
      const res = await fetch(`${apiBase}/nodes`);
      if (!res.ok) throw new Error("nodes_fetch_failed");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("nodes_payload_invalid");
      const nodes = (data as unknown[])
        .map((raw) => {
          const r = (raw ?? {}) as Record<string, unknown>;
          const id = String(r.id ?? "").trim();
          const name = String(r.name ?? "").trim();
          const lat = Number(r.lat);
          const lng = Number(r.lng);
          const type = typeof r.type === "string" ? r.type : undefined;
          const desc = typeof r.desc === "string" ? r.desc : undefined;
          return { id, name, lat, lng, type, desc } satisfies TravelNode;
        })
        .filter((n) => n.id && Number.isFinite(n.lat) && Number.isFinite(n.lng));
      set({ nodes });
    } catch {
      notification.error({ message: "加载节点失败", description: "请检查后端服务是否已启动" });
    } finally {
      set({ nodesLoading: false });
    }
  },

  setStartId: (id) => set({ startId: id, route: undefined }),
  setEndId: (id) => set({ endId: id, route: undefined }),
  setStrategy: (strategy) => set({ strategy, route: undefined }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  applyRouteSnapshot: (snapshot) =>
    set({
      startId: snapshot.startId,
      endId: snapshot.endId,
      strategy: snapshot.strategy,
      route: snapshot.route,
      selectedNodeId: undefined,
    }),

  swap: () => {
    const { startId, endId } = get();
    set({ startId: endId, endId: startId, route: undefined });
  },

  clear: () => set({ startId: undefined, endId: undefined, route: undefined, selectedNodeId: undefined }),

  fetchRoute: async () => {
    const { startId, endId, strategy } = get();
    if (!startId || !endId) {
      notification.warning({ message: "请选择起点与终点" });
      return;
    }
    set({ routeLoading: true });
    try {
      const qs = new URLSearchParams({ from: startId, to: endId, strategy });
      const res = await fetch(`${apiBase}/path?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        notification.error({ message: "规划失败", description: data?.error || "后端错误" });
        return;
      }
      const route = data as PathResult;
      if (!route.strategy) route.strategy = strategy;
      set({ route });
    } catch {
      notification.error({ message: "规划失败", description: "网络异常或后端不可用" });
    } finally {
      set({ routeLoading: false });
    }
  },
}));
