package ru.fa.kpi.achievement;

/** Вид идентификатора. Строгий ключ дублей — только DOI и номер документа, ссылка им не считается. */
public enum IdentifierType {
    DOI,
    URL,
    DOC_NUMBER;

    boolean isStrictKey() {
        return this != URL;
    }
}
