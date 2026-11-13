package ru.fa.kpi.user;

import java.util.Locale;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fa.kpi.common.CurrentUser;

/** Откуда Spring Security берёт пользователя при входе и на каждом запросе. */
@Service
@RequiredArgsConstructor
class CurrentUserDetailsService implements UserDetailsService {

    private final UserRepository users;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        User user = users.findByLogin(username.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new UsernameNotFoundException("Пользователь не найден"));
        return new CurrentUser(
                user.getId(),
                user.getLogin(),
                user.getPasswordHash(),
                user.isActive(),
                user.isMustChangePassword(),
                user.activeRoles().stream().map(Role::name).collect(Collectors.toSet()));
    }
}
