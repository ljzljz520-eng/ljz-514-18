import { Button, Divider, Input, Modal, Select, Skeleton, Tabs, Tag, Typography, message } from "antd";
import { ArrowLeftRight, Route, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import FavoritesPanel from "@/components/FavoritesPanel";
import { ROUTE_STRATEGY, useTravelStore } from "@/stores/useTravelStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";

const { Text } = Typography;

type BottomTab = "result" | "favorites";

export default function ControlPanel() {
  const nodes = useTravelStore((s) => s.nodes);
  const nodesLoading = useTravelStore((s) => s.nodesLoading);
  const startId = useTravelStore((s) => s.startId);
  const endId = useTravelStore((s) => s.endId);
  const route = useTravelStore((s) => s.route);
  const routeLoading = useTravelStore((s) => s.routeLoading);
  const setStartId = useTravelStore((s) => s.setStartId);
  const setEndId = useTravelStore((s) => s.setEndId);
  const swap = useTravelStore((s) => s.swap);
  const clear = useTravelStore((s) => s.clear);
  const fetchRoute = useTravelStore((s) => s.fetchRoute);

  const favorites = useFavoritesStore((s) => s.favorites);
  const addFavorite = useFavoritesStore((s) => s.addFavorite);

  const [keyword, setKeyword] = useState<string>("");
  const [bottomTab, setBottomTab] = useState<BottomTab>("result");
  const [favModalOpen, setFavModalOpen] = useState(false);
  const [favName, setFavName] = useState("");

  const options = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const list = k ? nodes.filter((n) => (n.name || "").toLowerCase().includes(k)) : nodes;
    return list.map((n) => ({ label: n.name || n.id, value: n.id }));
  }, [keyword, nodes]);

  const distanceText = useMemo(() => {
    if (!route) return "";
    const m = route.totalDistanceMeters;
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(2)} km`;
  }, [route]);

  const startName = useMemo(
    () => nodes.find((n) => n.id === route?.startId)?.name ?? route?.startId ?? "",
    [nodes, route],
  );
  const endName = useMemo(
    () => nodes.find((n) => n.id === route?.endId)?.name ?? route?.endId ?? "",
    [nodes, route],
  );

  const defaultFavName = route && startName && endName ? `${startName} → ${endName}` : "";

  const openFavModal = () => {
    if (!route) return;
    setFavName(defaultFavName);
    setFavModalOpen(true);
  };

  const handleSaveFavorite = () => {
    if (!route) return;
    const name = favName.trim() || defaultFavName;
    if (!name) {
      message.warning("请填写收藏名称");
      return;
    }
    const saved = addFavorite({
      name,
      startId: route.startId,
      startName,
      endId: route.endId,
      endName,
      strategy: ROUTE_STRATEGY.value,
      strategyLabel: ROUTE_STRATEGY.label,
      totalDistanceMeters: route.totalDistanceMeters,
      pathNodeIds: route.pathNodeIds,
      pathNodes: route.pathNodes,
      segmentDistanceMeters: route.segmentDistanceMeters,
    });
    if (saved) {
      message.success(`已收藏「${name}」`);
      setFavModalOpen(false);
      setBottomTab("favorites");
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">重庆旅游线路规划</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">数据源：nodes.csv</span>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">权重：地理距离</span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">策略：{ROUTE_STRATEGY.label}</span>
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

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={() => swap()} icon={<ArrowLeftRight className="h-4 w-4" />}>
              交换
            </Button>
            <Button type="primary" loading={routeLoading} onClick={() => fetchRoute()} icon={<Route className="h-4 w-4" />}>
              开始规划
            </Button>
          </div>

          <Divider className="my-4" />

          <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white px-3 pb-3">
            <Tabs
              size="small"
              activeKey={bottomTab}
              onChange={(k) => setBottomTab(k as BottomTab)}
              items={[
                {
                  key: "result",
                  label: "路径结果",
                  children: (
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-500">{route ? distanceText : "尚未规划"}</div>
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          disabled={!route}
                          icon={<Star className="h-3.5 w-3.5" />}
                          onClick={openFavModal}
                        >
                          收藏路线
                        </Button>
                      </div>

                      {route ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Tag color="blue" className="mr-0">{ROUTE_STRATEGY.label}</Tag>
                            <span>共 {route.pathNodes.length} 个节点</span>
                          </div>
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
                              {idx > 0 ? (
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
                  ),
                },
                {
                  key: "favorites",
                  label: `我的收藏 (${favorites.length})`,
                  children: <FavoritesPanel onLoaded={() => setBottomTab("result")} />,
                },
              ]}
            />
          </div>
        </>
      )}

      <Modal
        title="收藏路线"
        open={favModalOpen}
        onOk={handleSaveFavorite}
        onCancel={() => setFavModalOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <div className="space-y-3 pt-2">
          <div>
            <Text type="secondary">名称</Text>
            <Input
              className="mt-1"
              value={favName}
              onChange={(e) => setFavName(e.target.value)}
              placeholder={defaultFavName}
              maxLength={50}
              showCount
              autoFocus
              onPressEnter={handleSaveFavorite}
            />
          </div>

          <div className="space-y-1.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <div>起点：{startName}</div>
            <div>终点：{endName}</div>
            <div>策略：{ROUTE_STRATEGY.label}</div>
            <div>
              路线：{distanceText}，途经 {route?.pathNodeIds.length ?? 0} 个节点
            </div>
          </div>

          <div className="text-xs text-slate-400">
            收藏仅保存在本机浏览器（localStorage），刷新页面后仍可见，且不会影响公共图数据。
          </div>
        </div>
      </Modal>
    </div>
  );
}
