# Лицензии

Лицензия каждого файла записана в [REUSE.toml](../REUSE.toml) по спецификации [REUSE 3.3](https://reuse.software/spec-3.3/). Заголовки внутри файлов не учитываются. Запись проверяет задача `reuse` в CI.

| Часть репозитория | Лицензия | Файл |
| --- | --- | --- |
| Исходный код, конфигурация, скрипты, тесты, lock-файлы, сгенерированные схемы | MIT | [LICENSE](../LICENSE), [LICENSES/MIT.txt](../LICENSES/MIT.txt) |
| Документация, графика README (`docs/images/readme/`), снимки окна настроек, обложка, графика установщика, `assets/app-icon.svg` | CC BY 4.0 | [LICENSES/CC-BY-4.0.txt](../LICENSES/CC-BY-4.0.txt) |
| Логотип UnixGram, значки приложения с ним, снимки сайта UnixGram | проект прав не даёт | [LICENSES/LicenseRef-UnixGram-Third-Party.txt](../LICENSES/LicenseRef-UnixGram-Third-Party.txt) |
| Библиотеки в составе сборки | своя у каждой | [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md) |

Краткая сводка на английском — в [NOTICE](../NOTICE). UnixGram Desktop — неофициальный клиент; правила для названия и логотипа UnixGram — в [TRADEMARKS.md](../TRADEMARKS.md).

## Как использовать

- Код: сохраните строку `Copyright (c) 2026 UnixGram History contributors` и текст лицензии MIT.
- Документация и графика проекта: укажите авторов («UnixGram History contributors»), дайте ссылку на репозиторий и на лицензию, отметьте свои изменения.
- Кодекс поведения: [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) — текст Contributor Covenant 2.1 под CC BY 4.0. Проект заполнил в нём только строку с контактами, поэтому указывайте авторов Contributor Covenant.
- Логотип и снимки сайта UnixGram: разрешение спрашивайте у их владельцев.

## Сторонние библиотеки

[THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md) строит скрипт `scripts/third-party-notices.mjs`. Пакеты Rust он берёт из `cargo metadata` для цели `x86_64-pc-windows-msvc`, пакеты npm — из `dependencies` в `package.json` и их зависимостей в `node_modules`.

```powershell
npm run licenses:notices
```

Запускайте после каждого изменения зависимостей. Команда `node scripts/third-party-notices.mjs --check` ничего не записывает и завершается с ошибкой, если файл устарел. Её запускает задача `web` в CI.

В файле только названия, версии и лицензии пакетов. Текстов лицензий и строк об авторских правах в нём нет.

## Новый файл

Код и документация попадают под шаблоны первых двух блоков `REUSE.toml`. Файл с логотипом или содержимым сайта UnixGram добавьте по пути в третий блок. Файл вне шаблонов задача `reuse` не пропустит.
