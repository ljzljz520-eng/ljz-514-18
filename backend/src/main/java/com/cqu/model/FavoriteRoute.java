package com.cqu.model;

import com.cqu.service.DoubleListJsonConverter;
import com.cqu.service.NodeListJsonConverter;
import com.cqu.service.StringListJsonConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.List;

/**
 * 用户收藏的路线快照。
 *
 * 注意：该实体映射到独立的 favorite_routes 表，与公共图数据（nodes / edges）
 * 完全隔离，收藏记录的新增、删除不会影响任何共享图数据。
 */
@Entity
@Table(name = "favorite_routes")
public class FavoriteRoute {
    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "start_id", nullable = false, length = 64)
    private String startId;

    @Column(name = "start_name", length = 256)
    private String startName;

    @Column(name = "end_id", nullable = false, length = 64)
    private String endId;

    @Column(name = "end_name", length = 256)
    private String endName;

    @Column(name = "strategy", nullable = false, length = 32)
    private String strategy;

    @Column(name = "total_distance_meters", nullable = false)
    private double totalDistanceMeters;

    /** 路线节点 ID 序列（JSON 文本快照） */
    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "path_node_ids", length = 4096)
    private List<String> pathNodeIds;

    /** 路线节点完整快照（JSON 文本），与 nodes 表无关联，避免影响公共图数据 */
    @Convert(converter = NodeListJsonConverter.class)
    @Column(name = "path_nodes", length = 8192)
    private List<Node> pathNodes;

    /** 相邻节点分段距离（米，JSON 文本快照） */
    @Convert(converter = DoubleListJsonConverter.class)
    @Column(name = "segment_distance_meters", length = 4096)
    private List<Double> segmentDistanceMeters;

    /** ISO-8601 时间串，按字典序即可按时间排序 */
    @Column(name = "created_at", nullable = false, length = 40)
    private String createdAt;

    public FavoriteRoute() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStartId() {
        return startId;
    }

    public void setStartId(String startId) {
        this.startId = startId;
    }

    public String getStartName() {
        return startName;
    }

    public void setStartName(String startName) {
        this.startName = startName;
    }

    public String getEndId() {
        return endId;
    }

    public void setEndId(String endId) {
        this.endId = endId;
    }

    public String getEndName() {
        return endName;
    }

    public void setEndName(String endName) {
        this.endName = endName;
    }

    public String getStrategy() {
        return strategy;
    }

    public void setStrategy(String strategy) {
        this.strategy = strategy;
    }

    public double getTotalDistanceMeters() {
        return totalDistanceMeters;
    }

    public void setTotalDistanceMeters(double totalDistanceMeters) {
        this.totalDistanceMeters = totalDistanceMeters;
    }

    public List<String> getPathNodeIds() {
        return pathNodeIds;
    }

    public void setPathNodeIds(List<String> pathNodeIds) {
        this.pathNodeIds = pathNodeIds;
    }

    public List<Node> getPathNodes() {
        return pathNodes;
    }

    public void setPathNodes(List<Node> pathNodes) {
        this.pathNodes = pathNodes;
    }

    public List<Double> getSegmentDistanceMeters() {
        return segmentDistanceMeters;
    }

    public void setSegmentDistanceMeters(List<Double> segmentDistanceMeters) {
        this.segmentDistanceMeters = segmentDistanceMeters;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}
