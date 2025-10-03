# Руководство по интеграции LibreOffice для конвертации документов

## Обзор

Реализована полная интеграция LibreOffice headless для конвертации DOCX/RTF документов в HTML с максимальным сохранением форматирования. Система обеспечивает изоляцию от Tailwind CSS через iframe и безопасную обработку через DOMPurify.

## Архитектура решения

### 1. Серверная часть
- **API**: `POST /api/convert` - конвертация через LibreOffice
- **Fallback**: Mammoth для DOCX файлов при недоступности LibreOffice
- **Безопасность**: DOMPurify + JSDOM для очистки HTML
- **Docker**: LibreOffice включен в Dockerfile

### 2. Клиентская часть
- **DocumentViewer**: React компонент с iframe для изоляции
- **useDocumentAssets**: Хук для обработки шрифтов и изображений
- **Import Page**: Полнофункциональная страница импорта

### 3. Тестирование
- **Playwright**: Автоматизированные тесты с проверкой computed styles
- **Покрытие**: Все сценарии использования и обработка ошибок

## Компоненты системы

### API `/api/convert`

```typescript
// Принимает файл и опции конвертации
POST /api/convert
Content-Type: multipart/form-data

// Параметры:
file: File (DOCX/RTF)
useLibreOffice: boolean (по умолчанию true)
fallbackToMammoth: boolean (по умолчанию true)

// Возвращает:
{
  success: boolean
  html: string
  assets: string[]
  fonts: string[]
  method: 'libreoffice' | 'mammoth'
}
```

**Особенности:**
- Автоматический fallback на Mammoth для DOCX
- Обработка ошибок LibreOffice
- Очистка временных файлов
- Таймаут 30 секунд

### DocumentViewer компонент

```tsx
<DocumentViewer
  html={string}
  assets={string[]}
  fonts={string[]}
  title={string}
  className={string}
  onError={(error) => void}
  onLoad={() => void}
/>
```

**Особенности:**
- Изоляция в iframe (sandbox="allow-same-origin")
- Встроенные стили для точного отображения
- Поддержка всех Word стилей (Mso-классы)
- Обработка ошибок загрузки
- Функция скачивания HTML

### useDocumentAssets хук

```typescript
const { assets, fonts, isLoading, error, loadAsset, preloadAssets } = useDocumentAssets({
  assets: string[]
  fonts: string[]
  baseUrl?: string
})
```

**Функции:**
- Автоматическая обработка изображений и шрифтов
- Создание object URLs для ресурсов
- Встраивание шрифтов в HTML
- Очистка ресурсов при размонтировании

## Установка и настройка

### 1. Docker окружение

```dockerfile
# Dockerfile включает LibreOffice
FROM node:18-alpine
RUN apk add --no-cache \
    libreoffice \
    libreoffice-writer \
    fontconfig \
    ttf-dejavu \
    ttf-liberation
```

### 2. Зависимости

```bash
npm install isomorphic-dompurify jsdom @playwright/test
```

### 3. Переменные окружения

```env
# Опционально - настройки LibreOffice
LIBREOFFICE_TIMEOUT=30000
LIBREOFFICE_TEMP_DIR=/tmp/convert
```

## Использование

### 1. Базовая конвертация

```typescript
// Загрузка файла
const formData = new FormData()
formData.append('file', file)
formData.append('useLibreOffice', 'true')

const response = await fetch('/api/convert', {
  method: 'POST',
  body: formData
})

const result = await response.json()
```

### 2. Отображение документа

```tsx
<DocumentViewer
  html={result.html}
  assets={result.assets}
  fonts={result.fonts}
  title="Мой документ"
/>
```

### 3. Обработка ресурсов

```typescript
const { assets, fonts, preloadAssets } = useDocumentAssets({
  assets: result.assets,
  fonts: result.fonts
})

// Предзагрузка всех ресурсов
await preloadAssets()
```

## Сохранение форматирования

### Поддерживаемые стили

✅ **Отступы абзацев** (margin-left, margin-right)  
✅ **Размеры шрифтов** (font-size)  
✅ **Отступы первой строки** (text-indent)  
✅ **Межстрочный интервал** (line-height)  
✅ **Выравнивание текста** (text-align)  
✅ **Стили таблиц** (border-collapse, padding, border)  
✅ **Стили списков** (margin-left, padding-left)  
✅ **Цвета и форматирование** (color, font-weight, etc.)  

### Word-специфичные стили

```css
/* Поддерживаются все Mso-классы */
.MsoNormal { margin: 0; line-height: 1.6; }
.MsoHeading1 { font-size: 28px; font-weight: bold; }
.MsoIndent1 { margin-left: 24px; }
.MsoFontSize12 { font-size: 12px; }
.MsoColorRed { color: #dc2626; }
```

## Безопасность

### 1. Очистка HTML
```typescript
// DOMPurify с ограниченными тегами и атрибутами
const cleanHtml = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'div', 'span', 'h1-h6', 'strong', 'em', 'table', 'tr', 'td', 'th', 'img'],
  ALLOWED_ATTR: ['style', 'class', 'src', 'alt', 'colspan', 'rowspan'],
  KEEP_CONTENT: true
})
```

### 2. Изоляция iframe
```tsx
<iframe
  sandbox="allow-same-origin"
  title="Document"
/>
```

### 3. Обработка файлов
- Временные файлы в `/tmp/convert`
- Автоматическая очистка после обработки
- Валидация типов файлов
- Ограничение размера (50MB)

## Тестирование

### Запуск тестов

```bash
# Все тесты
npm run test

# С UI
npm run test:ui

# В headed режиме
npm run test:headed

# Отладка
npm run test:debug
```

### Покрытие тестов

- ✅ Отображение страницы импорта
- ✅ Выбор и валидация файлов
- ✅ Процесс конвертации
- ✅ Сохранение форматирования в iframe
- ✅ Обработка ошибок
- ✅ Функция скачивания
- ✅ Проверка computed styles

### Проверка стилей

```typescript
// Тест проверяет computed styles элементов
const h1Styles = await h1.evaluate(el => {
  const computed = window.getComputedStyle(el)
  return {
    fontSize: computed.fontSize,
    marginBottom: computed.marginBottom,
    fontWeight: computed.fontWeight
  }
})

expect(h1Styles.fontSize).toBe('24pt')
expect(h1Styles.marginBottom).toBe('12pt')
```

## Производительность

### Оптимизации

1. **Кэширование ресурсов**: Object URLs для шрифтов и изображений
2. **Ленивая загрузка**: Ресурсы загружаются по требованию
3. **Очистка памяти**: Автоматическое освобождение object URLs
4. **Таймауты**: Ограничение времени обработки

### Мониторинг

```typescript
// Логирование процесса конвертации
console.log('=== НАЧАЛО КОНВЕРТАЦИИ ЧЕРЕЗ LIBREOFFICE ===')
console.log('Файл получен:', file.name, 'Размер:', file.size)
console.log('LibreOffice stdout:', stdout)
console.log('=== КОНВЕРТАЦИЯ ЗАВЕРШЕНА УСПЕШНО ===')
```

## Ограничения

### LibreOffice
- Требует установки в Docker
- Может быть медленным для больших файлов
- Некоторые сложные стили могут не сохраняться

### Fallback (Mammoth)
- Меньшая точность форматирования
- Только для DOCX файлов
- Ограниченная поддержка таблиц

### Браузер
- iframe изоляция может влиять на производительность
- Ограничения sandbox атрибута
- Различия в рендеринге между браузерами

## Устранение неполадок

### LibreOffice недоступен
```bash
# Проверка установки
docker exec -it container_name libreoffice --version

# Проверка прав доступа
ls -la /tmp/convert
```

### Ошибки конвертации
```typescript
// Логирование ошибок
console.error('Ошибка при конвертации документа:', error)

// Fallback на Mammoth
if (libreOfficeError && extension === 'docx') {
  result = await convertWithMammoth(arrayBuffer, assetsDir)
}
```

### Проблемы с форматированием
- Проверьте inline стили в HTML
- Убедитесь в корректности CSS в iframe
- Проверьте поддержку Mso-классов

## Развертывание

### Docker Compose
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - /tmp/convert:/tmp/convert
      - /tmp/assets:/tmp/assets
```

### Production настройки
```typescript
// Увеличение таймаута для больших файлов
const command = `libreoffice --headless --convert-to html --outdir "${outputDir}" "${inputPath}"`
const { stdout, stderr } = await execAsync(command, {
  timeout: 60000, // 60 секунд
  cwd: outputDir
})
```

## Заключение

Система обеспечивает максимально точное отображение документов с сохранением всех форматирований Word. Изоляция через iframe предотвращает конфликты с Tailwind CSS, а безопасная обработка через DOMPurify защищает от XSS атак.

**Ключевые преимущества:**
- Максимальная точность форматирования
- Безопасность и изоляция
- Автоматический fallback
- Полное тестовое покрытие
- Простота использования
