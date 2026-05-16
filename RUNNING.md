# Running fin-data-lab

## Quick Start

```bash
# Start API (port 8000)
uvicorn api.main:app --reload --port 8000

# Start frontend (port 8081 — or 5173 if available)
cd site && npx vite --host

# Or both together:
npm run dev   # uses concurrently
```

## Services

| Service   | URL                          | Process     |
|-----------|------------------------------|-------------|
| API       | `http://127.0.0.1:8000`      | uvicorn     |
| Frontend  | `http://127.0.0.1:8081`      | node (vite) |
| Frontend  | `http://127.0.0.1:5173`      | node (vite) |

## ⚠️ CUIDADO AO PARAR O NODE

**NUNCA use `taskkill /F /IM node.exe` ou `killall node`.** Isso mata TODOS os processos node da máquina, incluindo de outros projetos, terminais abertos, ou ferramentas em segundo plano.

Para parar apenas o servidor do fin-data-lab:

```bash
# Opção 1 — matar por PID
# Encontre o PID:
netstat -ano | findstr :5173   # ou :8081

# Mate APENAS ele:
taskkill /F /PID <PID>

# Opção 2 — se iniciou com npm run dev (concurrently), Ctrl+C no terminal
# onde rodou é suficiente — o concurrently cuida de ambos os subprocessos.
```

**Para encerrar completamente o fin-data-lab com segurança:**

```powershell
# Mata só os processos desta pasta:
Get-Process | Where-Object {
  $_.Path -like "*fin-data-lab*" -or
  $_.CommandLine -like "*fin-data-lab*"
} | Stop-Process -Force
```

Ou simplesmente feche o terminal/aba onde os servidores foram iniciados.
