$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot\..
docker compose up --build
