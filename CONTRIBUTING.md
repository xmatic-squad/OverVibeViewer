# Руководство по участию в развитии OverVibeViewer

Спасибо за интерес к проекту OverVibeViewer! Этот документ содержит инструкции для разработчиков, желающих участвовать в развитии проекта.

## Настройка окружения разработки

### Предварительные требования

- Docker
- Node.js 16+ (для локальной разработки)
- Git

### Шаги для настройки

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/yourusername/OverVibeViewer.git
   cd OverVibeViewer
   ```

2. Установите зависимости для веб-приложения:
   ```bash
   cd app
   npm install
   cd ..
   ```

3. Запустите приложение для разработки:
   ```bash
   # Для macOS/Linux
   ./scripts/start.sh
   
   # Для Windows
   scripts\start.bat
   ```

## Структура проекта

- `app/` - Веб-приложение на Node.js
  - `public/` - Статические файлы (CSS, JavaScript, изображения)
  - `src/` - Исходный код приложения
    - `views/` - EJS шаблоны
    - `index.js` - Основной файл приложения
- `docker/` - Файлы для Docker
  - `Dockerfile` - Инструкции для сборки контейнера
  - `overviewer.conf` - Шаблон конфигурации Overviewer
  - `minecraft/` - Исполняемые файлы Minecraft
- `scripts/` - Скрипты запуска
  - `start.sh` - Скрипт запуска для macOS/Linux
  - `start.bat` - Скрипт запуска для Windows

## Рабочий процесс разработки

1. Создайте ветку для вашей функциональности или исправления:
   ```bash
   git checkout -b feature/название-функциональности
   ```

2. Внесите изменения и протестируйте их локально.

3. Зафиксируйте изменения:
   ```bash
   git add .
   git commit -m "Описание ваших изменений"
   ```

4. Отправьте изменения и создайте Pull Request:
   ```bash
   git push origin feature/название-функциональности
   ```

## Рекомендации по разработке

### Веб-приложение

- Используйте современный JavaScript (ES6+)
- Следуйте стилю кода проекта
- Обновляйте документацию при изменении API

### Docker

- Оптимизируйте слои Docker для уменьшения размера образа
- Документируйте все переменные окружения и аргументы

### Overviewer

- Тестируйте конфигурацию Overviewer с разными версиями Minecraft
- Документируйте особенности работы с разными версиями

## Тестирование

Перед отправкой Pull Request убедитесь, что:

1. Приложение запускается и работает в Docker
2. Все функции веб-интерфейса работают корректно
3. Генерация карт происходит без ошибок

## Получение помощи

Если у вас возникли вопросы или проблемы, создайте Issue в репозитории или свяжитесь с основными разработчиками проекта.