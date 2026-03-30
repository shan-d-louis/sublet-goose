# 🪿 Sublet Goose
> Ontario RTA Lease Auditor for University of Waterloo Students

AI-powered lease auditing tool that detects illegal clauses, void provisions, and generates copy-paste negotiation scripts — all grounded in the Ontario Residential Tenancies Act (RTA), 2006.

---

## Quick Start

### 1. Clone & setup
```powershell
git clone <your-repo>
cd sublet-goose
.\setup.ps1
```

### 2. Add your API key
Edit `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

And set it for the backend in your terminal:
```powershell
$env:ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Run both servers (two terminals)
```powershell
# Terminal 1 — Backend
cd backend
.\venv\Scripts\Activate.ps1
$env:ANTHROPIC_API_KEY="sk-ant-..."
uvicorn main:app --reload

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:3000**

---

## Project Structure
```
sublet-goose/
├── setup.ps1                  ← one-shot setup
├── backend/
│   ├── main.py                ← FastAPI + RTA audit logic
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   └── page.tsx           ← full UI
    ├── .env.local.example
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── next.config.ts
```

## RTA Rules Enforced

| Severity | Rule | Section |
|---|---|---|
| 🚨 Illegal | Damage / security deposits | s. 105 |
| 🚨 Illegal | Mandatory post-dated cheques | s. 108 |
| 🚨 Illegal | Unlawful landlord entry | s. 26–27 |
| ⚠️ Void | "No pets" clauses | s. 14 |
| ⚠️ Void | Waiving tenant rights | s. 3(1) |
| ⚠️ Void | Banning / charging for guests | s. 22 |
| ⚠️ Void | Outright subletting prohibition | s. 97 |

---

**Disclaimer:** This tool provides educational information based on the Ontario RTA and is not a substitute for legal advice. Free legal help for UW students: [WUSA SLPP](https://wusa.ca/services/student-supports/student-legal-protection-program/)
