<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/readme/hero-dark.svg">
    <img alt="UnixGram Desktop: неофициальный клиент для Windows 10 и 11" src="docs/images/readme/hero-light.svg" width="100%">
  </picture>
</p>

<p align="center">Клиент соцсети UnixGram для Windows: сайт в отдельном окне, трей, темы и несколько аккаунтов.</p>

<p align="center">
  <a href="https://github.com/jutsu-dev/UnixGramDesktop/releases/latest"><img alt="Скачать для Windows" src="docs/images/readme/download.svg" width="290"></a>
</p>

<p align="center">
  <a href="https://github.com/jutsu-dev/UnixGramDesktop/releases/latest"><img alt="Последний выпуск" src="https://img.shields.io/github/v/release/jutsu-dev/UnixGramDesktop?display_name=tag&label=release"></a>
  <a href="#лицензии"><img alt="Лицензии: MIT и CC BY 4.0" src="https://img.shields.io/badge/license-MIT%20%2B%20CC%20BY%204.0-blue"></a>
  <a href="https://github.com/jutsu-dev/UnixGramDesktop/actions/workflows/release-quality.yml"><img alt="Проверки" src="https://github.com/jutsu-dev/UnixGramDesktop/actions/workflows/release-quality.yml/badge.svg?branch=main"></a>
  <a href="docs/INSTALL-WINDOWS.md"><img alt="Windows 10 и 11, x64" src="https://img.shields.io/badge/Windows-10%20%7C%2011%20x64-0078D4"></a>
</p>

<p align="center">
  <a href="docs/INSTALL-WINDOWS.md">Установка</a>
  ·
  <a href="CHANGELOG.md">История изменений</a>
  ·
  <a href="SUPPORT.md">Помощь</a>
</p>

> [!NOTE]
> Клиент неофициальный. Его делает сообщество UnixGram History, с командой UnixGram проект не связан.

<p align="center">
  <img alt="Лента UnixGram в окне UnixGram Desktop" src="docs/images/app-main.png" width="100%">
</p>

<table>
  <tr>
    <td align="center"><img alt="Настройки, тема Mexican Pink" src="docs/images/settings-mexican-pink-1.3.4.png" width="270"><br><sub>Mexican Pink</sub></td>
    <td align="center"><img alt="Настройки, тема Daylight" src="docs/images/settings-daylight-1.3.3.png" width="270"><br><sub>Daylight</sub></td>
    <td align="center"><img alt="Настройки, тема Lucifer" src="docs/images/settings-lucifer-1.3.3.png" width="270"><br><sub>Lucifer</sub></td>
  </tr>
</table>

<p align="center">
  <img alt="13 тем: UnixGram, Midnight, OLED, Graphite, Aurora, Daylight, Lucifer, by basaltes, Soft Honey, Ocean, Rose, Forest, Mexican Pink" src="docs/images/readme/palette.svg" width="100%">
</p>

## Возможности

<p align="center">
  <img alt="Возможности: темы, аккаунты, трей, горячие клавиши, окна, уведомления, чтение, масштаб, Discord" src="docs/images/readme/bento.svg" width="100%">
</p>

<details>
<summary>То же списком</summary>

| Возможность | Описание |
| --- | --- |
| Темы | 13 тем: UnixGram, Midnight, OLED, Graphite, Aurora, Daylight, Lucifer, by basaltes, Soft Honey, Ocean, Rose, Forest, Mexican Pink. Режим Liquid Glass. |
| Аккаунты | До трёх, у каждого свой профиль WebView2. |
| Трей | Быстрые переходы и счётчик непрочитанных чатов на значке. |
| Горячие клавиши | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>1…4</kbd> и <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>U/M/G/S</kbd>, работают глобально. |
| Окна | UnixGram и UnixPlace в окнах WebView2. Закрытие окна сворачивает приложение в трей. |
| Уведомления | Число непрочитанных, загрузка файла, восстановление связи. Без текста сообщений и имён. |
| Чтение | Размер текста в чатах, меньше анимаций, плавная прокрутка, подчёркивание ссылок. |
| Окно | Полный экран, «поверх остальных окон», масштаб 80–140 %. |
| Discord | Статус Rich Presence, по желанию с названием раздела. Отключается. |

</details>

Ленту, сообщения, профили и подарки отдаёт сайт UnixGram. Если сайт недоступен или его разметка изменилась, клиент может работать с ошибками.

## Установка

1. Скачайте `UnixGram-Desktop-<версия>-x64-setup.exe` и `SHA256SUMS.txt` со страницы [последнего выпуска](https://github.com/jutsu-dev/UnixGramDesktop/releases/latest).
2. Сверьте контрольную сумму со строкой из `SHA256SUMS.txt`:

   ```powershell
   Get-FileHash -Algorithm SHA256 ".\UnixGram-Desktop-1.3.4-x64-setup.exe"
   ```

3. Запустите установщик. Он ставит приложение для текущего пользователя.

> [!WARNING]
> Установщик не подписан, поэтому Windows покажет предупреждение SmartScreen. Скачивайте его только из [GitHub Releases](https://github.com/jutsu-dev/UnixGramDesktop/releases).

Подробности: [docs/INSTALL-WINDOWS.md](docs/INSTALL-WINDOWS.md).

## Сборка из исходного кода

Нужны Windows 10 или 11, [Node.js](https://nodejs.org/) 22, [Rust](https://www.rust-lang.org/tools/install) stable (MSVC), WebView2 Runtime и Visual Studio Build Tools с нагрузкой «Разработка классических приложений на C++».

```powershell
git clone https://github.com/jutsu-dev/UnixGramDesktop.git
cd UnixGramDesktop
npm ci
npm run tauri:build:windows   # установщик в src-tauri\target\release\bundle\nsis
npm run tauri:dev             # запуск для разработки
```

Проверки: `npm run lint`, `npm run typecheck`, `npm run test:e2e`, `npm run tauri:check:windows`, `npm run tauri:test:windows`. Остальные сценарии перечислены в `package.json`.

## Безопасность и конфиденциальность

- Вход идёт на сайте UnixGram внутри WebView2. Пароль приложение не видит и не хранит.
- Сессии лежат в профилях WebView2, у каждого аккаунта свой каталог.
- Нативные команды доступны только локальному окну настроек. Страницы сайта их вызвать не могут.
- В приложении открываются только `unixgram.com`, `www.unixgram.com` и `place.unixgram.com` по HTTPS. Остальные ссылки уходят в системный браузер после подтверждения.
- Своего сервера у проекта нет, телеметрии нет.

Подробнее: [SECURITY.md](SECURITY.md), [PRIVACY.md](PRIVACY.md).

## Архитектура

<p align="center">
  <a href="docs/ARCHITECTURE.md">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/images/readme/blueprint-dark.svg">
      <img alt="Чертёж устройства: нативный процесс на Rust с модулями, окна WebView2 для unixgram.com и UnixPlace без доступа к IPC, окно настроек с доступом к командам" src="docs/images/readme/blueprint-light.svg" width="100%">
    </picture>
  </a>
</p>

Нативный процесс на Rust (Tauri 2) держит окна WebView2: окна аккаунтов загружают `https://unixgram.com`, окна UnixPlace — `https://place.unixgram.com`, окно настроек — локальную страницу на React. Процесс внедряет в страницы сайта CSS темы и сценарий счётчика непрочитанных, управляет треем, горячими клавишами и статусом Discord.

Полное описание: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Лицензии

<p align="center">
  <a href="LICENSE"><img alt="MIT: исходный код" src="docs/images/readme/license-mit.svg" width="23%"></a>
  <a href="LICENSES/CC-BY-4.0.txt"><img alt="CC BY 4.0: документация и графика" src="docs/images/readme/license-cc-by.svg" width="23%"></a>
  <a href="TRADEMARKS.md"><img alt="Знаки: имя и логотип UnixGram" src="docs/images/readme/license-marks.svg" width="23%"></a>
  <a href="THIRD-PARTY-NOTICES.md"><img alt="Сторонние компоненты и их лицензии" src="docs/images/readme/license-third-party.svg" width="23%"></a>
</p>

<div align="center">

| Что | Условия | Файл |
| :--- | :--- | :--- |
| Исходный код | MIT | [LICENSE](LICENSE) |
| Документация и собственная графика проекта | CC BY 4.0 | [LICENSES/CC-BY-4.0.txt](LICENSES/CC-BY-4.0.txt) |
| Имя и логотип UnixGram, сайт на снимках экрана | Не лицензируются | [TRADEMARKS.md](TRADEMARKS.md) |
| Сторонние компоненты | У каждого своя лицензия | [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) |

</div>

Машиночитаемая карта лицензий лежит в [REUSE.toml](REUSE.toml), тексты — в [LICENSES/](LICENSES). Обзор: [docs/LICENSING.md](docs/LICENSING.md) и [NOTICE](NOTICE).

## Участие в разработке

Порядок работы и обязательные проверки описаны в [CONTRIBUTING.md](CONTRIBUTING.md), правила общения — в [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Ошибки и предложения — в [Issues](https://github.com/jutsu-dev/UnixGramDesktop/issues/new/choose), остальные вопросы — по [SUPPORT.md](SUPPORT.md). Кто ведёт проект и как выходят выпуски — в [GOVERNANCE.md](GOVERNANCE.md). Об уязвимостях пишите приватно по [SECURITY.md](SECURITY.md). Новости выходят в [Telegram-канале UnixGram History](https://t.me/unixgramhistory).

<p align="center">
  <picture><img alt="" src="docs/images/readme/rule.svg" width="100%"></picture>
</p>
