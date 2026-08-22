<div align="center">
  <img src="docs/images/unixgram-official.svg" width="108" alt="Актуальный логотип UnixGram">

  # UnixGram Desktop

  ### UnixGram в отдельном приложении для Windows

  Лента, сообщения, профили, подарки и UnixPlace без лишней вкладки в браузере.

  [![Release quality](https://github.com/jutsu-dev/UnixGramDesktop/actions/workflows/release-quality.yml/badge.svg)](https://github.com/jutsu-dev/UnixGramDesktop/actions/workflows/release-quality.yml)
  ![Version](https://img.shields.io/badge/version-1.3.0-755ee8?style=flat-square)
  ![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-2778c4?style=flat-square&logo=windows11&logoColor=white)
  ![Tauri](https://img.shields.io/badge/Tauri-2-24c8db?style=flat-square&logo=tauri&logoColor=white)
  [![MIT](https://img.shields.io/badge/license-MIT-35b779?style=flat-square)](LICENSE)

  [Скачать](https://github.com/jutsu-dev/UnixGramDesktop/releases) · [Сообщить о проблеме](https://github.com/jutsu-dev/UnixGramDesktop/issues) · [Безопасность](SECURITY.md)
</div>

<br>

> [!IMPORTANT]
> Это независимый open source клиент сообщества UnixGram History. Он не является официальным приложением UnixGram.

## ✦ Живой UnixGram, отдельное окно

Клиент открывает актуальный UnixGram, сохраняет сессию средствами Windows и добавляет системный трей, темы, масштаб, Liquid Glass и Discord Rich Presence. Данные не заменяются демонстрационными карточками.

<table>
  <tr>
    <td width="46%" align="center">
      <img src="docs/images/unixgram-current-profile.png" alt="Актуальный профиль UnixGram с обложкой, статусами и публикациями">
    </td>
    <td width="54%" align="center">
      <img src="docs/images/unixgram-current-gifts.png" alt="Актуальная коллекция подарков UnixGram">
    </td>
  </tr>
  <tr>
    <td align="center"><b>Профиль, статусы и публикации</b></td>
    <td align="center"><b>Настоящие подарки из коллекции</b></td>
  </tr>
</table>

<sub>Скриншоты сняты с актуальной версии UnixGram 22 августа 2026 года.</sub>

## ✦ Что внутри

| | Возможность | Как работает |
|---|---|---|
| 📰 | Лента и профили | Публикации, фото, статусы, галочки и переходы в профили |
| 💬 | Сообщения | Диалоги, ответы, реакции, отметки прочтения и вложения |
| 🎁 | Подарки | Коллекция аккаунта, передачи, покупки, цены и рынок |
| 🔎 | Поиск | Профили, события и подарки в одном месте |
| 🎨 | Оформление | Девять тем, Liquid Glass, масштаб и компактный режим |
| 🖥️ | Windows | Системный трей, полноэкранный режим и окно поверх остальных |
| 🎮 | Discord | Rich Presence без содержимого сообщений |

## ✦ Основа клиента

<p align="center">
  <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust">
  <img src="https://img.shields.io/badge/Tauri_2-24C8DB?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri 2">
  <img src="https://img.shields.io/badge/React-15171c?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/NSIS-755EE8?style=for-the-badge&logo=windows11&logoColor=white" alt="NSIS">
</p>

## ✦ Установка

### Готовая сборка

1. Откройте раздел [Releases](https://github.com/jutsu-dev/UnixGramDesktop/releases).
2. Скачайте файл `UnixGram Desktop_*_x64-setup.exe`.
3. Запустите установщик и войдите в свой аккаунт UnixGram.

> Пока установщик не подписан доверенным сертификатом, Windows может показать предупреждение SmartScreen. Неподписанные сборки считаются тестовыми.

### Сборка из исходников

Понадобятся Node.js 22, Rust stable, WebView2 и инструменты сборки Visual Studio для C++.

```powershell
git clone https://github.com/jutsu-dev/UnixGramDesktop.git
cd UnixGramDesktop
npm ci
npm run tauri:build:windows
```

Установщик появится в `src-tauri/target/release/bundle/nsis/`.

## ✦ Вход и данные

Доступны вход по паролю, подтверждение в браузере и QR-код. Пароль не сохраняется. Cookie сессии хранится в Windows Credential Manager, а запросы идут напрямую к `https://unixgram.com` по HTTPS.

Discord Rich Presence выключен по умолчанию. Он не получает тексты сообщений, имена собеседников и содержимое профиля.

Подробнее: [конфиденциальность](PRIVACY.md) и [модель безопасности](SECURITY.md).

## ✦ Проверки

```powershell
npm run lint
npm run build
npm run test:e2e
npm run tauri:check:windows
npm run tauri:test:windows
```

Для релизов также запускаются Gitleaks, Trivy, Semgrep и аудит npm. В репозитории хранится [CycloneDX SBOM](sbom.cdx.json). Полный список проверок находится в [релизном чеклисте](docs/RELEASE-CHECKLIST.md).

## ✦ Статус

Версия 1.3.0 является release candidate. Основные сценарии и установщик собраны, но стабильный публичный релиз требует цифровой подписи Windows и финальной проверки на чистой системе.

Клиент зависит от web-интерфейсов UnixGram. Если сервис недоступен или изменит формат ответа, отдельные разделы могут временно перестать работать.

## ✦ Лицензия и проект

UnixGram Desktop развивается командой UnixGram History и участниками сообщества. Это независимый проект. Он не является официальным клиентом и не связан с создателями UnixGram.

Код распространяется по лицензии [MIT](LICENSE). Можно использовать, изучать, изменять и собирать собственные версии при сохранении текста лицензии.

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/Открыть_лицензию-MIT-35B779?style=for-the-badge" alt="Открыть лицензию MIT"></a>
  <a href="PRIVACY.md"><img src="https://img.shields.io/badge/Конфиденциальность-15171C?style=for-the-badge" alt="Политика конфиденциальности"></a>
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/Безопасность-755EE8?style=for-the-badge" alt="Правила безопасности"></a>
</p>

<p align="center"><sub>Сделано сообществом UnixGram History.</sub></p>
