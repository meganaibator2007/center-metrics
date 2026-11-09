package ru.fa.kpi.user;

import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fa.kpi.common.ConflictException;
import ru.fa.kpi.common.NotFoundException;

/** Справочники оргструктуры: подразделения и образовательные программы. */
@Service
@RequiredArgsConstructor
public class OrgService {

    private static final String DEPARTMENT_TAKEN = "Такое подразделение уже есть";
    private static final String PROGRAM_TAKEN = "Код программы уже занят";

    private final DepartmentRepository departments;
    private final ProgramRepository programs;

    @Transactional(readOnly = true)
    public List<DepartmentDto> listDepartments() {
        return departments.findAllByOrderByName().stream().map(OrgMapper::toDto).toList();
    }

    @Transactional
    public DepartmentDto createDepartment(DepartmentRequest request) {
        if (departments.existsByName(request.name().trim())) {
            throw new ConflictException(DEPARTMENT_TAKEN);
        }
        Department department = new Department();
        OrgMapper.update(department, request);
        return OrgMapper.toDto(departments.save(department));
    }

    @Transactional
    public DepartmentDto updateDepartment(Long id, DepartmentRequest request) {
        Department department = departments.findById(id)
                .orElseThrow(() -> new NotFoundException("Подразделение " + id + " не найдено"));
        if (departments.existsByNameAndIdNot(request.name().trim(), id)) {
            throw new ConflictException(DEPARTMENT_TAKEN);
        }
        OrgMapper.update(department, request);
        return OrgMapper.toDto(department);
    }

    @Transactional(readOnly = true)
    public List<ProgramDto> listPrograms() {
        return programs.findAllByOrderByCode().stream().map(OrgMapper::toDto).toList();
    }

    @Transactional
    public ProgramDto createProgram(ProgramRequest request) {
        if (programs.existsByCode(request.code().trim())) {
            throw new ConflictException(PROGRAM_TAKEN);
        }
        Program program = new Program();
        OrgMapper.update(program, request);
        return OrgMapper.toDto(programs.save(program));
    }

    @Transactional
    public ProgramDto updateProgram(Long id, ProgramRequest request) {
        Program program = programs.findById(id)
                .orElseThrow(() -> new NotFoundException("Программа " + id + " не найдена"));
        if (programs.existsByCodeAndIdNot(request.code().trim(), id)) {
            throw new ConflictException(PROGRAM_TAKEN);
        }
        OrgMapper.update(program, request);
        return OrgMapper.toDto(program);
    }
}
