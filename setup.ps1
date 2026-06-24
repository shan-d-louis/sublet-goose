# Sublet Goose — One-shot setup script
# Run from the project root: .\setup.ps1

Write-Host "`n🪿 Sublet Goose Setup`n" -ForegroundColor Yellow

# ── Allow script execution (run once if blocked) ──────────────
# Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

# ── Backend ───────────────────────────────────────────────────
Write-Host "Setting up backend..." -ForegroundColor Cyan
Set-Location backend

python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

Set-Location ..

# ── Frontend ──────────────────────────────────────────────────
Write-Host "`nSetting up frontend..." -ForegroundColor Cyan
Set-Location frontend

Copy-Item .env.local.example .env.local -ErrorAction SilentlyContinue
npm install

Set-Location ..

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:"
Write-Host "  1. Add your Anthropic API key to frontend\.env.local"
Write-Host "  2. Open two terminals and run:"
Write-Host "     Terminal 1: cd backend; .\venv\Scripts\Activate.ps1; `$env:ANTHROPIC_API_KEY='sk-ant-...'; uvicorn main:app --reload"
Write-Host "     Terminal 2: cd frontend; npm run dev"
Write-Host "  3. Open http://localhost:3000`n"
