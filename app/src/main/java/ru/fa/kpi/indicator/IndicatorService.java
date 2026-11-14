package ru.fa.kpi.indicator;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fa.kpi.common.Category;
import ru.fa.kpi.common.ConflictException;
import ru.fa.kpi.common.FieldValidationException;
import ru.fa.kpi.common.NotFoundException;

/**
 * Справочник показателей. Правка показателя создаёт новую редакцию, а прежняя закрывается датой,
 * поэтому утверждённые результаты остаются на своей редакции. К отчётному периоду относится
 * редакция, действующая на дату его начала.
 */
@Service
@RequiredArgsConstructor
public class IndicatorService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final IndicatorRepository indicators;
    private final IndicatorVersionRepository versions;

    @Transactional(readOnly = true)
    public List<IndicatorDto> list(Category category, EvaluationType evaluationType, Boolean archived) {
        return indicators.findAllByOrderByCode().stream()
                .filter(indicator -> category == null || indicator.getCategory() == category)
                .filter(indicator -> archived == null || indicator.isArchived() == archived)
                .map(indicator -> IndicatorMapper.toDto(indicator, indicator.currentVersion()))
                .filter(dto -> evaluationType == null || dto.evaluationType() == evaluationType)
                .toList();
    }

    @Transactional(readOnly = true)
    public IndicatorDto get(Long id) {
        Indicator indicator = find(id);
        return IndicatorMapper.toDto(indicator, indicator.currentVersion());
    }

    @Transactional(readOnly = true)
    public List<IndicatorVersionDto> versions(Long id) {
        return find(id).getVersions().stream().map(IndicatorMapper::toDto).toList();
    }

    @Transactional
    public IndicatorDto create(IndicatorRequest request, Long actorId) {
        validate(request);
        String code = request.code().trim();
        if (indicators.existsByCode(code)) {
            throw new ConflictException("Код показателя уже занят: " + code);
        }
        Indicator indicator = new Indicator();
        indicator.setCode(code);
        indicator.setCategory(request.category());
        IndicatorVersion version = newVersion(indicator, request, 1, startOf(request), actorId);
        indicators.save(indicator);
        return IndicatorMapper.toDto(indicator, version);
    }

    @Transactional
    public IndicatorDto update(Long id, IndicatorRequest request, Long actorId) {
        Indicator indicator = find(id);
        validate(request);
        String code = request.code().trim();
        if (indicators.existsByCodeAndIdNot(code, id)) {
            throw new ConflictException("Код показателя уже занят: " + code);
        }
        IndicatorVersion previous = indicator.latestVersion();
        LocalDate from = startOf(request);
        if (!from.isAfter(previous.getValidFrom())) {
            throw new ConflictException("Редакции пересекаются по датам: новая должна начинаться позже "
                    + previous.getValidFrom().format(DATE) + ". Укажите дату начала в поле validFrom");
        }
        indicator.setCode(code);
        indicator.setCategory(request.category());
        previous.setValidTo(from.minusDays(1));
        // Даты редакций не пересекаются (ограничение EXCLUDE): прежняя закрывается в базе раньше вставки новой
        versions.flush();
        newVersion(indicator, request, previous.getVersionNo() + 1, from, actorId);
        versions.flush();
        return IndicatorMapper.toDto(indicator, indicator.currentVersion());
    }

    @Transactional
    public IndicatorDto toggleArchive(Long id) {
        Indicator indicator = find(id);
        indicator.setArchived(!indicator.isArchived());
        indicator.setArchivedAt(indicator.isArchived() ? Instant.now() : null);
        return IndicatorMapper.toDto(indicator, indicator.currentVersion());
    }

    /** Правило редакции, действующей на дату. Нет такой редакции — 409. */
    @Transactional(readOnly = true)
    public IndicatorRule ruleOn(Long indicatorId, LocalDate date) {
        Indicator indicator = find(indicatorId);
        return indicator.versionOn(date)
                .map(IndicatorMapper::toRule)
                .orElseThrow(() -> new ConflictException("У показателя " + indicator.getCode()
                        + " нет редакции, действующей на " + date.format(DATE)));
    }

    /** Правило действующей сегодня редакции, а если такой нет — последней. */
    @Transactional(readOnly = true)
    public IndicatorRule currentRule(Long indicatorId) {
        return IndicatorMapper.toRule(find(indicatorId).currentVersion());
    }

    @Transactional(readOnly = true)
    public IndicatorRule rule(Long versionId) {
        return versions.findById(versionId)
                .map(IndicatorMapper::toRule)
                .orElseThrow(() -> new NotFoundException("Редакция показателя " + versionId + " не найдена"));
    }

    @Transactional(readOnly = true)
    public Map<Long, IndicatorRule> rules(Collection<Long> versionIds) {
        return versions.findAllById(versionIds).stream()
                .map(IndicatorMapper::toRule)
                .collect(Collectors.toMap(IndicatorRule::versionId, Function.identity()));
    }

    /** Балльные показатели с редакцией на дату, включая архивные: по ним могут быть старые результаты. */
    @Transactional(readOnly = true)
    public List<IndicatorRule> pointRulesOn(LocalDate date) {
        return indicators.findAllByOrderByCode().stream()
                .flatMap(indicator -> indicator.versionOn(date).stream())
                .map(IndicatorMapper::toRule)
                .filter(IndicatorRule::isPoints)
                .toList();
    }

    private Indicator find(Long id) {
        return indicators.findById(id).orElseThrow(() -> new NotFoundException("Показатель " + id + " не найден"));
    }

    private static LocalDate startOf(IndicatorRequest request) {
        return request.validFrom() == null ? LocalDate.now() : request.validFrom();
    }

    private static IndicatorVersion newVersion(Indicator indicator, IndicatorRequest request, int number,
                                               LocalDate from, Long actorId) {
        IndicatorVersion version = new IndicatorVersion();
        version.setIndicator(indicator);
        version.setVersionNo(number);
        version.setValidFrom(from);
        version.setCreatedBy(actorId);
        IndicatorMapper.apply(version, request);
        indicator.getVersions().add(version);
        return version;
    }

    /** Балльный показатель и целевой — самостоятельные типы оценки (ТЗ 1.3, п. 5). */
    private static void validate(IndicatorRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        boolean target = request.evaluationType() == EvaluationType.TARGET;
        if ((request.category() == Category.ROP) != target) {
            errors.put("evaluationType", "У РОП — целевые показатели, у ППС и АУП — балльные");
        }
        if (target) {
            if (request.targetValue() == null) {
                errors.put("targetValue", "Укажите целевое значение");
            }
        } else {
            if (request.basePoints() == null) {
                errors.put("basePoints", "Укажите базовый балл");
            }
            if (request.accrualMethod() == null) {
                errors.put("accrualMethod", "Укажите порядок начисления");
            }
            if (request.achievementType() == null) {
                errors.put("achievementType", "Укажите вид достижения: по нему ищутся дубли");
            }
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }
    }
}
