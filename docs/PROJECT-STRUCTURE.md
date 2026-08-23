# Структура проекта

```text
unixgram-desktop/
├── src/                    интерфейс React и настройки клиента
│   ├── assets/             ресурсы интерфейса
│   └── stories/            компоненты и сценарии Storybook
├── src-tauri/              Windows-оболочка Tauri и Rust-код
│   ├── capabilities/       разрешения приложения
│   ├── icons/              иконки сборок
│   ├── installer/          оформление установщика
│   └── src/                команды, сессия, трей и Discord RPC
├── tests/e2e/              пользовательские и визуальные тесты
├── public/                 публичные ресурсы Vite
├── scripts/                команды проверки и Windows-сборки
├── docs/                   документация, релизы, SBOM и изображения README
├── artifacts/              локальные результаты, не попадают в Git
│   ├── releases/           готовые установщики и контрольные суммы
│   ├── screenshots/        макеты и снимки проверок
│   └── security/           локальные отчёты сканеров и SBOM
├── .github/workflows/      автоматические проверки GitHub Actions
├── package.json            команды веб-части и Tauri
└── README.md               главная страница проекта
```

## Частые команды

```powershell
npm install
npm run tauri:dev
npm run lint
npm run test:e2e
npm run tauri:test:windows
npm run tauri:build:windows
```

Готовый Windows-установщик после сборки появляется в
`src-tauri/target/release/bundle/nsis`. Копия для передачи тестерам хранится
локально в `artifacts/releases/current`.
