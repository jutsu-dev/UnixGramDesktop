<div align="center">
  <img src="docs/images/unixgram-official.svg" width="112" alt="Логотип UnixGram">

  # UnixGram Desktop

  **Знакомый UnixGram в отдельном приложении для Windows**

  Без нового интерфейса и переучивания. Внутри открывается актуальный сайт UnixGram, а клиент добавляет окно приложения, системный трей, темы, масштаб и Discord Rich Presence.

  [![Release quality](https://github.com/jutsu-dev/UnixGramDesktop/actions/workflows/release-quality.yml/badge.svg)](https://github.com/jutsu-dev/UnixGramDesktop/actions/workflows/release-quality.yml)
  [![Latest release](https://img.shields.io/badge/release-v1.3.0-755ee8?style=flat-square)](https://github.com/jutsu-dev/UnixGramDesktop/releases/latest)
  ![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-2778c4?style=flat-square&logo=windows11&logoColor=white)
  [![MIT](https://img.shields.io/badge/license-MIT-35b779?style=flat-square)](LICENSE)

  [Скачать](https://github.com/jutsu-dev/UnixGramDesktop/releases/latest) · [Telegram](https://t.me/unixgramhistory) · [Бот](https://t.me/UnixGramHistoryBot) · [UnixGram](https://unixgram.com/u/basaltes)
</div>

> [!IMPORTANT]
> UnixGram Desktop создан сообществом UnixGram History. Это независимый open source проект, неофициальный клиент и не представитель команды UnixGram.

> [!WARNING]
> Установщик пока не подписан платным сертификатом. Windows может показать окно «Система Windows защитила компьютер» и издателя «Неизвестный». Это не ошибка установки. Скачивайте файл только из [официальных Releases](https://github.com/jutsu-dev/UnixGramDesktop/releases), сверяйте SHA-256 и при желании собирайте приложение из открытого исходного кода. [Подробная инструкция](docs/INSTALL-WINDOWS.md).

## Приложение

<p align="center">
  <img src="docs/images/app-main.png" alt="UnixGram, запущенный в UnixGram Desktop">
</p>

<p align="center">
  <img src="docs/images/app-discord.png" width="760" alt="Настройки UnixGram Desktop: окно, темы и Discord Rich Presence">
  <br><b>Настройки клиента и Discord Rich Presence</b>
</p>

Снимки сделаны из Windows-приложения. Основной экран намеренно повторяет сайт: мы не заменяем дизайн UnixGram собственным интерфейсом.

## Что добавляет клиент

| Возможность | Что получает пользователь |
|---|---|
| Официальный интерфейс | Актуальный сайт UnixGram без самодельной копии |
| Отдельное окно | UnixGram не теряется среди вкладок браузера |
| Системный трей | Быстрое открытие ленты, сообщений, UnixPlace и настроек |
| Сохранение входа | Сессия остаётся в защищённом профиле WebView2 |
| Темы | UnixGram, Midnight, OLED, Graphite, Aurora, Daylight, Lucifer, basaltes и Soft Honey |
| Настройки окна | Масштаб, полный экран, режим поверх окон и компактные чаты |
| Discord Rich Presence | Показывает использование UnixGram без текстов сообщений и личных данных |
| Автовосстановление Discord | Клиент переподключается, если Discord был запущен позже |

## Установка

1. Откройте [последний релиз](https://github.com/jutsu-dev/UnixGramDesktop/releases/latest).
2. Скачайте `UnixGram.Desktop_1.3.0_x64-setup.exe`.
3. Сверьте SHA-256 с контрольной суммой в описании релиза.
4. Запустите установщик.
5. Если SmartScreen покажет предупреждение, прочитайте [инструкцию](docs/INSTALL-WINDOWS.md).

Пароль от UnixGram не хранится в репозитории и не отправляется команде UnixGram History. Авторизация происходит внутри UnixGram.

## Сборка из исходников

Понадобятся Node.js 22, Rust stable, WebView2 и Visual Studio Build Tools с компонентами C++.

```powershell
git clone https://github.com/jutsu-dev/UnixGramDesktop.git
cd UnixGramDesktop
npm ci
npm run tauri:build:windows
```

Готовый NSIS-установщик появится в `src-tauri/target/release/bundle/nsis/`.

## О проекте

UnixGram History начинался как Telegram-бот с историей профилей, подарков и рынка. Desktop-клиент стал следующим шагом: оставить привычный UnixGram, но дать ему удобное место на Windows и добавить функции, которых не хватает обычной вкладке браузера.

Мы не просим верить сборке на слово. Исходный код открыт, изменения проходят автоматические проверки, а к каждому неподписанному релизу прикладывается SHA-256.

### Наши ссылки

- [канал UnixGram History](https://t.me/unixgramhistory)
- [бот UnixGram History](https://t.me/UnixGramHistoryBot)
- [профиль проекта в UnixGram](https://unixgram.com/u/basaltes)
- [ошибки и предложения](https://github.com/jutsu-dev/UnixGramDesktop/issues)
- [правила безопасности](SECURITY.md)

## Проверки релиза

```powershell
npm run lint
npm run build
npm run test:e2e
npm run tauri:test:windows
npm run tauri:build:windows
```

GitHub Actions дополнительно запускает npm audit, Gitleaks и Trivy. В репозитории находится [CycloneDX SBOM](sbom.cdx.json).

## Лицензия

Проект распространяется по [MIT License](LICENSE). Лицензия разрешает использовать, изучать, изменять, собирать и распространять код, в том числе в коммерческих проектах, при сохранении текста лицензии и уведомления об авторских правах.

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/Открыть_лицензию-MIT-35B779?style=for-the-badge" alt="MIT License"></a>
  <a href="PRIVACY.md"><img src="https://img.shields.io/badge/Конфиденциальность-15171C?style=for-the-badge" alt="Политика конфиденциальности"></a>
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/Безопасность-755EE8?style=for-the-badge" alt="Политика безопасности"></a>
</p>

<div align="center"><sub>Сделано сообществом UnixGram History для пользователей UnixGram.</sub></div>
