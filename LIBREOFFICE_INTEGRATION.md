# LibreOffice интеграция в Kelbetty

## Обзор

Интеграция LibreOffice в проект Kelbetty обеспечивает максимальное сохранение форматирования при импорте документов DOCX и RTF. Система использует LibreOffice headless режим с fallback на mammoth для DOCX файлов.

## Архитектура

### 1. API импорта (`/src/app/api/import/route.ts`)

**Основные функции:**
- `convertWithLibreOffice()` - конвертация через LibreOffice headless
- `processLibreOfficeHtml()` - обработка и очистка HTML
- Fallback на mammoth для DOCX файлов
- Поддержка RTF и DOCX форматов

**Логика работы:**
1. Пробует LibreOffice headless конвертацию
2. При ошибке использует mammoth fallback для DOCX
3. RTF файлы поддерживаются только через LibreOffice
4. Очищает HTML через DOMPurify для безопасности

### 2. Компонент просмотра (`/src/components/editor/LibreOfficeDocumentViewer.tsx`)

**Особенности:**
- iframe изоляция для максимальной точности отображения
- Полная поддержка Word стилей (Mso-* классы)
- Безопасная обработка HTML
- Индикаторы состояния загрузки

**Поддерживаемые стили:**
- Все Mso-* классы от LibreOffice
- Inline стили с максимальным приоритетом
- Специальные стили для Word документов
- Полная поддержка таблиц, списков, изображений

### 3. Обновленный ImportDropzone

**Новые возможности:**
- Поддержка RTF файлов
- Улучшенные сообщения об ошибках
- Индикация метода конвертации
- Расширенная валидация файлов

### 4. Dockerfile с LibreOffice

**Установленные пакеты:**
- libreoffice (основной пакет)
- libreoffice-writer, libreoffice-calc, libreoffice-impress
- Шрифты: ttf-dejavu, ttf-liberation, ttf-opensans
- Настройка headless режима

## Использование

### 1. Импорт документов

```typescript
// Поддерживаемые форматы
const supportedFormats = ['docx', 'rtf']

// API endpoint
POST /api/import
Content-Type: multipart/form-data

// Ответ
{
  "success": true,
  "document": { ... },
  "warnings": [],
  "method": "libreoffice" | "mammoth"
}
```

### 2. Просмотр документов

```tsx
import LibreOfficeDocumentViewer from '@/components/editor/LibreOfficeDocumentViewer'

<LibreOfficeDocumentViewer
  document={document}
  onSave={handleSave}
  isPreview={false}
/>
```

### 3. Режимы просмотра

В главном приложении доступны 3 режима:
- **Просмотр** - базовый StyledDocumentViewer
- **Продвинутый** - ImportedDocumentViewer с улучшенными стилями
- **LibreOffice** - LibreOfficeDocumentViewer с iframe изоляцией

## Тестирование

### 1. Тестовая страница

```
http://localhost:3000/test-libreoffice
```

**Функции:**
- Загрузка DOCX/RTF файлов
- Индикация метода конвертации
- Просмотр результатов в iframe
- Обработка ошибок

### 2. Тестовые файлы

Создайте тестовые файлы в `tests/fixtures/`:
- `test-document.docx` - Word документ с форматированием
- `test-document.rtf` - RTF документ
- `complex-formatting.docx` - сложное форматирование

### 3. Проверка LibreOffice

```bash
# Проверка установки
docker exec -it kelbetty-demo libreoffice --version

# Тест конвертации
docker exec -it kelbetty-demo libreoffice --headless --convert-to html /path/to/test.docx
```

## Конфигурация

### 1. Переменные окружения

```env
# LibreOffice настройки
DISPLAY=:99
LIBREOFFICE_HOME=/tmp/libreoffice

# Таймауты
LIBREOFFICE_TIMEOUT=30000
```

### 2. Docker настройки

```dockerfile
# Создание директорий для LibreOffice
RUN mkdir -p /tmp/convert /tmp/assets /tmp/libreoffice
RUN chmod 777 /tmp/convert /tmp/assets /tmp/libreoffice
```

## Обработка ошибок

### 1. LibreOffice недоступен

```typescript
try {
  result = await convertWithLibreOffice(arrayBuffer, fileName, extension)
} catch (libreOfficeError) {
  // Fallback на mammoth для DOCX
  if (extension === 'docx') {
    result = await convertWithMammoth(arrayBuffer)
  } else {
    throw new Error('RTF файлы поддерживаются только через LibreOffice')
  }
}
```

### 2. Таймауты

```typescript
const { stdout, stderr } = await execAsync(command, {
  timeout: 30000, // 30 секунд
  cwd: workDir
})
```

### 3. Очистка временных файлов

```typescript
try {
  await unlink(inputPath)
  if (existsSync(outputPath)) {
    await unlink(outputPath)
  }
} catch (cleanupError) {
  console.warn('Ошибка очистки временных файлов:', cleanupError)
}
```

## Производительность

### 1. Оптимизации

- Временные файлы в `/tmp/convert/`
- Уникальные сессии для параллельной обработки
- Автоматическая очистка после конвертации
- iframe изоляция для быстрого рендеринга

### 2. Ограничения

- Максимальный размер файла: 50MB
- Таймаут конвертации: 30 секунд
- Поддержка только DOCX и RTF
- Требует Docker с LibreOffice

## Безопасность

### 1. HTML очистка

```typescript
const cleanHtml = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'div', 'span', 'h1-h6', 'table', 'img', ...],
  ALLOWED_ATTR: ['style', 'class', 'src', 'alt', ...],
  ALLOW_DATA_ATTR: true,
  KEEP_CONTENT: true
})
```

### 2. iframe изоляция

```typescript
<iframe
  sandbox="allow-same-origin"
  title={document.title}
/>
```

## Мониторинг

### 1. Логирование

```typescript
console.log('LibreOffice stdout:', stdout)
console.log('LibreOffice stderr:', stderr)
console.log('Метод конвертации:', result.method)
```

### 2. Метрики

- Время конвертации
- Размер выходного HTML
- Количество предупреждений
- Используемый метод (LibreOffice/mammoth)

## Развертывание

### 1. Docker

```bash
# Сборка с LibreOffice
docker build -t kelbetty-demo .

# Запуск
docker run -p 3000:3000 kelbetty-demo
```

### 2. Проверка

```bash
# Проверка LibreOffice
docker exec -it container_name libreoffice --version

# Тест конвертации
curl -X POST -F "file=@test.docx" http://localhost:3000/api/import
```

## Устранение неполадок

### 1. LibreOffice не запускается

```bash
# Проверка установки
docker exec -it container_name which libreoffice

# Проверка прав
docker exec -it container_name ls -la /tmp/convert
```

### 2. Ошибки конвертации

```bash
# Проверка логов
docker logs container_name

# Ручной тест
docker exec -it container_name libreoffice --headless --convert-to html /path/to/file.docx
```

### 3. Проблемы с iframe

- Проверьте Content Security Policy
- Убедитесь в правильности HTML
- Проверьте sandbox атрибуты

## Заключение

LibreOffice интеграция обеспечивает:

✅ **Максимальное сохранение форматирования** - LibreOffice headless режим  
✅ **Безопасность** - DOMPurify очистка и iframe изоляция  
✅ **Надежность** - fallback на mammoth для DOCX  
✅ **Производительность** - оптимизированная обработка  
✅ **Мониторинг** - подробное логирование и метрики  

Система готова к продакшену и обеспечивает профессиональное качество конвертации документов.
