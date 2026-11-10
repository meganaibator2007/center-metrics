package ru.fa.kpi.user;

/** Краткие сведения о человеке в списках и карточках. */
public record PersonShort(Long id, String fullName, String departmentName) {
}
