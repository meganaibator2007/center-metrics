package ru.fa.kpi.achievement;

import java.time.Instant;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** Подтверждающий документ: ссылка или файл. Снятый документ не удаляется, а архивируется. */
@Entity
@Table(name = "ach_evidence")
@Getter
@Setter
class Evidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "achievement_id")
    private Achievement achievement;

    private String docType;

    private String requisites;

    private String originalName;

    private String contentType;

    private Long sizeBytes;

    private String storageKey;

    private String checksumSha256;

    private String url;

    private int versionNo = 1;

    private Long previousId;

    @Enumerated(EnumType.STRING)
    private ScanStatus scanStatus = ScanStatus.NOT_SCANNED;

    private Instant archivedAt;

    private Long uploadedBy;

    @CreationTimestamp
    private Instant uploadedAt;

    boolean isActive() {
        return archivedAt == null;
    }
}
