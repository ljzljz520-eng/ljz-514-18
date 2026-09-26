import { Button, Divider, Input, Modal, Popconfirm, Segmented, Select, Skeleton, Tag, Typography } from "antd";
import { ArrowLeftRight, FolderOpen, Route, Star, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTravelStore } from "@/stores/useTravelStore";
import { useFavoriteStore, type FavoriteRoute } from "@/stores/useFavoriteStore";
import { STRATEGY_OPTIONS, strategyLabel, type Strategy } from "@/lib/strategy";

const { Text } = Typography;

function formatDistance(m: number): string {
  if (!Number.isFinite(m) || m < 0) return "";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function ControlPanel() {
  const nodes = useTravelStore((s) => s.nodes);
  const nodesLoading = useTravelStore((s) => s.nodesLoading);
  const startId = useTravelStore((s) => s.startId);
  const endId = useTravelStore((s) => s.endId);
  const strategy = useTravelStore((s) => s.strategy);
  const route = useTravelStore((s) => s.route);
  const routeLoading = useTravelStore((s) => s.routeLoading);
  const setStartId = useTravelStore((s) => s.setStartId);
  const setEndId = useTravelStore((s) => s.setEndId);
  const setStrategy = useTravelStore((s) => s.setStrategy);
  const swap = useTravelStore((s) => s.swap);
  const clear = useTravelStore((s) => s.clear);
  const fetchRoute = useTravelStore((s) => s.fetchRoute);
  const applyRouteSnapshot = useTravelStore((s) => s.applyRouteSnapshot);

  const favorites = useFavoriteStore((s) => s.favorites);
  const favoritesLoading = useFavoriteStore((s) => s.favoritesLoading);
  const favoriteSource = useFavoriteStore((s) => s.source);
  const addFavorite = useFavoriteStore((s) => s.addFavorite);
  const removeFavorite = useFavoriteStore((s) => s.removeFavorite);

  const [keyword, setKeyword] = useState<string>("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const list = k ? nodes.filter((n) => (n.name || "").toLowerCase().includes(k)) : nodes;
    return list.map((n) => ({ label: n.name || n.id, value: n.id }));
  }, [keyword, nodes]);

  const nodeName = useMemo(() => {
    const map = new Map(nodes.map((n) => [n.id, n.name || n.id]));
    return (id?: string) => (id ? map.get(id) ?? id : "");
  }, [nodes]);

  const distanceText = useMemo(() => (route ? formatDistance(route.totalDistanceMeters) : ""), [route]);

  const openSaveModal = () => {
    if (!route) return;
    setSaveName(`${nodeName(route.startId)} → ${nodeName(route.endId)}`);
    setSaveOpen(true);
  };

  const confirmSave = async () => {
    if (!route) return;
    const name = saveName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const saved = await addFavorite({
        name,
        startId: route.startId,
        startName: nodeName(route.startId),
        endId: route.endId,
        endName: nodeName(route.endId),
        strategy: route.strategy || strategy,
        totalDistanceMeters: route.totalDistanceMeters,
        pathNodeIds: route.pathNodeIds,
        pathNodes: route.pathNodes,
        segmentDistanceMeters: route.segmentDistanceMeters,
      });
      if (saved) {
        setSaveOpen(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const loadFavorite = (fav: FavoriteRoute) => {
    const favStrategy: Strategy = fav.strategy === "stops" ? "stops" : "distance";
    applyRouteSnapshot({
      startId: fav.startId,
      endId: fav.endId,
      strategy: favStrategy,
      route: {
        startId: fav.startId,
        endId: fav.endId,
        totalDistanceMeters: fav.totalDistanceMeters,
        pathNodeIds: fav.pathNodeIds,
        pathNodes: fav.pathNodes,
        segmentDistanceMeters: fav.segmentDistanceMeters,
        strategy: favStrategy,
      },
    });
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">重庆旅游线路规划</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">数据源：nodes.csv</span>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">权重：地理距离</span>
          </div>
        </div>
        <Button type="text" onClick={() => clear()} icon={<X className="h-4 w-4" />} />
      </div>

      <Divider className="my-3" />

      {nodesLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <div className="space-y-2">
            <Text type="secondary">起点</Text>
            <Select
              showSearch
              value={startId}
              placeholder="选择起点"
              options={options}
              className="w-full"
              filterOption={false}
              onSearch={setKeyword}
              onChange={(v) => setStartId(v)}
              allowClear
            />
          </div>

          <div className="mt-3 space-y-2">
            <Text type="secondary">终点</Text>
            <Select
              showSearch
              value={endId}
              placeholder="选择终点"
              options={options}
              className="w-full"
              filterOption={false}
              onSearch={setKeyword}
              onChange={(v) => setEndId(v)}
              allowClear
            />
          </div>

          <div className="mt-3 space-y-2">
            <Text type="secondary">规划策略</Text>
            <Segmented
              block
              value={strategy}
              options={STRATEGY_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
              onChange={(v) => setStrategy(v as Strategy)}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={() => swap()} icon={<ArrowLeftRight className="h-4 w-4" />}>
              交换
            </Button>
            <Button type="primary" loading={routeLoading} onClick={() => fetchRoute()} icon={<Route className="h-4 w-4" />}>
              开始规划
            </Button>
          </div>

          <Divider className="my-4" />

          <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-slate-900">路径结果</div>
                {route ? <Tag color="blue">{strategyLabel(route.strategy)}</Tag> : null}
              </div>
              <div className="flex items-center gap-2">
                {route ? <div className="text-xs text-slate-500">{distanceText}</div> : null}
                {route ? (
                  <Button size="small" type="primary" ghost icon={<Star className="h-3.5 w-3.5" />} onClick={openSaveModal}>
                    收藏
                  </Button>
                ) : null}
              </div>
            </div>

            {route ? (
              <div className="mt-3 space-y-2">
                {route.pathNodes.map((n, idx) => (
                  <div key={n.id} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-900">
                        <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs">
                          {idx + 1}
                        </span>
                        {n.name}
                      </div>
                      <div className="text-xs text-slate-500">{n.type || ""}</div>
                    </div>
                    {n.desc ? <div className="mt-1 text-xs text-slate-600">{n.desc}</div> : null}
                    {idx > 0 && Number.isFinite(route.segmentDistanceMeters?.[idx - 1]) ? (
                      <div className="mt-1 text-xs text-slate-500">
                        与上一点约 {Math.round(route.segmentDistanceMeters[idx - 1])} m
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600">选择起点与终点后开始规划。</div>
            )}
          </div>

          <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-slate-900">我的收藏</div>
                <Tag>{favoriteSource === "remote" ? "后端存储" : "本地存储"}</Tag>
              </div>
              <div className="text-xs text-slate-500">{favorites.length} 条</div>
            </div>

            {favoritesLoading ? (
              <div className="mt-3">
                <Skeleton active paragraph={{ rows: 2 }} />
              </div>
            ) : favorites.length > 0 ? (
              <div className="mt-3 space-y-2">
                {favorites.map((fav) => (
                  <div key={fav.id} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">{fav.name}</div>
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          {nodeName(fav.startId)} → {nodeName(fav.endId)}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Tag color="blue">{strategyLabel(fav.strategy)}</Tag>
                          <span className="text-xs text-slate-500">{formatDistance(fav.totalDistanceMeters)}</span>
                          <span className="text-xs text-slate-400">{fav.pathNodeIds.length} 个节点</span>
                          <span className="text-xs text-slate-400">{formatTime(fav.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <Button size="small" icon={<FolderOpen className="h-3.5 w-3.5" />} onClick={() => loadFavorite(fav)}>
                          载入
                        </Button>
                        <Popconfirm
                          title="删除收藏"
                          description={`确认删除「${fav.name}」吗？删除后不可恢复。`}
                          okText="删除"
                          cancelText="取消"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => removeFavorite(fav.id)}
                        >
                          <Button size="small" danger icon={<Trash2 className="h-3.5 w-3.5" />}>
                            删除
                          </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-600">暂无收藏。规划出满意路线后，点击“收藏”保存。</div>
            )}
          </div>
        </>
      )}

      <Modal
        title="收藏当前路线"
        open={saveOpen}
        onOk={() => void confirmSave()}
        onCancel={() => setSaveOpen(false)}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        okButtonProps={{ disabled: !saveName.trim() }}
        destroyOnHidden
      >
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-sm text-slate-600">收藏名称</div>
            <Input
              value={saveName}
              maxLength={50}
              showCount
              placeholder="给这条路线起个名字"
              onChange={(e) => setSaveName(e.target.value)}
              onPressEnter={() => void confirmSave()}
            />
          </div>
          {route ? (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <div>起点：{nodeName(route.startId)}</div>
              <div className="mt-1">终点：{nodeName(route.endId)}</div>
              <div className="mt-1">策略：{strategyLabel(route.strategy)}</div>
              <div className="mt-1">
                全程约 {distanceText}，途经 {route.pathNodeIds.length} 个节点
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
