package ru.fa.kpi.common;

import java.io.IOException;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Отдаёт клиент React из classpath:/static/. Если файла нет, а адрес похож на экран
 * клиента (/admin/users, /cabinet), отдаётся index.html, и экран выбирает React Router.
 * Адреса /api и файлы с расширением не подменяются: для них остаётся 404.
 */
@Configuration
class SpaConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new IndexFallbackResolver());
    }

    private static final class IndexFallbackResolver extends PathResourceResolver {

        @Override
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
            Resource file = super.getResource(resourcePath, location);
            if (file != null) {
                return file;
            }
            if (isApi(resourcePath) || hasExtension(resourcePath)) {
                return null;
            }
            return super.getResource("index.html", location);
        }

        private static boolean isApi(String path) {
            return path.equals("api") || path.startsWith("api/");
        }

        private static boolean hasExtension(String path) {
            String lastSegment = path.substring(path.lastIndexOf('/') + 1);
            return lastSegment.contains(".");
        }
    }
}
