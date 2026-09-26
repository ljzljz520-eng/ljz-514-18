import { Button, Empty, Popconfirm, Tag } from "antd";
import { Navigation, Trash2 } from "lucide-react";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useTravelStore } from "@/stores/useTravelStore";

function formatDistance(m: number): string {
  if (!Number.isFinite(m)) return "-";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FavoritesPanel({ onLoaded }: { onLoaded?: () => void }) {
  const favorites = useFavoritesStore((s) => s.favorites);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const applyFavorite = useTravelStore((s) => s.applyFavorite);

  if (favorites.length === 0) {
    return (
      <div className="py-6">
        <Empty
          description={
            <span className="text-sm text-slate-500">暂无收藏路线，规划出满意路线后点击“收藏路线”</span>
          }
        />
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {favorites.map((f) => {
        const routeText = `${f.startName || f.startId} → ${f.endName || f.endId}`;
        return (
          <div
            key={f.id}
            className="rounded-lg border border-slate-200 p-2.5 transition-colors hover:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="truncate text-sm font-medium text-slate-900" title={f.name}>
                {f.name}
              </div>
              <Tag color="blue" className="mr-0 shrink-0">
                {f.strategyLabel || f.strategy}
              </Tag>
            </div>

            <div className="mt-1 truncate text-xs text-slate-600" title={routeText}>
              {routeText}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {formatDistance(f.totalDistanceMeters)} · {f.pathNodeIds.length} 个节点 · {formatTime(f.createdAt)}
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <Button
                size="small"
                icon={<Navigation className="h-3.5 w-3.5" />}
                onClick={() => {
                  applyFavorite(f);
                  onLoaded?.();
                }}
              >
                加载
              </Button>
              <Popconfirm
                title="删除该收藏？"
                description={`确认删除「${f.name}」吗？删除后不可恢复。`}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => removeFavorite(f.id)}
              >
                <Button size="small" danger icon={<Trash2 className="h-3.5 w-3.5" />}>
                  删除
                </Button>
              </Popconfirm>
            </div>
          </div>
        );
      })}
    </div>
  );
}
