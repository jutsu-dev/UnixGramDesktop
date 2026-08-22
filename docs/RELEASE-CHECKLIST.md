# Чеклист публичного релиза

## Автоматические проверки

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test:e2e -- --repeat-each=3`
- [ ] `npm run tauri:test:windows`
- [ ] `npm audit --audit-level=high`
- [ ] `gitleaks detect --no-git --source src --redact`
- [ ] `gitleaks detect --no-git --source src-tauri/src --redact`
- [ ] `semgrep scan --config auto --error src src-tauri/src`
- [ ] `trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --ignore-unfixed .`
- [ ] сформирован CycloneDX SBOM

## Windows

- [ ] чистая установка под обычным пользователем;
- [ ] запуск, вход, выход и повторный запуск;
- [ ] лента, профиль, сообщения, публикация и подарки проверены на тестовом аккаунте;
- [ ] закрытие сворачивает в трей, а пункт «Выйти» завершает процесс;
- [ ] удаление не оставляет запущенный процесс;
- [ ] установщик и основной EXE подписаны доверенным сертификатом;
- [ ] подпись проверена `signtool verify /pa /v`;
- [ ] опубликованы SHA-256 и SBOM.

## Доступность и документы

- [ ] axe не показывает critical/serious нарушений;
- [ ] все основные действия доступны клавиатурой;
- [ ] выполнена ручная проверка NVDA на Windows;
- [ ] опубликованы `LICENSE`, `PRIVACY.md`, `SECURITY.md`;
- [ ] на странице релиза явно указано, что клиент неофициальный.

Релиз нельзя помечать стабильным, пока хотя бы один пункт цифровой подписи или ручной проверки живого аккаунта не выполнен.
