<p align="center">
  <img src="docs/images/github-hero.png" width="100%" alt="Фирменная обложка UnixGram Desktop">
</p>

<p align="center">
  <img src="docs/images/unixgram-official.svg" width="96" alt="UnixGram">
</p>

<h1 align="center">UnixGram Desktop</h1>

<p align="center">
  <strong>Знакомый UnixGram в отдельном приложении для Windows.</strong><br>
  Лента, сообщения, профили, подарки и UnixPlace без лишней вкладки в браузере.
</p>

<p align="center">
  <a href="https://github.com/jutsu-dev/UnixGramDesktop/releases/latest"><img src="https://img.shields.io/github/v/release/jutsu-dev/UnixGramDesktop?display_name=tag&style=for-the-badge&color=7257E8&label=скачать" alt="Последний релиз"></a>
  <a href="https://github.com/jutsu-dev/UnixGramDesktop/actions/workflows/release-quality.yml"><img src="https://img.shields.io/github/actions/workflow/status/jutsu-dev/UnixGramDesktop/release-quality.yml?branch=main&style=for-the-badge&label=проверки&color=27A96B" alt="Статус проверок"></a>
  <img src="https://img.shields.io/badge/Windows-10%20%7C%2011-1976D2?style=for-the-badge&logo=windows11&logoColor=white" alt="Windows 10 и 11">
</p>

<p align="center">
  <a href="https://github.com/jutsu-dev/UnixGramDesktop/releases/latest"><strong>Скачать</strong></a>
  · <a href="docs/INSTALL-WINDOWS.md">Установка</a>
  · <a href="https://t.me/unixgramhistory">Новости</a>
  · <a href="https://t.me/UnixGramHistoryBot">Бот</a>
  · <a href="https://github.com/jutsu-dev/UnixGramDesktop/issues/new/choose">Сообщить о проблеме</a>
</p>

> [!NOTE]
> UnixGram Desktop создан сообществом UnixGram History. Это независимый open source проект, неофициальный клиент и не представитель команды UnixGram.

## UnixGram остаётся UnixGram

Приложение открывает актуальный UnixGram, а не рисует его копию. Профили, лента, сообщения и подарки загружаются с самого сервиса. Desktop-слой добавляет окно Windows, системный трей, темы, масштаб, горячие клавиши и Discord Rich Presence.

<a href="docs/images/app-main.png">
  <img src="docs/images/app-main.png" alt="Лента UnixGram в окне UnixGram Desktop">
</a>

<p align="center"><sub>Реальный экран приложения. Нажмите на снимок, чтобы открыть его полностью.</sub></p>

## Главное без лишнего

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>Отдельное окно</h3>
      UnixGram не теряется среди вкладок. Лента, сообщения и UnixPlace открываются из одного приложения.
    </td>
    <td width="50%" valign="top">
      <h3>Системный трей</h3>
      Быстрые переходы, счётчик непрочитанных и работа в фоне рядом с часами Windows.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>Настройка под себя</h3>
      Девять тем, масштаб, компактные чаты, полный экран, окно поверх остальных и Liquid Glass.
    </td>
    <td width="50%" valign="top">
      <h3>Discord Rich Presence</h3>
      Показывает использование UnixGram и выбранный раздел. Сообщения, имена и личные данные не передаются.
    </td>
  </tr>
</table>

<details>
  <summary><strong>Посмотреть настройки клиента</strong></summary>
  <br>
  <a href="docs/images/app-discord.png"><img src="docs/images/app-discord.png" width="760" alt="Настройки UnixGram Desktop и Discord Rich Presence"></a>
</details>

## Установить за минуту

1. Откройте [последний релиз](https://github.com/jutsu-dev/UnixGramDesktop/releases/latest).
2. Скачайте файл `UnixGram.Desktop_1.3.0_x64-setup.exe`.
3. Сверьте SHA-256 с файлом `SHA256SUMS.txt` в том же релизе.
4. Запустите установщик.

<p align="center">
  <a href="https://github.com/jutsu-dev/UnixGramDesktop/releases/latest"><img src="https://img.shields.io/badge/Скачать_для_Windows-7257E8?style=for-the-badge&logo=windows11&logoColor=white" alt="Скачать UnixGram Desktop для Windows"></a>
</p>

> [!WARNING]
> Установщик пока не подписан коммерческим Code Signing сертификатом. Windows может показать SmartScreen и издателя «Неизвестный». Скачивайте приложение только из [GitHub Releases](https://github.com/jutsu-dev/UnixGramDesktop/releases) и проверяйте контрольную сумму. Пошаговая инструкция: [INSTALL-WINDOWS.md](docs/INSTALL-WINDOWS.md).

### Проверка SHA-256

```powershell
Get-FileHash -Algorithm SHA256 ".\UnixGram.Desktop_1.3.0_x64-setup.exe"
```

Полученная строка должна полностью совпасть с суммой из `SHA256SUMS.txt`.

## Что готовится в 1.3.1

Код следующего обновления уже находится в `main`, но установщик ещё не опубликован как стабильный релиз.

- до трёх изолированных аккаунтов с переключением и удалением локальной сессии;
- счётчик непрочитанных в трее и приватные уведомления Windows;
- автоматическое восстановление соединения и Discord RPC;
- центр безопасности с состоянием сессий, сети и разрешённых ссылок;
- глобальные сочетания `Ctrl+Shift+1…4` и запасные `Ctrl+Alt+U/M/G/S`;
- исправления QR-входа, UnixPlace, переходов из достижений и привязки бота.

Следить за ходом работы можно в [истории изменений](https://github.com/jutsu-dev/UnixGramDesktop/commits/main) и [проверках сборки](https://github.com/jutsu-dev/UnixGramDesktop/actions/workflows/release-quality.yml).

## Приватность и безопасность

| Принцип | Как это устроено |
| --- | --- |
| Пароль | Используется только для входа и не сохраняется приложением |
| Сессия | Хранится локально средствами Windows и в изолированном профиле WebView2 |
| Сеть | Клиент разрешает переходы только на HTTPS-хосты UnixGram и UnixPlace |
| Discord | Rich Presence выключен по умолчанию и не показывает содержимое аккаунта |
| Уведомления | Без текста сообщений, имён и превью личных данных |
| Публичная сборка | Проверяется CI, npm audit, Gitleaks, Trivy, Rust-тестами и Playwright |

Подробнее: [политика безопасности](SECURITY.md), [конфиденциальность](PRIVACY.md), [CycloneDX SBOM](docs/security/sbom.cdx.json).

## Для разработчиков

Понадобятся Node.js 22, Rust stable, WebView2 и Visual Studio Build Tools с компонентами C++.

```powershell
git clone https://github.com/jutsu-dev/UnixGramDesktop.git
cd UnixGramDesktop
npm ci
npm run tauri:build:windows
```

Основные команды:

```powershell
npm run lint
npm run build
npm run test:e2e
npm run tauri:test:windows
```

[Карта проекта](docs/PROJECT-STRUCTURE.md) · [чек-лист релиза](docs/RELEASE-CHECKLIST.md) · [визуальная система](docs/brand/VISUAL-PHILOSOPHY.md) · [как помочь](CONTRIBUTING.md)

<p>
  <img src="https://img.shields.io/badge/Tauri_2-24C8D8?style=flat-square&logo=tauri&logoColor=white" alt="Tauri 2">
  <img src="https://img.shields.io/badge/Rust-111111?style=flat-square&logo=rust&logoColor=white" alt="Rust">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React 19">
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white" alt="Playwright">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-27A96B?style=flat-square" alt="MIT License"></a>
</p>

## Сообщество

| | Ссылка |
| --- | --- |
| Новости и релизы | [t.me/unixgramhistory](https://t.me/unixgramhistory) |
| UnixGram History Bot | [@UnixGramHistoryBot](https://t.me/UnixGramHistoryBot) |
| Профиль автора в UnixGram | [@basaltes](https://unixgram.com/u/basaltes) |
| Ошибка или идея | [GitHub Issues](https://github.com/jutsu-dev/UnixGramDesktop/issues/new/choose) |
| Уязвимость | [SECURITY.md](SECURITY.md) |

## Лицензия

Проект распространяется по [MIT License](LICENSE). Код можно использовать, изучать, изменять и распространять при сохранении текста лицензии и уведомления об авторских правах.

<p align="center">
  <img src="docs/images/unixgram-official.svg" width="52" alt="UnixGram"><br><br>
  <strong>UnixGram History</strong><br>
  <sub>Сделано сообществом для пользователей UnixGram.</sub>
</p>
