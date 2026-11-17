package ru.fa.kpi.period;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fa.kpi.common.ConflictException;
import ru.fa.kpi.common.FieldValidationException;
import ru.fa.kpi.common.NotFoundException;

@Service
@RequiredArgsConstructor
@Slf4j
public class PeriodService {

    private final PeriodRepository periods;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public List<PeriodDto> list() {
        return periods.findAllByOrderByStartDateDescIdDesc().stream().map(PeriodService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public PeriodDto get(Long id) {
        return toDto(find(id));
    }

    @Transactional(readOnly = true)
    public Map<Long, PeriodDto> byIds(Collection<Long> ids) {
        return periods.findAllById(ids).stream()
                .map(PeriodService::toDto)
                .collect(Collectors.toMap(PeriodDto::id, Function.identity()));
    }

    /**
     * Открытый период, в который попадает сегодняшняя дата; из нескольких — самый длинный.
     * Если таких нет — открытый с самой поздней датой окончания.
     */
    @Transactional(readOnly = true)
    public PeriodDto current() {
        LocalDate today = LocalDate.now();
        List<Period> open = periods.findByStatus(PeriodStatus.OPEN);
        return open.stream()
                .filter(period -> period.contains(today))
                .max(Comparator.comparingLong(Period::lengthInDays).thenComparing(Period::getStartDate))
                .or(() -> open.stream().max(Comparator.comparing(Period::getEndDate)))
                .map(PeriodService::toDto)
                .orElseThrow(() -> new NotFoundException("Открытых периодов нет"));
    }

    @Transactional
    public PeriodDto create(PeriodRequest request) {
        if (request.endDate().isBefore(request.startDate())) {
            throw new FieldValidationException("endDate", "Окончание раньше начала");
        }
        if (request.type() != PeriodType.CUSTOM && periods.existsByTypeAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                request.type(), request.endDate(), request.startDate())) {
            throw new ConflictException("Период этого типа пересекается с уже созданным");
        }
        Period period = new Period();
        period.setName(request.name().trim());
        period.setType(request.type());
        period.setStartDate(request.startDate());
        period.setEndDate(request.endDate());
        return toDto(periods.save(period));
    }

    /** Закрытие фиксирует снимок официальных итогов: его делает scoring по событию PeriodClosed. */
    @Transactional
    public PeriodDto close(Long id, Long actorId) {
        Period period = find(id);
        if (period.isClosed()) {
            throw new ConflictException("Период уже закрыт");
        }
        period.setStatus(PeriodStatus.CLOSED);
        period.setClosedAt(Instant.now());
        period.setClosedBy(actorId);
        events.publishEvent(new PeriodClosed(id, actorId));
        return toDto(period);
    }

    /** Санкционированное переоткрытие (ТЗ 4.3). Пока нет журнала аудита, основание пишется в лог. */
    @Transactional
    public PeriodDto reopen(Long id, Long actorId, String reason) {
        Period period = find(id);
        if (!period.isClosed()) {
            throw new ConflictException("Период не закрыт");
        }
        period.setStatus(PeriodStatus.OPEN);
        period.setClosedAt(null);
        period.setClosedBy(null);
        log.info("Период {} переоткрыт пользователем {}: {}", id, actorId, reason);
        return toDto(period);
    }

    private Period find(Long id) {
        return periods.findById(id).orElseThrow(() -> new NotFoundException("Период " + id + " не найден"));
    }

    private static PeriodDto toDto(Period period) {
        return new PeriodDto(period.getId(), period.getName(), period.getType(), period.getStartDate(),
                period.getEndDate(), period.isClosed(), period.getClosedAt());
    }
}
