# Docker Development Setup для Kelbetty

## Быстрый старт

### 1. Запуск для разработки

```bash
# Запуск с LibreOffice интеграцией
./scripts/start-with-libreoffice.sh

# Или вручную
docker-compose -f docker-compose.dev.yml up
```

### 2. Обычный запуск (без LibreOffice)

```bash
# Только база данных и OnlyOffice
docker-compose up -d

# Запуск приложения локально
npm run dev
```

## Конфигурация

### docker-compose.yml
- **База данных**: PostgreSQL 16
- **OnlyOffice**: Document Server для редактирования
- **Порты**: 
  - База данных: `5432`
  - OnlyOffice: `8082`

### docker-compose.dev.yml
- **Все сервисы** из основного compose
- **Приложение**: Смонтировано для hot reload
- **LibreOffice**: Интегрирован для конвертации
- **Volumes**: Для временных файлов LibreOffice

## Переменные окружения

Создайте `.env` файл:

```env
DATABASE_URL=postgresql://kelbetty:kelbetty@localhost:5432/kelbetty
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

## Полезные команды

### Разработка
```bash
# Запуск в режиме разработки
docker-compose -f docker-compose.dev.yml up

# Просмотр логов
docker-compose -f docker-compose.dev.yml logs -f app

# Остановка
docker-compose -f docker-compose.dev.yml down
```

### Тестирование LibreOffice
```bash
# Проверка LibreOffice
docker exec kelbetty-app-dev libreoffice --version

# Тест конвертации
docker exec kelbetty-app-dev libreoffice --headless --convert-to html /path/to/test.docx
```

### База данных
```bash
# Подключение к базе
docker exec -it kelbetty-demo-db-1 psql -U kelbetty -d kelbetty

# Сброс базы данных
docker-compose down -v
docker-compose up -d db
```

## Структура volumes

- `db_data` - Данные PostgreSQL
- `convert_data` - Временные файлы LibreOffice
- `assets_data` - Загруженные файлы
- `libreoffice_data` - Конфигурация LibreOffice
- `onlyoffice_data` - Данные OnlyOffice

## Устранение неполадок

### LibreOffice не работает
```bash
# Проверка установки
docker exec kelbetty-app-dev which libreoffice

# Проверка прав
docker exec kelbetty-app-dev ls -la /tmp/convert
```

### OnlyOffice не запускается
```bash
# Проверка логов
docker-compose logs documentserver

# Перезапуск
docker-compose restart documentserver
```

### База данных недоступна
```bash
# Проверка статуса
docker-compose ps db

# Перезапуск
docker-compose restart db
```

## Производительность

### Для разработки
- Используйте `docker-compose.dev.yml` для hot reload
- Монтируйте только необходимые директории
- Отключите health checks для ускорения

### Для тестирования
- Используйте отдельные volumes для тестовых данных
- Очищайте временные файлы после тестов
- Мониторьте использование диска

## Безопасность

- Не используйте продакшн секреты в разработке
- Ограничьте доступ к портам базы данных
- Регулярно обновляйте образы
- Используйте .dockerignore для исключения ненужных файлов
