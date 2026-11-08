/**
 * Пользователи, роли, вход и выход, смена пароля. Кафедра хранится строкой у пользователя.
 * Таблицы с префиксом usr_, миграции V100–V199.
 */
@ApplicationModule(allowedDependencies = "common")
package ru.fa.kpi.user;

import org.springframework.modulith.ApplicationModule;
