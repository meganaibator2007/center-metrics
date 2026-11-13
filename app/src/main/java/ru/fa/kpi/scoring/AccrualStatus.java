package ru.fa.kpi.scoring;

/** ACTIVE входит в итог; SUPERSEDED заменено утверждённой новой редакцией; CANCELLED — отклонено при пересмотре. */
enum AccrualStatus {
    ACTIVE,
    SUPERSEDED,
    CANCELLED
}
