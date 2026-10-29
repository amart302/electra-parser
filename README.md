# 🧩 Nest Template

Шаблон API на NestJS с PostgreSQL, Prisma, проверкой переменных окружения, Swagger и единым форматом ответов.

## Что входит в шаблон

- **Основа:** NestJS и TypeScript.
- **База данных:** PostgreSQL, Prisma Client и адаптер `@prisma/adapter-pg`.
- **Docker:** Dockerfile для сборки API на Node.js 26 и Docker Compose для запуска PostgreSQL 17, применения миграций и запуска API.
- **HTTP API:** настроенный `ValidationPipe`, CORS, Swagger, общий фильтр ошибок и перехватчик ответов.
- **Конфигурация:** `@nestjs/config` и проверка переменных окружения через Joi.
- **Стиль кода:** ESLint, Prettier, Husky и `lint-staged`.

## 🚀 Быстрый старт

Для локальной разработки нужны Node.js 26.x и npm 11.x согласно `package.json`. Dockerfile и CI также используют Node.js 26. В этом варианте NestJS работает локально с перезапуском при изменении кода, а PostgreSQL — в Docker. Для базы нужны Docker и Docker Compose; вариант без Docker описан ниже.

```bash
cp .env.example .env
npm ci
docker compose up -d --wait postgres
```

При установке зависимостей `postinstall` автоматически генерирует Prisma Client. Проверьте значения в `.env`: пользователь, пароль и название базы в `DATABASE_URL` должны совпадать с `DATABASE_USER`, `DATABASE_PASSWORD` и `DATABASE_NAME`. Для локального API адрес базы — `localhost:5432`. Остальные переменные описаны ниже.

Если в проекте есть миграции, примените их к базе:

```bash
npm run prisma:migrate:deploy
```

Запустите приложение:

```bash
npm run start:dev
```

По умолчанию API доступен на `http://localhost:3001`, документация Swagger — на `http://localhost:3001/docs`.

### Запуск без Docker

Установите PostgreSQL отдельно, создайте пользователя и базу. Скопируйте `.env.example` в `.env` и укажите подключение к этой базе в `DATABASE_URL`.

```bash
npm ci
# Если в проекте есть миграции
npm run prisma:migrate:deploy
npm run start:dev
```

В этом режиме команды Docker не нужны. Приложение использует `DATABASE_URL`; переменные `DATABASE_USER`, `DATABASE_PASSWORD` и `DATABASE_NAME` нужны для настройки сервисов Compose.

## Запуск через Docker

Для запуска API и PostgreSQL в контейнерах нужны Docker и Docker Compose. Если `.env` ещё не создан, скопируйте `.env.example` в `.env` и настройте значения.

```bash
docker compose up -d --build
```

Compose собирает образы по `Dockerfile` и запускает сервисы в следующем порядке:

1. `postgres` запускается и проходит `healthcheck`.
2. `migrate` выполняет `npm run prisma:migrate:deploy` и завершается.
3. `api` запускается после успешного завершения `migrate`. Ошибка миграций блокирует запуск нового контейнера API.

API доступен на `http://localhost:3001`, Swagger — на `http://localhost:3001/docs`. Локальный API на этом же порту перед запуском контейнера нужно остановить.

В контейнер API передаются переменные из `.env`, но `DATABASE_URL` переопределяется в Compose: адрес базы внутри сети контейнеров — `postgres:5432`. В самом `.env` оставьте `localhost:5432` для локальной разработки. Текущая публикация портов рассчитана на `PORT=3001`; при его изменении обновите также `ports` сервиса `api`.

Dockerfile отдельно собирает NestJS и генерирует Prisma Client, затем переносит `dist` в финальный образ с production-зависимостями. Приложение запускается от пользователя `node`. `.dockerignore` исключает из контекста сборки локальные зависимости, готовую сборку и `.env`.

```bash
# Состояние сервисов, включая завершившийся migrate
docker compose ps -a

# Результат применения миграций
docker compose logs migrate

# Логи API
docker compose logs -f api

# Остановка контейнеров с сохранением базы
docker compose down
```

Данные PostgreSQL сохраняются в томе `postgres_data`. Команда `docker compose down -v` удаляет этот том вместе с данными базы. Переменные `POSTGRES_*` настраивают базу при первой инициализации пустого тома: изменение `.env` не меняет существующих пользователей и пароли.

После изменения кода повторите `docker compose up -d --build`: автоматический перезапуск при редактировании исходников в контейнере не настроен. Для локальной разработки используйте запуск только базы из раздела «Быстрый старт» и `npm run start:dev`. Если контейнер API уже работает, сначала остановите его командой `docker compose stop api`.

Сервис `migrate` использует этап `build` из Dockerfile, где установлен Prisma CLI и скопирована схема вместе с файлами миграций, если они созданы. Финальный образ API не содержит Prisma CLI. Статус `Exited (0)` у `migrate` означает успешное завершение, а не сбой.

## Миграции базы данных

В исходном шаблоне пока нет моделей и папки `prisma/migrations`. После добавления моделей в `prisma/schema.prisma` создайте миграцию локально, подключившись к базе разработки:

```bash
npm run prisma:migrate -- --name create_users
npm run prisma:generate
```

Замените `create_users` на имя вашего изменения. Сохраните схему и созданные файлы в `prisma/migrations` в Git. `prisma:generate` обновляет Prisma Client, но сама по себе эта команда не создаёт таблицы.

Для применения готовых миграций при локальном запуске используйте `npm run prisma:migrate:deploy`. При запуске всего проекта через `docker compose up -d --build` эту команду выполняет сервис `migrate`. Она применяет ещё не применённые миграции, но не создаёт новые. `db push` автоматически не выполняется.

## Переменные окружения

Пример значений находится в `.env.example`. При запуске приложение проверяет обязательные переменные и завершает работу с ошибкой, если они некорректны.

| Переменная     | Назначение                           |
| -------------- | ------------------------------------ |
| `PORT`         | Порт API; по умолчанию `3001`        |
| `DATABASE_URL` | Строка подключения к PostgreSQL      |
| `DATABASE_USER` | Пользователь PostgreSQL, создаваемый через Compose |
| `DATABASE_PASSWORD` | Пароль пользователя PostgreSQL для Compose |
| `DATABASE_NAME` | Название базы, создаваемой через Compose |
| `FRONTEND_URL` | Разрешённый адрес фронтенда для CORS |

## Ошибки валидации

Обычные HTTP-ошибки возвращают `message` строкой. Если валидация находит одну или несколько ошибок, `message` содержит массив строк.

## Структура проекта

```text
prisma/
├── schema.prisma        # схема базы данных
└── migrations/          # миграции после их создания
src/
├── common/
│   ├── config/          # проверка окружения и настройки Swagger
│   ├── filters/         # общий фильтр ошибок
│   └── interceptors/    # общий формат успешных ответов
├── prisma/              # модуль и сервис доступа к базе данных
├── app.controller.ts    # корневой контроллер
├── app.module.ts        # корневой модуль
├── app.service.ts       # корневой сервис
└── main.ts              # запуск приложения и глобальные настройки HTTP
```

Новые предметные области удобно оформлять отдельными модулями внутри `src`. DTO и связанные с модулем сервисы размещайте рядом с его контроллером. Код, используемый несколькими модулями и не относящийся к конкретной предметной области, выносите в `src/common`.

## Команды

| Команда                                        | Назначение                                           |
| ---------------------------------------------- | ---------------------------------------------------- |
| `npm run start`                                | Запуск приложения                                    |
| `npm run start:dev`                            | Запуск с перезапуском при изменениях                 |
| `npm run build`                                | Сборка в `dist`                                      |
| `npm run start:prod`                           | Запуск ранее собранного приложения                   |
| `npm run format`                               | Исправление форматирования TypeScript-файлов в `src` |
| `npm run lint`                                 | Проверка TypeScript-файлов в `src` через ESLint      |
| `npm run prisma:generate`                      | Генерация Prisma Client                              |
| `npm run prisma:migrate -- --name <имя_миграции>` | Создание и применение миграции в разработке          |
| `npm run prisma:migrate:deploy`                | Применение существующих миграций                     |

Prisma Client создаётся в `src/generated/prisma` и не хранится в Git. После изменения `prisma/schema.prisma` сгенерируйте его заново командой `npm run prisma:generate`.

Для запуска собранного приложения:

```bash
npm run build
npm run start:prod
```

## Проверки перед коммитом

При `npm ci` скрипт `prepare` подключает Husky. Во время `git commit` hook запускает `lint-staged`: Prettier форматирует подготовленные к коммиту `.ts`-файлы из `src`, затем ESLint проверяет их. Исправленное форматирование включается в коммит; ошибка ESLint останавливает коммит.

Для ручной проверки всего исходного кода без изменения файлов:

```bash
npm run lint
npx prettier --check "src/**/*.ts"
npx tsc -p tsconfig.json --noEmit --incremental false
```

## Стиль кода

Для файлов и каталогов используйте `kebab-case`, для классов — `PascalCase`, для переменных и функций — `camelCase`. Форматирование определяет Prettier, а правила качества кода — ESLint; перед коммитом они применяются к подготовленным TypeScript-файлам автоматически.

### Импорты и alias

Alias `@/` указывает на каталог `src/` и настроен через `paths` в `tsconfig.json`.

- Для соседних файлов и связей внутри одного модуля используйте относительные пути: `./` или короткие `../`.
- Для обращений к другим модулям, общему коду и сгенерированному Prisma Client используйте `@/`.
- Импорты внешних пакетов и встроенных модулей Node.js оставляйте без alias. Сгенерированный код Prisma вручную не редактируйте.

```ts
// Соседний файл внутри src/prisma
import { PrismaService } from './prisma.service';

// Другие части проекта
import type { ServiceMessageResponse } from '@/common/types/service-response.types';
import { PrismaClient } from '@/generated/prisma/client';
```

При сборке через `npm run build` Nest CLI преобразует alias в относительные пути в JavaScript. Выбор между относительным путём и alias — соглашение проекта; ESLint проверяет сортировку импортов, но не обеспечивает соблюдение этого правила.

### Остальные соглашения

В Prisma называйте модели в `PascalCase`, а их поля — в `camelCase`. Названия таблиц в PostgreSQL задавайте в `snake_case` через `@@map`.

В IDE можно включить форматирование Prettier при сохранении. Комментарии добавляйте там, где они объясняют причину решения или неочевидное поведение; очевидный код не требует пересказа.
