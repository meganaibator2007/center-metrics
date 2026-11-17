package ru.fa.kpi.indicator;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import ru.fa.kpi.common.Category;

record IndicatorRequest(
        @NotBlank(message = "Укажите код")
        @Size(max = 20, message = "Не длиннее 20 символов")
        String code,

        @NotBlank(message = "Укажите наименование")
        @Size(max = 500, message = "Не длиннее 500 символов")
        String name,

        @NotNull(message = "Укажите категорию оценки")
        Category category,

        @NotNull(message = "Укажите тип оценки")
        EvaluationType evaluationType,

        @NotBlank(message = "Укажите единицу измерения")
        @Size(max = 30, message = "Не длиннее 30 символов")
        String unit,

        @Positive(message = "Больше нуля")
        @Digits(integer = 6, fraction = 4, message = "Не больше 6 цифр до запятой и 4 после")
        BigDecimal basePoints,

        AccrualMethod accrualMethod,

        AchievementType achievementType,

        @PositiveOrZero(message = "Не меньше нуля")
        @Digits(integer = 10, fraction = 4, message = "Не больше 10 цифр до запятой и 4 после")
        BigDecimal targetValue,

        Boolean percent,

        TargetDirection direction,

        @Positive(message = "Больше нуля")
        @Digits(integer = 6, fraction = 4, message = "Не больше 6 цифр до запятой и 4 после")
        BigDecimal coefficient,

        @Positive(message = "Больше нуля")
        @Digits(integer = 10, fraction = 2, message = "Не больше 10 цифр до запятой и 2 после")
        BigDecimal maxPoints,

        @Positive(message = "Больше нуля")
        Integer maxRepeats,

        Boolean requiresProgram,

        @Size(max = 1000, message = "Не длиннее 1000 символов")
        String evidence,

        @Size(max = 2000, message = "Не длиннее 2000 символов")
        String methodology,

        Boolean required,

        Boolean evidenceRequired,

        LocalDate validFrom) {
}
