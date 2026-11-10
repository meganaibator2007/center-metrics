package ru.fa.kpi.user;

final class OrgMapper {

    private OrgMapper() {
    }

    static DepartmentDto toDto(Department department) {
        return new DepartmentDto(department.getId(), department.getName());
    }

    static ProgramDto toDto(Program program) {
        return new ProgramDto(program.getId(), program.getCode(), program.getName(), program.isTopIt());
    }

    static void update(Department department, DepartmentRequest request) {
        department.setName(request.name().trim());
    }

    static void update(Program program, ProgramRequest request) {
        program.setCode(request.code().trim());
        program.setName(request.name().trim());
        program.setTopIt(request.topIt());
    }
}
