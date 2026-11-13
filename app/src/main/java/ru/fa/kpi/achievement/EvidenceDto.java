package ru.fa.kpi.achievement;

import java.time.Instant;

public record EvidenceDto(
        Long id,
        String docType,
        String requisites,
        String fileName,
        Long size,
        String url,
        int version,
        Instant uploadedAt,
        String uploadedBy) {
}
