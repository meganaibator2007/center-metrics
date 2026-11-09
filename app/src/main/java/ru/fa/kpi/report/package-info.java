/**
 * Чтение итогов: личные показатели, дашборд директора и выгрузки XLSX.
 * Своих таблиц нет, диапазон миграций V600–V699 оставлен для шаблонов отчётов второго этапа.
 */
@ApplicationModule(allowedDependencies = {"common", "user", "indicator", "period", "achievement", "measurement", "scoring"})
package ru.fa.kpi.report;

import org.springframework.modulith.ApplicationModule;
