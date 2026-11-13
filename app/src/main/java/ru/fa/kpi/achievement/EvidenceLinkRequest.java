package ru.fa.kpi.achievement;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

record EvidenceLinkRequest(
        @NotBlank(message = "Укажите тип документа")
        @Size(max = 100, message = "Не длиннее 100 символов")
        String docType,

        @NotBlank(message = "Укажите ссылку")
        @Size(max = 1000, message = "Не длиннее 1000 символов")
        @Pattern(regexp = "^https?://\\S+$", message = "Ссылка начинается с http:// или https://")
        String url,

        @Size(max = 500, message = "Не длиннее 500 символов")
        String requisites) {
}
