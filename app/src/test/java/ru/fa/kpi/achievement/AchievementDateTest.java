package ru.fa.kpi.achievement;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import ru.fa.kpi.common.FieldValidationException;
import ru.fa.kpi.period.PeriodDto;
import ru.fa.kpi.period.PeriodType;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AchievementDateTest {
    @Test
    void acceptsInclusiveBoundariesAndRejectsDatesOutsidePeriod() {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2027, 1, 31);
        PeriodDto period = new PeriodDto(1L, "Semester", PeriodType.SEMESTER, start, end, false, null);
        assertThatCode(() -> AchievementService.validateEventDate(start, period)).doesNotThrowAnyException();
        assertThatCode(() -> AchievementService.validateEventDate(end, period)).doesNotThrowAnyException();
        assertThatThrownBy(() -> AchievementService.validateEventDate(start.minusDays(1), period))
                .isInstanceOf(FieldValidationException.class);
        assertThatThrownBy(() -> AchievementService.validateEventDate(end.plusDays(1), period))
                .isInstanceOf(FieldValidationException.class);
    }
}
