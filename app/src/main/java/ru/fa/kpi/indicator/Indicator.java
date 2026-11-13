package ru.fa.kpi.indicator;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import ru.fa.kpi.common.Category;

/** Показатель: постоянный код и категория. Всё, что влияет на расчёт, лежит в редакциях. */
@Entity
@Table(name = "ind_indicator")
@Getter
@Setter
class Indicator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;

    @Enumerated(EnumType.STRING)
    private Category category;

    private boolean archived;

    private Instant archivedAt;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @OneToMany(mappedBy = "indicator", cascade = CascadeType.ALL)
    @OrderBy("versionNo")
    private List<IndicatorVersion> versions = new ArrayList<>();

    /** Редакция, действующая на дату. */
    Optional<IndicatorVersion> versionOn(LocalDate date) {
        return versions.stream().filter(version -> version.covers(date)).findFirst();
    }

    IndicatorVersion latestVersion() {
        return versions.getLast();
    }

    /** Действующая сегодня, а если сегодня ни одна не действует — последняя. */
    IndicatorVersion currentVersion() {
        return versionOn(LocalDate.now()).orElseGet(this::latestVersion);
    }
}
