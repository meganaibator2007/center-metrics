package ru.fa.kpi;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

/**
 * Проверяет границы пакетов: нет циклов, пакеты обращаются друг к другу только
 * через публичные классы и только в рамках allowedDependencies из package-info.java.
 */
class ModularityTest {

    @Test
    void packagesRespectDependencyRules() {
        ApplicationModules.of(KpiApplication.class).verify();
    }
}
