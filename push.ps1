# ============================================================
#  TayaranDZ — One-Click GitHub Push Script
#  Usage: .\push.ps1 "Describe what you changed"
#  Example: .\push.ps1 "Add Kiwi.com provider"
# ============================================================

$GIT = "C:\Users\Abderrahmane\AppData\Local\Programs\Git\cmd\git.exe"

# ── Check git is available ────────────────────────────────────
if (-not (Test-Path $GIT)) {
    Write-Host "❌ Git not found. Please install Git first." -ForegroundColor Red
    exit 1
}

# ── Get commit message from argument ─────────────────────────
$msg = $args[0]
if (-not $msg) {
    Write-Host "❌ Please provide a commit message." -ForegroundColor Red
    Write-Host '   Usage: .\push.ps1 "Your message here"' -ForegroundColor Yellow
    exit 1
}

# ── Add timestamp to message ──────────────────────────────────
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$fullMsg   = "$msg  [$timestamp]"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  TayaranDZ → GitHub Push" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# ── Show what files changed ───────────────────────────────────
Write-Host "📋 Changed files:" -ForegroundColor Yellow
& $GIT status --short
Write-Host ""

# ── Stage all changes ─────────────────────────────────────────
Write-Host "📦 Staging all changes..." -ForegroundColor Yellow
& $GIT add -A

# ── Commit ────────────────────────────────────────────────────
Write-Host "💾 Committing: $fullMsg" -ForegroundColor Yellow
& $GIT commit -m $fullMsg

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Nothing to commit — all files are already up to date." -ForegroundColor DarkYellow
    exit 0
}

# ── Push ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
& $GIT push origin main 2>&1

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  ✅ Done! Railway will auto-deploy shortly." -ForegroundColor Green
Write-Host "  🔗 https://github.com/Dahadj96/tayaran-dz" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
