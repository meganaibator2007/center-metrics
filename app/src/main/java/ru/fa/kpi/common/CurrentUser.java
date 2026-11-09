package ru.fa.kpi.common;

import java.util.Collection;
import java.util.Set;

import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Вошедший пользователь: его Spring Security хранит в сессии, контроллеры получают через
 * {@code @AuthenticationPrincipal}. Лежит в common, чтобы пакетам не приходилось
 * зависеть от user ради ID текущего пользователя.
 */
public final class CurrentUser implements UserDetails, CredentialsContainer {

    private final Long id;
    private final String login;
    private String passwordHash;
    private final boolean active;
    private final Set<String> roles;

    public CurrentUser(Long id, String login, String passwordHash, boolean active, Set<String> roles) {
        this.id = id;
        this.login = login;
        this.passwordHash = passwordHash;
        this.active = active;
        this.roles = Set.copyOf(roles);
    }

    public Long getId() {
        return id;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream().map(role -> new SimpleGrantedAuthority("ROLE_" + role)).toList();
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return login;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }

    /** Spring Security вызывает после входа: хеш пароля не должен лежать в сессии. */
    @Override
    public void eraseCredentials() {
        passwordHash = null;
    }
}
