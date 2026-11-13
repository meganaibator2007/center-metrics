package ru.fa.kpi.achievement;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.IntStream;

/**
 * Делит балл B × c между авторами пропорционально весам (ТЗ 6.1): Bᵢ = B × c × wᵢ / Σw.
 * Внешние авторы участвуют в делении, их доли никому не перераспределяются.
 * <p>
 * Официальные баллы — с двумя знаками. Копейки распределяются методом наибольших остатков:
 * сначала каждому округление вниз, оставшиеся копейки — тем, у кого больше дробный остаток.
 * При равных остатках копейка достаётся тому, кто раньше в списке. Сумма никогда не больше B × c.
 */
final class ShareCalculator {

    private static final int EXACT_SCALE = 6;
    private static final int WORK_SCALE = 12;

    record Share(BigDecimal share, BigDecimal pointsExact, BigDecimal points) {
    }

    private ShareCalculator() {
    }

    static List<Share> split(BigDecimal basePoints, BigDecimal coefficient, List<BigDecimal> weights) {
        BigDecimal total = basePoints.multiply(coefficient);
        BigDecimal weightSum = weights.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        int count = weights.size();

        List<BigDecimal> exact = new ArrayList<>(count);
        long[] cents = new long[count];
        BigDecimal[] remainders = new BigDecimal[count];
        for (int i = 0; i < count; i++) {
            BigDecimal value = total.multiply(weights.get(i)).divide(weightSum, WORK_SCALE, RoundingMode.HALF_UP);
            BigDecimal inCents = value.movePointRight(2);
            exact.add(value);
            cents[i] = inCents.setScale(0, RoundingMode.FLOOR).longValueExact();
            remainders[i] = inCents.subtract(BigDecimal.valueOf(cents[i]));
        }

        long target = total.movePointRight(2).setScale(0, RoundingMode.FLOOR).longValueExact();
        long rest = target - IntStream.range(0, count).mapToLong(i -> cents[i]).sum();
        List<Integer> order = IntStream.range(0, count).boxed()
                .sorted(Comparator.comparing((Integer i) -> remainders[i]).reversed().thenComparing(i -> i))
                .toList();
        for (int k = 0; k < Math.min(rest, count); k++) {
            cents[order.get(k)]++;
        }

        List<Share> shares = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            shares.add(new Share(
                    weights.get(i).divide(weightSum, EXACT_SCALE, RoundingMode.HALF_UP),
                    exact.get(i).setScale(EXACT_SCALE, RoundingMode.HALF_UP),
                    BigDecimal.valueOf(cents[i], 2)));
        }
        return shares;
    }
}
