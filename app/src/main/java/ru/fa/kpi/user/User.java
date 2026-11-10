package ru.fa.kpi.user;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** Сотрудник и его учётная запись. Не удаляется, а деактивируется. */
@Entity
@Table(name = "usr_user")
@Getter
@Setter
class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String externalId;

    private String login;

    private String passwordHash;

    private String lastName;

    private String firstName;

    private String middleName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    private Long managerId;

    private String position;

    private boolean active = true;

    private boolean mustChangePassword = true;

    private Instant lastLoginAt;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @ElementCollection
    @CollectionTable(name = "usr_user_category", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "category")
    @Enumerated(EnumType.STRING)
    private Set<Category> categories = new HashSet<>();

    @ElementCollection
    @CollectionTable(name = "usr_user_permission", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "permission")
    @Enumerated(EnumType.STRING)
    private Set<Permission> permissions = new HashSet<>();

    @ElementCollection
    @CollectionTable(name = "usr_user_program", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "program_id")
    private Set<Long> programIds = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<RoleAssignment> roleAssignments = new ArrayList<>();

    String fullName() {
        return Stream.of(lastName, firstName, middleName).filter(Objects::nonNull).collect(Collectors.joining(" "));
    }

    List<RoleAssignment> activeAssignments() {
        return roleAssignments.stream().filter(assignment -> assignment.getValidTo() == null).toList();
    }

    Set<Role> activeRoles() {
        return activeAssignments().stream().map(RoleAssignment::getRole).collect(Collectors.toSet());
    }

    Set<Long> reviewProgramIds() {
        return activeAssignments().stream()
                .map(RoleAssignment::getProgramId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }
}
