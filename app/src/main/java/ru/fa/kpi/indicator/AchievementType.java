package ru.fa.kpi.indicator;

/**
 * Вид достижения. Задаётся в редакции показателя и входит в строгий ключ дублей:
 * вид плюс DOI или номер документа.
 */
public enum AchievementType {
    PUBLICATION,
    UMK_DOCUMENT,
    EVENT,
    CONTRACT,
    CONFERENCE,
    OTHER
}
