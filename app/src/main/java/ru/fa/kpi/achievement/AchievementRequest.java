package ru.fa.kpi.achievement;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

record AchievementRequest(
        @NotNull(message = "Выберите показатель")
        Long indicatorId,

        @NotNull(message = "Выберите отчётный период")
        Long periodId,

        @NotBlank(message = "Укажите наименование")
        @Size(max = 500, message = "Не длиннее 500 символов")
        String title,

        @NotNull(message = "Укажите дату события")
        LocalDate eventDate,

        IdentifierType identifierType,

        @Size(max = 500, message = "Не длиннее 500 символов")
        String identifier,

        Long programId,

        @Size(max = 255, message = "Не длиннее 255 символов")
        String discipline,

        @Size(max = 2000, message = "Не длиннее 2000 символов")
        String description,

        @Positive(message = "Больше нуля")
        @Digits(integer = 10, fraction = 2, message = "Не больше 10 цифр до запятой и 2 после")
        BigDecimal quantity,

        @NotNull(message = "Передайте список соавторов, можно пустой")
        @Size(max = 100, message = "Не больше 100 соавторов")
        List<@Valid ParticipantRequest> coauthors,

        Long ownerId,

        @Size(max = 1000, message = "Не длиннее 1000 символов")
        String basis) {
}
