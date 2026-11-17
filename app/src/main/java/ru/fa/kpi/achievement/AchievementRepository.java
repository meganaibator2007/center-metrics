package ru.fa.kpi.achievement;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import ru.fa.kpi.indicator.AchievementType;

interface AchievementRepository extends JpaRepository<Achievement, Long> {

    /** С блокировкой строки: два одновременных решения по одному достижению выполнятся по очереди. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Achievement a where a.id = :id")
    Optional<Achievement> findForUpdate(Long id);

    List<Achievement> findByStatusIn(Collection<ResultStatus> statuses);

    /** Где человек заявитель, соавтор или тот, кто внёс достижение за другого. */
    @Query("""
            select distinct a from Achievement a left join a.participants p
            where a.ownerId = :userId or a.enteredBy = :userId or p.userId = :userId
            """)
    List<Achievement> findInvolving(Long userId);

    List<Achievement> findByAchievementTypeAndIdentifierTypeAndIdentifierNormAndStatusNot(
            AchievementType achievementType, IdentifierType identifierType, String identifierNorm, ResultStatus status);

    List<Achievement> findByIdentifierTypeAndIdentifierNormAndStatusNot(
            IdentifierType identifierType, String identifierNorm, ResultStatus status);

    List<Achievement> findByTitleNormAndStatusNot(String titleNorm, ResultStatus status);

    List<Achievement> findByIndicatorIdAndEventDateAndStatusNot(Long indicatorId, LocalDate eventDate, ResultStatus status);

    long countByOwnerIdAndIndicatorIdAndPeriodIdAndStatusInAndIdNot(
            Long ownerId, Long indicatorId, Long periodId, Collection<ResultStatus> statuses, Long id);
}
