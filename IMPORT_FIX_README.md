# Исправление импорта DOCX с сохранением форматирования

## Проблема
При импорте DOCX файлов через `npm run dev` (локальная разработка) теряются:
- Абзацные отступы (text-indent, margin-left/right)
- Размеры шрифтов (font-size)
- Межстрочные интервалы (line-height)

## Решение

### 1. Обновленный API импорта (`/src/app/api/import/route.ts`)
- ✅ Автоматическая проверка доступности LibreOffice
- ✅ Fallback на mammoth с улучшенными стилями
- ✅ Сохранение pt единиц (не конвертация в rem/em)
- ✅ Улучшенная обработка HTML

### 2. Новый DocumentIframeViewer (`/src/components/DocumentIframeViewer.tsx`)
- ✅ Полная изоляция от Tailwind CSS через iframe
- ✅ `all: initial` для сброса глобальных стилей
- ✅ Подключение шрифтов через @font-face
- ✅ Сохранение всех inline стилей

### 3. Обновленное главное приложение (`/src/app/app/page.tsx`)
- ✅ Новый режим "iframe" для максимального сохранения форматирования
- ✅ Переключатель между режимами просмотра
- ✅ Интеграция DocumentIframeViewer

## Как тестировать

### 1. Запуск локальной разработки
```bash
# Запустите базу данных и OnlyOffice
docker-compose up -d

# Запустите приложение локально
npm run dev
```

### 2. Тестирование импорта
1. Откройте `http://localhost:3000/app`
2. Загрузите DOCX файл через ImportDropzone
3. Выберите режим "iframe" в переключателе
4. Проверьте сохранение форматирования

### 3. Тестовая страница
1. Откройте `http://localhost:3000/test-import-fix`
2. Загрузите DOCX файл
3. Проверьте метод импорта (должен быть "mammoth-fallback")
4. Убедитесь, что отступы и размеры шрифта сохранились

## Ожидаемые результаты

### ✅ Что должно работать:
- **Отступы абзацев** - text-indent, margin-left/right сохраняются
- **Размеры шрифтов** - font-size в pt единицах
- **Межстрочные интервалы** - line-height корректный
- **Шрифты** - Times New Roman, Calibri, Arial отображаются
- **Цвета и форматирование** - bold, italic, underline
- **Списки и таблицы** - отступы и выравнивание

### ❌ Что может не работать:
- Сложные макросы Word
- Некоторые специальные символы
- Очень сложные таблицы с объединенными ячейками

## Отладка

### 1. Проверка логов
```bash
# Смотрите логи в терминале npm run dev
# Ищите сообщения:
# - "LibreOffice недоступен в системе"
# - "Используем mammoth fallback с улучшенными стилями"
# - "Mammoth fallback конвертация завершена"
```

### 2. Проверка HTML
1. Откройте DevTools в браузере
2. Найдите iframe с документом
3. Проверьте, что есть inline стили: `style="text-indent: 24pt; font-size: 12pt;"`
4. Убедитесь, что нет глобальных CSS сбросов

### 3. Проверка computed styles
```javascript
// В консоли браузера в iframe
const p = document.querySelector('p')
const styles = window.getComputedStyle(p)
console.log('textIndent:', styles.textIndent)
console.log('fontSize:', styles.fontSize)
console.log('marginLeft:', styles.marginLeft)
```

## Переменные окружения

Создайте `.env.local`:
```env
# Режим импорта DOCX
NEXT_PUBLIC_DOCX_IMPORT_MODE="mammoth-fallback"

# База данных
DATABASE_URL="postgresql://kelbetty:kelbetty@localhost:5432/kelbetty"
```

## Структура файлов

```
src/
├── app/
│   ├── api/import/route.ts          # Обновленный API с fallback
│   ├── app/page.tsx                 # Главное приложение с iframe режимом
│   └── test-import-fix/page.tsx     # Тестовая страница
├── components/
│   └── DocumentIframeViewer.tsx     # Новый компонент с iframe изоляцией
├── lib/
│   └── docx/
│       ├── import.ts               # Адаптер импорта
│       └── postProcessDocHtml.ts   # Пост-обработка HTML
└── public/
    └── fonts/
        └── fonts.css               # Шрифты для точного отображения
```

## Критерии успеха

- [ ] DOCX файл импортируется без ошибок
- [ ] Отступы абзацев видны (text-indent, margin-left)
- [ ] Размеры шрифтов корректные (font-size в pt)
- [ ] Шрифты отображаются правильно
- [ ] Нет влияния Tailwind CSS на документ
- [ ] iframe изоляция работает
- [ ] Fallback на mammoth срабатывает автоматически

## Следующие шаги

1. **Тестирование** - загрузите несколько DOCX файлов
2. **Сравнение** - сравните с оригиналом в Word
3. **Оптимизация** - настройте стили при необходимости
4. **Мониторинг** - следите за качеством конвертации
