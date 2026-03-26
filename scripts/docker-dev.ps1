$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot\..
docker compose -f docker-compose.dev.yml up --build
