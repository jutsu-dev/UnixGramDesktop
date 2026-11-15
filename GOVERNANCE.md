# Управление проектом

> [!NOTE]
> UnixGram Desktop — неофициальный клиент сообщества, с командой UnixGram не связан.

## Кто ведёт проект

Проект ведёт сообщество UnixGram History. Сопровождающий один: владелец репозитория [jutsu-dev](https://github.com/jutsu-dev). Он же указан владельцем кода в [.github/CODEOWNERS](.github/CODEOWNERS).

Правообладатель в [LICENSE](LICENSE) — «UnixGram History contributors». Условия для вклада: [CONTRIBUTING.md](CONTRIBUTING.md#лицензия).

## Решения

- Сопровождающий вносит изменения в `main` сам.
- Изменения других участников приходят запросами на слияние в `main`. Порядок описан в [CONTRIBUTING.md](CONTRIBUTING.md).
- Каждый запрос проходит workflow [Release quality](.github/workflows/release-quality.yml).
- Принимает или отклоняет запрос сопровождающий.
- Переход на новую основную версию зависимости сначала обсуждается в отдельной задаче.
- Отчёты об уязвимостях разбирает сопровождающий по [SECURITY.md](SECURITY.md).
- Жалобы на поведение разбирает сопровождающий по [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Выпуски

- Выпуск готовит сопровождающий из `main` по [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md). Номер версии меняет только он.
- Версия получает тег `vX.Y.Z`. Установщик и `SHA256SUMS.txt` публикуются в [GitHub Releases](https://github.com/jutsu-dev/UnixGramDesktop/releases).
- Исправления выходят только для последней опубликованной версии.
- Изменения записываются в [CHANGELOG.md](CHANGELOG.md), заметки о выпусках лежат в [docs/releases/](docs/releases/).
