# Тесты для конвертации документов

## Описание

Этот набор тестов проверяет функциональность конвертации DOCX/RTF документов в HTML через LibreOffice headless с максимальным сохранением форматирования.

## Что тестируется

### 1. Основная функциональность
- Отображение страницы импорта
- Выбор файлов (DOCX, RTF)
- Процесс конвертации
- Отображение результатов

### 2. Сохранение форматирования
- **Размеры шрифтов** (font-size)
- **Отступы абзацев** (margin-left, margin-right)
- **Отступы первой строки** (text-indent)
- **Межстрочный интервал** (line-height)
- **Выравнивание текста** (text-align)
- **Стили таблиц** (border-collapse, padding, border)
- **Стили списков** (margin-left, padding-left)

### 3. Безопасность
- Очистка HTML через DOMPurify
- Изоляция в iframe
- Валидация файлов

### 4. Обработка ошибок
- LibreOffice недоступен
- Неверный формат файла
- Превышение размера файла
- Ошибки конвертации

## Запуск тестов

```bash
# Установка зависимостей
npm install

# Запуск тестов
npx playwright test

# Запуск с UI
npx playwright test --ui

# Запуск конкретного теста
npx playwright test document-conversion.spec.ts

# Запуск в headed режиме
npx playwright test --headed
```

## Структура тестов

```
tests/
├── document-conversion.spec.ts  # Основные тесты
├── fixtures/                    # Тестовые файлы
│   ├── test-document.docx      # Тестовый DOCX файл
│   ├── test-document.rtf       # Тестовый RTF файл
│   └── large-document.docx    # Большой файл для тестирования лимитов
└── README.md                   # Этот файл
```

## Тестовые файлы

Для корректной работы тестов необходимо создать тестовые файлы в директории `fixtures/`:

### test-document.docx
Простой DOCX файл с различными элементами форматирования:
- Заголовки разных уровней
- Параграфы с отступами
- Списки (маркированные и нумерованные)
- Таблицы с границами
- Различные размеры шрифтов

### test-document.rtf
RTF файл с аналогичным содержимым для тестирования LibreOffice.

### large-document.docx
Большой DOCX файл (>50MB) для тестирования ограничений размера.

## Проверяемые стили

Тесты проверяют следующие computed styles:

```typescript
// Заголовки
fontSize: '24pt'
marginBottom: '12pt'
fontWeight: 'bold'

// Параграфы
textIndent: '18pt'
marginBottom: '6pt'
fontSize: '14pt'

// Списки
marginLeft: '24pt'
paddingLeft: '20pt'

// Таблицы
borderCollapse: 'collapse'
width: '100%'
margin: '12pt 0'

// Ячейки таблиц
border: '1pt solid #000'
padding: '4pt'
```

## Настройка окружения

Перед запуском тестов убедитесь, что:

1. Приложение запущено на `http://localhost:3000`
2. LibreOffice установлен (для полного тестирования)
3. Все зависимости установлены

## Отладка

Для отладки тестов используйте:

```bash
# Запуск с отладкой
npx playwright test --debug

# Запуск конкретного теста с отладкой
npx playwright test document-conversion.spec.ts --debug

# Просмотр трассировки
npx playwright show-trace trace.zip
```

## CI/CD

Тесты настроены для запуска в CI/CD окружении:

- Автоматический запуск dev сервера
- Параллельное выполнение тестов
- Генерация HTML отчетов
- Сохранение скриншотов при ошибках
