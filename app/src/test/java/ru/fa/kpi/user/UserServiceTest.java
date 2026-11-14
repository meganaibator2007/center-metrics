package ru.fa.kpi.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import ru.fa.kpi.common.Category;
import ru.fa.kpi.common.ConflictException;
import ru.fa.kpi.common.FieldValidationException;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository users;
    @Mock
    private RoleAssignmentRepository roleAssignments;
    @Mock
    private EmploymentRecordRepository employment;
    @Mock
    private DepartmentRepository departments;
    @Mock
    private ProgramRepository programs;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService service;

    private static UserRequest request(Set<Role> roles, Set<Long> reviewPrograms, String password) {
        return new UserRequest("Иванова", "Анна", null, "a.ivanova", roles, Set.of(Category.PPS), null, null,
                Set.of(), reviewPrograms, Set.of(), null, null, password);
    }

    private static User existing(Role... roles) {
        User user = new User();
        user.setId(7L);
        user.setLogin("a.ivanova");
        user.setLastName("Иванова");
        user.setFirstName("Анна");
        user.setPasswordHash("old-hash");
        for (Role role : roles) {
            RoleAssignment assignment = new RoleAssignment();
            assignment.setUser(user);
            assignment.setRole(role);
            assignment.setValidFrom(LocalDate.now().minusYears(1));
            user.getRoleAssignments().add(assignment);
        }
        return user;
    }

    private void saveAssignsId() {
        when(users.save(any())).thenAnswer(call -> {
            User user = call.getArgument(0);
            user.setId(7L);
            return user;
        });
    }

    @Test
    void createHashesPasswordAndOpensEmployment() {
        saveAssignsId();
        when(passwordEncoder.encode("secret-123")).thenReturn("hash");

        UserDto dto = service.create(request(Set.of(Role.EMPLOYEE), null, "secret-123"), 1L);

        assertThat(dto.id()).isEqualTo(7L);
        assertThat(dto.fullName()).isEqualTo("Иванова Анна");
        assertThat(dto.roles()).containsExactly(Role.EMPLOYEE);
        assertThat(dto.mustChangePassword()).isTrue();

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("hash");
        assertThat(saved.getValue().getRoleAssignments().get(0).getAssignedBy()).isEqualTo(1L);

        ArgumentCaptor<EmploymentRecord> record = ArgumentCaptor.forClass(EmploymentRecord.class);
        verify(employment).save(record.capture());
        assertThat(record.getValue().getUserId()).isEqualTo(7L);
        assertThat(record.getValue().getValidTo()).isNull();
    }

    @Test
    void createRequiresLongEnoughPassword() {
        assertThatThrownBy(() -> service.create(request(Set.of(Role.EMPLOYEE), null, "short"), 1L))
                .isInstanceOfSatisfying(FieldValidationException.class,
                        e -> assertThat(e.getErrors()).containsKey("password"));
        verify(users, never()).save(any());
    }

    @Test
    void reviewerNeedsPrograms() {
        assertThatThrownBy(() -> service.create(request(Set.of(Role.REVIEWER), Set.of(), "secret-123"), 1L))
                .isInstanceOfSatisfying(FieldValidationException.class,
                        e -> assertThat(e.getErrors()).containsKey("reviewProgramIds"));
    }

    @Test
    void reviewerGetsAssignmentPerProgram() {
        saveAssignsId();
        when(programs.findAllById(anySet())).thenReturn(List.of(new Program(), new Program()));
        when(passwordEncoder.encode(any())).thenReturn("hash");

        UserDto dto = service.create(request(Set.of(Role.REVIEWER), Set.of(3L, 5L), "secret-123"), 1L);

        assertThat(dto.roles()).containsExactly(Role.REVIEWER);
        assertThat(dto.reviewProgramIds()).containsExactly(3L, 5L);
    }

    @Test
    void unknownProgramIsFieldError() {
        when(programs.findAllById(anySet())).thenReturn(List.of());

        assertThatThrownBy(() -> service.create(request(Set.of(Role.REVIEWER), Set.of(3L), "secret-123"), 1L))
                .isInstanceOfSatisfying(FieldValidationException.class,
                        e -> assertThat(e.getErrors()).containsKey("reviewProgramIds"));
    }

    @Test
    void takenLoginIsConflict() {
        when(users.existsByLogin("a.ivanova")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request(Set.of(Role.EMPLOYEE), null, "secret-123"), 1L))
                .isInstanceOf(ConflictException.class);
        verify(users, never()).save(any());
    }

    @Test
    void updateClosesRemovedRoleAndAddsNewOne() {
        User user = existing(Role.EMPLOYEE, Role.ADMIN);
        when(users.findById(7L)).thenReturn(Optional.of(user));

        UserDto dto = service.update(7L, request(Set.of(Role.ADMIN, Role.DIRECTOR), null, null), 1L);

        assertThat(dto.roles()).containsExactly(Role.DIRECTOR, Role.ADMIN);
        RoleAssignment removed = user.getRoleAssignments().stream()
                .filter(assignment -> assignment.getRole() == Role.EMPLOYEE).findFirst().orElseThrow();
        assertThat(removed.getValidTo()).isEqualTo(LocalDate.now());
        assertThat(user.getRoleAssignments()).hasSize(3);
    }

    @Test
    void updateKeepsEmploymentWhenNothingMoved() {
        when(users.findById(7L)).thenReturn(Optional.of(existing(Role.EMPLOYEE)));

        service.update(7L, request(Set.of(Role.EMPLOYEE), null, null), 1L);

        verify(employment, never()).save(any());
    }

    @Test
    void positionChangeClosesCurrentRecordBeforeOpeningNext() {
        when(users.findById(7L)).thenReturn(Optional.of(existing(Role.EMPLOYEE)));
        EmploymentRecord current = new EmploymentRecord();
        when(employment.findByUserIdAndValidToIsNull(7L)).thenReturn(Optional.of(current));
        UserRequest moved = new UserRequest("Иванова", "Анна", null, "a.ivanova", Set.of(Role.EMPLOYEE), Set.of(), null,
                "Доцент", Set.of(), null, null, null, null, null);

        service.update(7L, moved, 1L);

        assertThat(current.getValidTo()).isEqualTo(LocalDate.now());
        InOrder order = inOrder(employment);
        order.verify(employment).saveAndFlush(current);
        order.verify(employment).save(any());
    }

    @Test
    void cannotDeactivateYourself() {
        assertThatThrownBy(() -> service.setActive(7L, false, 7L)).isInstanceOf(ConflictException.class);
    }

    @Test
    void changePasswordChecksCurrentOne() {
        when(users.findById(7L)).thenReturn(Optional.of(existing()));
        when(passwordEncoder.matches("wrong", "old-hash")).thenReturn(false);

        assertThatThrownBy(() -> service.changePassword(7L, "wrong", "new-secret-1"))
                .isInstanceOfSatisfying(FieldValidationException.class,
                        e -> assertThat(e.getErrors()).containsKey("currentPassword"));
    }

    @Test
    void changePasswordClearsTemporaryFlag() {
        User user = existing();
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("old", "old-hash")).thenReturn(true);
        when(passwordEncoder.encode("new-secret-1")).thenReturn("new-hash");

        service.changePassword(7L, "old", "new-secret-1");

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        assertThat(user.isMustChangePassword()).isFalse();
    }

    @Test
    void resetPasswordMakesItTemporary() {
        User user = existing();
        user.setMustChangePassword(false);
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("temp-secret")).thenReturn("temp-hash");

        service.resetPassword(7L, "temp-secret");

        assertThat(user.getPasswordHash()).isEqualTo("temp-hash");
        assertThat(user.isMustChangePassword()).isTrue();
    }

    @Test
    void firstAdminGetsAdminRole() {
        saveAssignsId();
        when(passwordEncoder.encode("admin")).thenReturn("hash");

        service.createFirstAdmin("admin", "admin");

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        assertThat(saved.getValue().activeRoles()).containsExactly(Role.ADMIN);
        assertThat(saved.getValue().isMustChangePassword()).isTrue();
    }

    @Test
    void firstAdminRejectsInvalidLogin() {
        assertThatThrownBy(() -> service.createFirstAdmin("Bad Login", "admin"))
                .isInstanceOf(FieldValidationException.class);
    }
}
