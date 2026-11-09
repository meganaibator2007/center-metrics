/**
 * Сотрудники и учётные записи, вход и выход, смена пароля, роли с областью и датами действия,
 * категории оценки, полномочия, подразделения, образовательные программы, история переводов.
 * Таблицы с префиксом usr_, миграции V100–V199.
 */
@ApplicationModule(allowedDependencies = {"common"})
package ru.fa.kpi.user;

import org.springframework.modulith.ApplicationModule;
