#!/bin/bash

# Скрипт для запуска Kelbetty в режиме разработки с LibreOffice

echo "🚀 Запуск Kelbetty в режиме разработки с LibreOffice..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

# Используем docker compose если доступно, иначе docker-compose
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Останавливаем существующие контейнеры
echo "🛑 Останавливаем существующие контейнеры..."
$COMPOSE_CMD -f docker-compose.dev.yml down

# Собираем образы
echo "🔨 Собираем образы для разработки..."
$COMPOSE_CMD -f docker-compose.dev.yml build

# Запускаем сервисы в режиме разработки
echo "🚀 Запускаем сервисы в режиме разработки..."
$COMPOSE_CMD -f docker-compose.dev.yml up -d db documentserver

# Ждем запуска базы данных
echo "⏳ Ждем запуска базы данных..."
sleep 10

# Запускаем основное приложение
echo "🚀 Запускаем основное приложение..."
$COMPOSE_CMD -f docker-compose.dev.yml up app

echo ""
echo "✅ Kelbetty запущен в режиме разработки с LibreOffice!"
echo ""
echo "🌐 Доступные сервисы:"
echo "   • Основное приложение: http://localhost:3000"
echo "   • Тест LibreOffice: http://localhost:3000/test-libreoffice"
echo "   • OnlyOffice: http://localhost:8082"
echo ""
echo "📋 Полезные команды:"
echo "   • Просмотр логов: $COMPOSE_CMD -f docker-compose.dev.yml logs -f"
echo "   • Остановка: $COMPOSE_CMD -f docker-compose.dev.yml down"
echo "   • Перезапуск: $COMPOSE_CMD -f docker-compose.dev.yml restart"
echo ""
echo "🔧 Для тестирования LibreOffice:"
echo "   docker exec kelbetty-app-dev libreoffice --headless --convert-to html /path/to/test.docx"
