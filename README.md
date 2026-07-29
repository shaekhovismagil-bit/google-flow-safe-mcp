В разработке

# Google Flow Safe MCP

Безопасный MCP-сервер для Google Flow. Он открывает отдельный Chrome для Flow,
подключается к нему только локально и сохраняет готовые видео на вашем компьютере.

## Что делает проект

- Открывает отдельный Chrome для Google Flow одной командой.
- Один раз попросит войти в Google. Потом вход сохранится в отдельном профиле.
- Работает с Google Flow и скачивает готовое MP4 в `outputs/videos/`.
- Подходит для Codex, Claude Desktop, Cursor и других MCP-клиентов по stdio.

Ваш обычный Chrome не трогается. Для Flow создаётся отдельный профиль в:

```text
%LOCALAPPDATA%\GoogleFlowSafeMCP\chrome-profile
```

Этот проект не копирует и не читает ваш основной Chrome-профиль, cookies, пароли,
токены, `Cookies`, `Login Data` или `Local State`.

## Самый простой запуск

Требуется Node.js 20+ и установленный Google Chrome.

```powershell
git clone https://github.com/shaekhovismagil-bit/google-flow-safe-mcp.git
cd google-flow-safe-mcp
npm ci
npm start
```

После `npm start` автоматически откроется отдельное окно Chrome со страницей Google
Flow. Войдите в Google только при первом запуске. В следующий раз достаточно снова
выполнить `npm start`.

Не нужно вручную вводить длинную команду запуска Chrome и не нужно каждый раз
создавать новый профиль.

## Подключение к MCP-клиенту

Это делается один раз в настройках выбранного MCP-клиента. Добавьте команду:

```text
node "ПОЛНЫЙ_ПУТЬ_К_ПАПКЕ\google-flow-safe-mcp\src\index.js"
```

Когда MCP-клиент запустит эту команду, Chrome для Flow откроется автоматически.
Проект не изменяет настройки Codex, Claude Desktop, Cursor или другого клиента сам.

## Универсальный prompt для ИИ-агента

Скопируйте этот текст в новый чат с любым ИИ-агентом:

```text
Установи Google Flow Safe MCP из репозитория:
https://github.com/shaekhovismagil-bit/google-flow-safe-mcp

Работай в новой пустой папке. Сначала прочитай README. Клонируй репозиторий,
выполни npm ci, npm test, npm run lint и npm audit. Затем запусти npm start.
Chrome для Google Flow должен открыться автоматически в отдельном профиле.

Не используй мой основной Chrome-профиль и не читай/копируй Cookies, Login Data,
Local State, пароли, токены или сессии. Не меняй настройки моего MCP-клиента без
моего явного разрешения. Любое действие, которое расходует кредиты Google Flow,
выполняй только после моего явного подтверждения.
```

## Безопасность

- CDP доступен только на `127.0.0.1`.
- Разрешены только `https://labs.google/*`.
- Нет stealth, anti-detection, обхода CAPTCHA или загрузки локальных файлов.
- `flow_generate_video` не расходует кредиты без `confirm: true`.
- Логи не содержат полный prompt, cookies или URL с токенами.
- `flow_disconnect` отключает MCP от Chrome и не удаляет пользовательские данные.

## Инструменты MCP

- `flow_connect` — подключиться к открытому локальному Chrome.
- `flow_status` — показать состояние браузера и генерации.
- `flow_generate_video` — заполнить параметры; генерация только с `confirm: true`.
- `flow_wait_for_video` — ждать готовый ролик.
- `flow_download_video` — сохранить MP4 и вернуть путь, `file://`, размер и MIME.
- `flow_disconnect` — отключиться от CDP.

## Проверка проекта

```powershell
npm test
npm run lint
npm audit
```
