package ru.fa.kpi.user;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fa.kpi.common.ConflictException;
import ru.fa.kpi.common.FieldValidationException;
import ru.fa.kpi.common.NotFoundException;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final String LOGIN_TAKEN = "Логин уже занят";
    private static final String EXTERNAL_ID_TAKEN = "Внешний идентификатор уже занят";

    private final UserRepository users;
    private final RoleAssignmentRepository roleAssignments;
    private final EmploymentRecordRepository employment;
    private final DepartmentRepository departments;
    private final ProgramRepository programs;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserDto getById(Long id) {
        return UserMapper.toDto(find(id));
    }

    @Transactional(readOnly = true)
    public Page<UserDto> search(UserFilter filter, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("lastName", "firstName", "id"));
        return users.findAll(filter.toSpecification(), pageable).map(UserMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Map<Long, UserDto> getByIds(Collection<Long> ids) {
        return users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, UserMapper::toDto));
    }

    /** Краткие сведения о людях: для карточек и списков других модулей. */
    @Transactional(readOnly = true)
    public Map<Long, PersonShort> people(Collection<Long> ids) {
        return users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, UserMapper::toShort));
    }

    /** Какие из переданных сотрудников существуют и активны. */
    @Transactional(readOnly = true)
    public Set<Long> activeIds(Collection<Long> ids) {
        return users.findAllById(ids).stream().filter(User::isActive).map(User::getId).collect(Collectors.toSet());
    }

    /** Действующие РОП, которые проверяют хотя бы одну из программ. */
    @Transactional(readOnly = true)
    public Set<Long> reviewersOf(Collection<Long> programIds) {
        if (programIds.isEmpty()) {
            return Set.of();
        }
        return Set.copyOf(roleAssignments.findActiveUserIds(Role.REVIEWER, programIds));
    }

    /** Активные сотрудники: для выбора соавторов. */
    @Transactional(readOnly = true)
    public List<PersonShort> listEmployees() {
        return users.findActiveWithRole(Role.EMPLOYEE).stream().map(UserMapper::toShort).toList();
    }

    @Transactional(readOnly = true)
    public List<EmploymentRecordDto> history(Long id) {
        find(id);
        return employment.findByUserIdOrderByValidFromDescIdDesc(id).stream().map(UserMapper::toDto).toList();
    }

    @Transactional
    public UserDto create(UserRequest request, Long actorId) {
        validate(request, null);
        requireStrong("password", request.password(), request.login());
        String externalId = UserMapper.blankToNull(request.externalId());
        if (users.existsByLogin(request.login())) {
            throw new ConflictException(LOGIN_TAKEN);
        }
        if (externalId != null && users.existsByExternalId(externalId)) {
            throw new ConflictException(EXTERNAL_ID_TAKEN);
        }

        User user = UserMapper.toEntity(request);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        applyReferences(user, request);
        applyRoles(user, request, actorId);
        User saved = users.save(user);
        openEmployment(saved, actorId);
        return UserMapper.toDto(saved);
    }

    @Transactional
    public UserDto update(Long id, UserRequest request, Long actorId) {
        User user = find(id);
        validate(request, id);
        String externalId = UserMapper.blankToNull(request.externalId());
        if (users.existsByLoginAndIdNot(request.login(), id)) {
            throw new ConflictException(LOGIN_TAKEN);
        }
        if (externalId != null && users.existsByExternalIdAndIdNot(externalId, id)) {
            throw new ConflictException(EXTERNAL_ID_TAKEN);
        }

        Long previousDepartmentId = user.getDepartment() == null ? null : user.getDepartment().getId();
        String previousPosition = user.getPosition();
        UserMapper.update(user, request);
        applyReferences(user, request);
        applyRoles(user, request, actorId);
        if (!Objects.equals(previousDepartmentId, request.departmentId())
                || !Objects.equals(previousPosition, user.getPosition())) {
            moveEmployment(user, actorId);
        }
        return UserMapper.toDto(user);
    }

    @Transactional
    public UserDto setActive(Long id, boolean active, Long actorId) {
        if (!active && id.equals(actorId)) {
            throw new ConflictException("Нельзя деактивировать собственную учётную запись");
        }
        User user = find(id);
        user.setActive(active);
        return UserMapper.toDto(user);
    }

    /** Администратор выдаёт временный пароль: при следующем входе клиент предложит его сменить. */
    @Transactional
    public void resetPassword(Long id, String password) {
        User user = find(id);
        requireStrong("password", password, user.getLogin());
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setMustChangePassword(true);
    }

    @Transactional
    public void changePassword(Long id, String currentPassword, String newPassword) {
        User user = find(id);
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new FieldValidationException("currentPassword", "Неверный текущий пароль");
        }
        if (newPassword.equals(currentPassword)) {
            throw new FieldValidationException("newPassword", "Новый пароль должен отличаться от текущего");
        }
        requireStrong("newPassword", newPassword, user.getLogin());
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
    }

    @Transactional
    public UserDto recordLogin(Long id) {
        User user = find(id);
        user.setLastLoginAt(Instant.now());
        return UserMapper.toDto(user);
    }

    @Transactional(readOnly = true)
    public boolean hasAdmin() {
        return roleAssignments.existsByRoleAndValidToIsNull(Role.ADMIN);
    }

    /** Первый администратор из настроек: миграцией его не создать, репозиторий публичный. */
    @Transactional
    public void createFirstAdmin(String login, String password) {
        if (!login.matches("^[a-z0-9.-]{3,50}$")) {
            throw new FieldValidationException("login", "Недопустимый логин первого администратора: " + login);
        }
        if (users.existsByLogin(login)) {
            throw new ConflictException("Логин первого администратора уже занят: " + login);
        }
        PasswordPolicy.unusable(password).ifPresent(message -> {
            throw new FieldValidationException("password", "Пароль первого администратора: " + message);
        });
        User admin = new User();
        admin.setLogin(login);
        admin.setLastName("Администратор");
        admin.setFirstName("Системный");
        admin.setPasswordHash(passwordEncoder.encode(password));
        addRole(admin, Role.ADMIN, null, null);
        openEmployment(users.save(admin), null);
    }

    private static void requireStrong(String field, String password, String login) {
        PasswordPolicy.violation(password, login).ifPresent(message -> {
            throw new FieldValidationException(field, message);
        });
    }

    private User find(Long id) {
        return users.findById(id).orElseThrow(() -> new NotFoundException("Сотрудник " + id + " не найден"));
    }

    private void validate(UserRequest request, Long userId) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (request.departmentId() != null && !departments.existsById(request.departmentId())) {
            errors.put("departmentId", "Подразделение не найдено");
        }
        if (!programsExist(request.programIds())) {
            errors.put("programIds", "Образовательная программа не найдена");
        }
        if (request.roles().contains(Role.REVIEWER) && isEmpty(request.reviewProgramIds())) {
            errors.put("reviewProgramIds", "Укажите программы, результаты которых проверяет РОП");
        } else if (request.roles().contains(Role.REVIEWER) && !programsExist(request.reviewProgramIds())) {
            errors.put("reviewProgramIds", "Образовательная программа не найдена");
        }
        if (request.managerId() != null) {
            if (request.managerId().equals(userId)) {
                errors.put("managerId", "Сотрудник не может быть своим руководителем");
            } else if (!users.existsById(request.managerId())) {
                errors.put("managerId", "Руководитель не найден");
            }
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }
    }

    private boolean programsExist(Set<Long> ids) {
        return isEmpty(ids) || programs.findAllById(ids).size() == ids.size();
    }

    private static boolean isEmpty(Collection<?> values) {
        return values == null || values.isEmpty();
    }

    private void applyReferences(User user, UserRequest request) {
        user.setDepartment(request.departmentId() == null ? null : departments.getReferenceById(request.departmentId()));
        user.setManagerId(request.managerId());
        replace(user.getCategories(), request.categories());
        replace(user.getProgramIds(), request.programIds());
        replace(user.getPermissions(), request.permissions() == null ? Set.of() : request.permissions());
    }

    /** Меняет содержимое на месте: в базе затрагиваются только реально изменившиеся строки. */
    private static <T> void replace(Set<T> target, Set<T> values) {
        target.retainAll(values);
        target.addAll(values);
    }

    /** Снятые роли закрываются датой, а не удаляются: история совмещения ролей остаётся. */
    private void applyRoles(User user, UserRequest request, Long actorId) {
        Set<RoleKey> wanted = wantedRoles(request);
        Set<RoleKey> kept = new HashSet<>();
        for (RoleAssignment assignment : user.activeAssignments()) {
            RoleKey key = new RoleKey(assignment.getRole(), assignment.getProgramId());
            if (wanted.contains(key)) {
                kept.add(key);
            } else {
                assignment.setValidTo(LocalDate.now());
            }
        }
        wanted.stream()
                .filter(key -> !kept.contains(key))
                .forEach(key -> addRole(user, key.role(), key.programId(), actorId));
    }

    private static Set<RoleKey> wantedRoles(UserRequest request) {
        Set<RoleKey> wanted = new HashSet<>();
        for (Role role : request.roles()) {
            if (role == Role.REVIEWER) {
                request.reviewProgramIds().forEach(programId -> wanted.add(new RoleKey(role, programId)));
            } else {
                wanted.add(new RoleKey(role, null));
            }
        }
        return wanted;
    }

    private static void addRole(User user, Role role, Long programId, Long actorId) {
        RoleAssignment assignment = new RoleAssignment();
        assignment.setUser(user);
        assignment.setRole(role);
        assignment.setProgramId(programId);
        assignment.setValidFrom(LocalDate.now());
        assignment.setAssignedBy(actorId);
        user.getRoleAssignments().add(assignment);
    }

    private void openEmployment(User user, Long actorId) {
        EmploymentRecord record = new EmploymentRecord();
        record.setUserId(user.getId());
        record.setDepartment(user.getDepartment());
        record.setPosition(user.getPosition());
        record.setValidFrom(LocalDate.now());
        record.setChangedBy(actorId);
        employment.save(record);
    }

    /**
     * Закрытие старой записи записывается в базу сразу: текущая строка у сотрудника может быть одна,
     * а новая строка вставляется немедленно, раньше обычного сохранения изменений.
     */
    private void moveEmployment(User user, Long actorId) {
        employment.findByUserIdAndValidToIsNull(user.getId()).ifPresent(current -> {
            current.setValidTo(LocalDate.now());
            employment.saveAndFlush(current);
        });
        openEmployment(user, actorId);
    }

    private record RoleKey(Role role, Long programId) {
    }
}
