package ru.fa.kpi.achievement;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Одна и та же статья, записанная по-разному, должна давать один ключ (ТЗ 5.2). */
class IdentifierNormalizerTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "10.1000/ABC.1",
            "https://doi.org/10.1000/abc.1",
            "http://dx.doi.org/10.1000/ABC.1",
            "doi: 10.1000/abc.1",
            "  DOI:10.1000/ abc.1  "
    })
    void doiVariantsGiveOneKey(String raw) {
        assertThat(IdentifierNormalizer.identifier(IdentifierType.DOI, raw)).isEqualTo("10.1000/abc.1");
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "https://www.Journal.example/article/1/",
            "http://journal.example/article/1",
            "journal.example/article/1//"
    })
    void urlVariantsGiveOneKey(String raw) {
        assertThat(IdentifierNormalizer.identifier(IdentifierType.URL, raw)).isEqualTo("journal.example/article/1");
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {"№ 12-34/К", "12-34/к", " №12 -34/К "})
    void documentNumberIgnoresSignAndSpaces(String raw) {
        assertThat(IdentifierNormalizer.identifier(IdentifierType.DOC_NUMBER, raw)).isEqualTo("12-34/к");
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "Ёлка, и   ДЕРЕВО!",
            "елка и дерево",
            "  «Ёлка» — и дерево  "
    })
    void titleIgnoresCasePunctuationAndYo(String raw) {
        assertThat(IdentifierNormalizer.title(raw)).isEqualTo("елка и дерево");
    }
}
