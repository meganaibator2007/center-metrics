package ru.fa.kpi.user;

import java.util.List;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
class OrgController {

    private final OrgService orgService;

    @GetMapping("/api/departments")
    List<DepartmentDto> departments() {
        return orgService.listDepartments();
    }

    @PostMapping("/api/departments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    DepartmentDto createDepartment(@Valid @RequestBody DepartmentRequest body) {
        return orgService.createDepartment(body);
    }

    @PutMapping("/api/departments/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    DepartmentDto updateDepartment(@PathVariable Long id, @Valid @RequestBody DepartmentRequest body) {
        return orgService.updateDepartment(id, body);
    }

    @GetMapping("/api/programs")
    List<ProgramDto> programs() {
        return orgService.listPrograms();
    }

    @PostMapping("/api/programs")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    ProgramDto createProgram(@Valid @RequestBody ProgramRequest body) {
        return orgService.createProgram(body);
    }

    @PutMapping("/api/programs/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    ProgramDto updateProgram(@PathVariable Long id, @Valid @RequestBody ProgramRequest body) {
        return orgService.updateProgram(id, body);
    }
}
