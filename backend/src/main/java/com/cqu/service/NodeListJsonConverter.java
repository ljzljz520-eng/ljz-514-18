package com.cqu.service;

import com.cqu.model.Node;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.List;

/**
 * 将路线节点快照（List<Node>）以 JSON 文本形式存入单列。
 * 快照与 nodes 表没有任何外键/级联关系，收藏数据不会影响公共图数据。
 */
@Converter
public class NodeListJsonConverter implements AttributeConverter<List<Node>, String> {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<Node> attribute) {
        try {
            return MAPPER.writeValueAsString(attribute == null ? List.of() : attribute);
        } catch (Exception e) {
            throw new IllegalArgumentException("收藏路线节点序列化失败", e);
        }
    }

    @Override
    public List<Node> convertToEntityAttribute(String dbData) {
        try {
            if (dbData == null || dbData.isBlank()) {
                return List.of();
            }
            return MAPPER.readValue(dbData, new TypeReference<List<Node>>() {
            });
        } catch (Exception e) {
            throw new IllegalArgumentException("收藏路线节点解析失败", e);
        }
    }
}
