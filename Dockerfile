# Используем Node.js 18 Alpine как базовый образ
FROM node:18-alpine

# Устанавливаем системные зависимости для LibreOffice
RUN apk add --no-cache \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-draw \
    libreoffice-math \
    fontconfig \
    ttf-dejavu \
    ttf-liberation \
    ttf-opensans \
    ttf-droid \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Создаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Генерируем Prisma клиент
RUN npx prisma generate

# Создаем директории для временных файлов LibreOffice
RUN mkdir -p /tmp/convert /tmp/assets /tmp/libreoffice

# Устанавливаем права на запись
RUN chmod 777 /tmp/convert /tmp/assets /tmp/libreoffice

# Настраиваем LibreOffice для headless режима
ENV DISPLAY=:99
ENV LIBREOFFICE_HOME=/tmp/libreoffice

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
