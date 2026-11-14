package ru.fa.kpi.achievement;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.Test;

/** Доли по ТЗ 6.1: Bᵢ = B × c × wᵢ / Σw, копейки — методом наибольших остатков. */
class ShareCalculatorTest {

    private static List<BigDecimal> points(List<ShareCalculator.Share> shares) {
        return shares.stream().map(ShareCalculator.Share::points).toList();
    }

    private static List<BigDecimal> weights(String... values) {
        return Arrays.stream(values).map(BigDecimal::new).toList();
    }

    private static BigDecimal sum(List<BigDecimal> values) {
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Test
    void equalWeightsSplitEvenly() {
        List<ShareCalculator.Share> shares =
                ShareCalculator.split(new BigDecimal("20"), BigDecimal.ONE, Collections.nCopies(4, BigDecimal.ONE));

        assertThat(points(shares)).containsExactly(
                new BigDecimal("5.00"), new BigDecimal("5.00"), new BigDecimal("5.00"), new BigDecimal("5.00"));
        assertThat(shares.getFirst().share()).isEqualByComparingTo("0.25");
    }

    @Test
    void leftoverCentGoesToEarlierAuthorAndTotalIsKept() {
        List<ShareCalculator.Share> shares =
                ShareCalculator.split(new BigDecimal("20"), BigDecimal.ONE, Collections.nCopies(3, BigDecimal.ONE));

        assertThat(points(shares)).containsExactly(
                new BigDecimal("6.67"), new BigDecimal("6.67"), new BigDecimal("6.66"));
        assertThat(sum(points(shares))).isEqualByComparingTo("20.00");
        assertThat(shares.getFirst().pointsExact()).isEqualByComparingTo("6.666667");
    }

    @Test
    void weightsChangeProportions() {
        List<ShareCalculator.Share> shares = ShareCalculator.split(new BigDecimal("20"), BigDecimal.ONE, weights("1", "1", "2"));

        assertThat(points(shares)).containsExactly(new BigDecimal("5.00"), new BigDecimal("5.00"), new BigDecimal("10.00"));
        assertThat(shares.get(2).share()).isEqualByComparingTo("0.5");
    }

    @Test
    void coefficientMultipliesBase() {
        List<ShareCalculator.Share> shares =
                ShareCalculator.split(new BigDecimal("10"), new BigDecimal("1.5"), List.of(BigDecimal.ONE));

        assertThat(points(shares)).containsExactly(new BigDecimal("15.00"));
        assertThat(shares.getFirst().share()).isEqualByComparingTo("1");
    }

    @Test
    void largestRemainderWinsOverListOrder() {
        // 3.3333 и 1.6667: лишняя копейка второму — у него дробный остаток больше, хотя он позже в списке
        List<ShareCalculator.Share> shares = ShareCalculator.split(new BigDecimal("10"), BigDecimal.ONE, weights("2", "1", "3"));

        assertThat(points(shares)).containsExactly(new BigDecimal("3.33"), new BigDecimal("1.67"), new BigDecimal("5.00"));
        assertThat(sum(points(shares))).isEqualByComparingTo("10.00");
    }

    @Test
    void sumIsTotalRoundedDownToCents() {
        // 7.77 × 1.3 = 10.101: делится 10.10, лишняя доля копейки никому не начисляется
        for (int authors = 1; authors <= 12; authors++) {
            List<BigDecimal> shares = points(ShareCalculator.split(
                    new BigDecimal("7.77"), new BigDecimal("1.3"), Collections.nCopies(authors, BigDecimal.ONE)));
            assertThat(sum(shares)).isEqualByComparingTo("10.10");
        }
    }
}
