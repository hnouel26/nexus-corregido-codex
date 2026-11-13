param([switch]$Arrancar)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
function Invoke-Checked {
    param([scriptblock]$Action)
    & $Action
    if ($LASTEXITCODE -ne 0) { throw "Falló el paso anterior (código $LASTEXITCODE)." }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Instala Node.js LTS desde https://nodejs.org/en/download y vuelve a ejecutar este script.'
}
$nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 20) { throw 'Se requiere Node.js 20 o posterior; se recomienda Node.js 22 LTS.' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    foreach ($candidate in @((Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin'),'C:\Program Files\Docker\Docker\resources\bin','D:\Program Files\Docker\Docker\resources\bin')) {
        if (Test-Path -LiteralPath (Join-Path $candidate 'docker.exe')) { $env:PATH = "$candidate;$env:PATH"; break }
    }
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Instala y abre Docker Desktop desde https://docs.docker.com/desktop/setup/install/windows-install/ y vuelve a ejecutar este script.'
}
Invoke-Checked { docker info --format '{{.ServerVersion}}' }
# Install pnpm locally; no administrator privileges or global npm changes.
$tools = Join-Path (Get-Location) '.tools'
$pnpmCli = Join-Path $tools 'node_modules/pnpm/bin/pnpm.cjs'
if (-not (Test-Path -LiteralPath $pnpmCli)) {
    Invoke-Checked { npm.cmd install --prefix $tools pnpm@9.15.9 --no-audit --no-fund }
}
$env:PATH = "$(Join-Path $tools 'node_modules/.bin');$env:PATH"
Invoke-Checked { node $pnpmCli install --frozen-lockfile }
Invoke-Checked { node scripts/setup.mjs }
Invoke-Checked { node $pnpmCli db:generate }
Invoke-Checked { docker compose -f docker-compose.dev.yml up -d --wait }
Invoke-Checked { node $pnpmCli db:push }
Invoke-Checked { node $pnpmCli db:seed }
Write-Host 'Preparación terminada. Credenciales: SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env.'
if ($Arrancar) { Invoke-Checked { node $pnpmCli dev } }
else { Write-Host 'Para arrancar: .\scripts\Preparar-Nexus.ps1 -Arrancar' }
