/**
 * Журнал аудита: записывает событие AuditRecorded из common и отдаёт журнал администратору.
 * Таблицы с префиксом aud_, миграции V800–V899.
 */
@ApplicationModule(allowedDependencies = {"common"})
package ru.fa.kpi.audit;

import org.springframework.modulith.ApplicationModule;
