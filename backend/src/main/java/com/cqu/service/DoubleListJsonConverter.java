package com.cqu.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.List;

/** 将 List<Double> 以 JSON 文本形式存入单列。 */
@Converter
public class DoubleListJsonConverter implements AttributeConverter<List<Double>, String> {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<Double> attribute) {
        try {
            return MAPPER.writeValueAsString(attribute == null ? List.of() : attribute);
        } catch (Exception e) {
            throw new IllegalArgumentException("收藏路线数据序列化失败", e);
        }
    }

    @Override
    public List<Double> convertToEntityAttribute(String dbData) {
        try {
            if (dbData == null || dbData.isBlank()) {
                return List.of();
            }
            return MAPPER.readValue(dbData, new TypeReference<List<Double>>() {
            });
        } catch (Exception e) {
            throw new IllegalArgumentException("收藏路线数据解析失败", e);
        }
    }
}
