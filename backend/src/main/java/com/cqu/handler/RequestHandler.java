package com.cqu.handler;

import com.cqu.model.FavoriteRoute;
import com.cqu.model.PathResult;
import com.cqu.service.FavoriteRepository;
import com.cqu.service.GraphService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class RequestHandler {
    private static final String FAVORITES_PREFIX = "/api/favorites";
    private static final int MAX_FAVORITE_NAME_LENGTH = 50;
    private static final int MAX_FAVORITE_NODES = 500;

    private final GraphService graphService;
    private final FavoriteRepository favoriteRepository;
    private final ObjectMapper mapper;

    public RequestHandler(GraphService graphService, FavoriteRepository favoriteRepository) {
        this.graphService = graphService;
        this.favoriteRepository = favoriteRepository;
        this.mapper = new ObjectMapper();
    }

    public void handleHealth(HttpExchange exchange) throws IOException {
        if (isPreflight(exchange)) {
            respondNoContent(exchange);
            return;
        }
        Map<String, Object> payload = new HashMap<>();
        payload.put("status", "ok");
        payload.put("time", Instant.now().toString());
        writeJson(exchange, 200, payload);
    }

    public void handleNodes(HttpExchange exchange) throws IOException {
        if (isPreflight(exchange)) {
            respondNoContent(exchange);
            return;
        }
        writeJson(exchange, 200, graphService.listNodes());
    }

    public void handlePath(HttpExchange exchange) throws IOException {
        if (isPreflight(exchange)) {
            respondNoContent(exchange);
            return;
        }
        try {
            Map<String, String> q = parseQuery(exchange.getRequestURI().getRawQuery());
            String from = q.get("from");
            String to = q.get("to");
            String strategy = q.get("strategy");
            if (from == null || to == null || from.isBlank() || to.isBlank()) {
                writeJson(exchange, 400, Map.of("error", "缺少必填参数：from、to"));
                return;
            }
            PathResult result = graphService.shortestPath(from, to, strategy);
            writeJson(exchange, 200, result);
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, Map.of("error", e.getMessage()));
        } catch (Exception e) {
            writeJson(exchange, 500, Map.of("error", "服务器内部错误"));
        }
    }

    /**
     * 路线收藏接口（数据存于独立的 favorite_routes 表，不影响公共图数据）：
     * - GET    /api/favorites      列表
     * - POST   /api/favorites      新建（名称、起点、终点、策略、路线节点快照）
     * - DELETE /api/favorites/{id} 删除
     */
    public void handleFavorites(HttpExchange exchange) throws IOException {
        if (isPreflight(exchange)) {
            respondNoContent(exchange);
            return;
        }
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();
        String rest = path.length() > FAVORITES_PREFIX.length() ? path.substring(FAVORITES_PREFIX.length()) : "";
        try {
            if (rest.isEmpty() || "/".equals(rest)) {
                if ("GET".equalsIgnoreCase(method)) {
                    writeJson(exchange, 200, favoriteRepository.findAll());
                    return;
                }
                if ("POST".equalsIgnoreCase(method)) {
                    handleCreateFavorite(exchange);
                    return;
                }
            } else if (rest.startsWith("/")) {
                String id = URLDecoder.decode(rest.substring(1), StandardCharsets.UTF_8).trim();
                if ("DELETE".equalsIgnoreCase(method)) {
                    handleDeleteFavorite(exchange, id);
                    return;
                }
            }
            writeJson(exchange, 405, Map.of("error", "不支持的请求"));
        } catch (IllegalArgumentException e) {
            writeJson(exchange, 400, Map.of("error", e.getMessage()));
        } catch (Exception e) {
            writeJson(exchange, 500, Map.of("error", "服务器内部错误"));
        }
    }

    private void handleCreateFavorite(HttpExchange exchange) throws IOException {
        FavoriteRoute input;
        try {
            input = mapper.readValue(exchange.getRequestBody(), FavoriteRoute.class);
        } catch (Exception e) {
            writeJson(exchange, 400, Map.of("error", "请求体不是合法的 JSON"));
            return;
        }
        FavoriteRoute favorite = sanitizeFavorite(input);
        favoriteRepository.save(favorite);
        writeJson(exchange, 201, favorite);
    }

    private void handleDeleteFavorite(HttpExchange exchange, String id) throws IOException {
        if (id.isEmpty()) {
            writeJson(exchange, 400, Map.of("error", "缺少收藏 ID"));
            return;
        }
        boolean removed = favoriteRepository.deleteById(id);
        if (!removed) {
            writeJson(exchange, 404, Map.of("error", "收藏不存在或已被删除"));
            return;
        }
        respondNoContent(exchange);
    }

    /** 校验并重建收藏实体：ID 与创建时间由服务端生成，不信任客户端提交值。 */
    private static FavoriteRoute sanitizeFavorite(FavoriteRoute input) {
        if (input == null) {
            throw new IllegalArgumentException("请求体不能为空");
        }
        String name = input.getName() == null ? "" : input.getName().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("收藏名称不能为空");
        }
        if (name.length() > MAX_FAVORITE_NAME_LENGTH) {
            name = name.substring(0, MAX_FAVORITE_NAME_LENGTH);
        }
        String startId = input.getStartId() == null ? "" : input.getStartId().trim();
        String endId = input.getEndId() == null ? "" : input.getEndId().trim();
        if (startId.isEmpty() || endId.isEmpty()) {
            throw new IllegalArgumentException("起点与终点不能为空");
        }
        List<String> pathNodeIds = input.getPathNodeIds() == null ? List.of() : input.getPathNodeIds();
        if (pathNodeIds.isEmpty()) {
            throw new IllegalArgumentException("路线节点不能为空");
        }
        if (pathNodeIds.size() > MAX_FAVORITE_NODES) {
            throw new IllegalArgumentException("路线节点数量超出上限");
        }

        FavoriteRoute favorite = new FavoriteRoute();
        favorite.setId(UUID.randomUUID().toString());
        favorite.setName(name);
        favorite.setStartId(startId);
        favorite.setStartName(trimToNull(input.getStartName()));
        favorite.setEndId(endId);
        favorite.setEndName(trimToNull(input.getEndName()));
        favorite.setStrategy(GraphService.normalizeStrategy(input.getStrategy()));
        favorite.setTotalDistanceMeters(sanitizeDistance(input.getTotalDistanceMeters()));
        favorite.setPathNodeIds(pathNodeIds);
        favorite.setPathNodes(input.getPathNodes() == null ? List.of() : input.getPathNodes());
        favorite.setSegmentDistanceMeters(input.getSegmentDistanceMeters() == null ? List.of() : input.getSegmentDistanceMeters());
        favorite.setCreatedAt(Instant.now().toString());
        return favorite;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static double sanitizeDistance(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value) || value < 0) {
            return 0.0;
        }
        return value;
    }

    private void writeJson(HttpExchange exchange, int status, Object payload) throws IOException {
        byte[] bytes = mapper.writeValueAsBytes(payload);
        Headers h = exchange.getResponseHeaders();
        applyCors(exchange);
        h.set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static Map<String, String> parseQuery(String rawQuery) {
        Map<String, String> map = new HashMap<>();
        if (rawQuery == null || rawQuery.isBlank()) {
            return map;
        }
        String[] pairs = rawQuery.split("&");
        for (String p : pairs) {
            int idx = p.indexOf('=');
            if (idx <= 0) {
                continue;
            }
            String k = URLDecoder.decode(p.substring(0, idx), StandardCharsets.UTF_8);
            String v = URLDecoder.decode(p.substring(idx + 1), StandardCharsets.UTF_8);
            map.put(k, v);
        }
        return map;
    }

    private static boolean isPreflight(HttpExchange exchange) {
        return "OPTIONS".equalsIgnoreCase(exchange.getRequestMethod());
    }

    private static void respondNoContent(HttpExchange exchange) throws IOException {
        applyCors(exchange);
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
    }

    private static void applyCors(HttpExchange exchange) {
        Headers h = exchange.getResponseHeaders();
        h.set("Access-Control-Allow-Origin", "*");
        h.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        h.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
        h.set("Access-Control-Max-Age", "86400");
    }
}
