package ru.fa.kpi.user;

import java.time.LocalDate;

record EmploymentRecordDto(String departmentName, String position, LocalDate validFrom, LocalDate validTo) {
}
