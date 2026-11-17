package ru.fa.kpi.achievement;

import static ru.fa.kpi.achievement.AchievementService.trimToNull;

import java.time.Instant;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fa.kpi.common.ConflictException;
import ru.fa.kpi.common.ForbiddenException;
import ru.fa.kpi.common.NotFoundException;
import ru.fa.kpi.user.UserService;

/**
 * Подтверждающие документы (ФР-04). Пока поддерживаются ссылки: загрузка файлов с контрольной суммой
 * и версиями — следующий шаг. Снятый документ архивируется, а не удаляется.
 */
@Service
@RequiredArgsConstructor
class EvidenceService {

    private final AchievementRepository achievements;
    private final AchievementAccess access;
    private final AchievementAssembler assembler;
    private final UserService users;

    @Transactional
    EvidenceDto addLink(Long achievementId, EvidenceLinkRequest request, Long actorId) {
        Achievement achievement = editable(achievementId, actorId);
        Evidence evidence = new Evidence();
        evidence.setAchievement(achievement);
        evidence.setDocType(request.docType().trim());
        evidence.setRequisites(trimToNull(request.requisites()));
        evidence.setUrl(request.url().trim());
        evidence.setUploadedBy(actorId);
        achievement.getEvidence().add(evidence);
        achievements.flush();
        return assembler.toDto(evidence);
    }

    @Transactional
    void remove(Long achievementId, Long evidenceId, Long actorId) {
        Achievement achievement = editable(achievementId, actorId);
        active(achievement, evidenceId).setArchivedAt(Instant.now());
    }

    /** Файлов пока нет: у ссылки скачивать нечего. Права проверяются раньше, чем ищется файл. */
    @Transactional(readOnly = true)
    void requireFile(Long achievementId, Long evidenceId, Long actorId) {
        Achievement achievement = achievements.findById(achievementId)
                .orElseThrow(() -> new NotFoundException("Достижение " + achievementId + " не найдено"));
        if (!access.canView(access.viewer(actorId), achievement, users.getById(achievement.getOwnerId()))) {
            throw new ForbiddenException("Нет доступа к этому достижению");
        }
        Evidence evidence = active(achievement, evidenceId);
        if (evidence.getStorageKey() == null) {
            throw new NotFoundException("У этого подтверждения нет файла: это ссылка");
        }
        throw new NotFoundException("Файл подтверждения не найден в хранилище");
    }

    private Achievement editable(Long achievementId, Long actorId) {
        Achievement achievement = achievements.findForUpdate(achievementId)
                .orElseThrow(() -> new NotFoundException("Достижение " + achievementId + " не найдено"));
        if (!achievement.isAuthor(actorId)) {
            throw new ForbiddenException("Документы меняет заявитель или тот, кто внёс достижение за него");
        }
        if (!achievement.isEditable()) {
            throw new ConflictException("Документы меняются только в черновике, после возврата или на пересмотре");
        }
        return achievement;
    }

    private static Evidence active(Achievement achievement, Long evidenceId) {
        return achievement.activeEvidence().stream()
                .filter(evidence -> evidence.getId().equals(evidenceId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Подтверждение " + evidenceId + " не найдено"));
    }
}
