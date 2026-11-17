package ru.fa.kpi.achievement;

import java.util.Set;

import ru.fa.kpi.user.Role;
import ru.fa.kpi.user.UserDto;

/** Тот, кто выполняет запрос, с его ролями и областью проверки. */
record Viewer(UserDto user) {

    Long id() {
        return user.id();
    }

    boolean has(Role role) {
        return user.roles().contains(role);
    }

    /** РОП, чья область проверки пересекается с областью достижения. */
    boolean reviews(Set<Long> area) {
        return has(Role.REVIEWER) && user.reviewProgramIds().stream().anyMatch(area::contains);
    }
}
