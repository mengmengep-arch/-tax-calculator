# CLAUDE.md - AI Assistant Guide for Thai Tax Calculator

This document provides essential information for AI assistants working with this codebase.

## Project Overview

**Thai Tax Calculator 2569** (ปีภาษี 2569/2026) is a web-based personal income tax calculator for salaried employees in Thailand. It features a wizard-based UI, salary slip OCR, and tax planning simulations.

**Tech Stack:** Vanilla JavaScript, HTML5, CSS3, Node.js (optional backend)
**Version:** 2.1

## Repository Structure

```
-tax-calculator/
├── Frontend (Main Application)
│   ├── index.html              # Main tax calculator (wizard UI)
│   ├── script.js               # Core tax calculation logic (~2200 lines)
│   ├── styles.css              # All styling
│   ├── salary-slips.html       # Salary slip management page
│   ├── salary-slips.js         # OCR & slip data management
│   └── export-pdf.js           # PDF export functionality
│
├── Backend (Optional - Vercel)
│   └── backend/
│       ├── server.js           # Express server for OCR proxy
│       ├── package.json        # Node.js dependencies
│       ├── vercel.json         # Vercel deployment config
│       └── .env.example        # Environment variables template
│
├── Test Files
│   ├── test-pvd.html           # PVD calculation tests
│   ├── test-calculation.html   # Tax calculation tests
│   ├── test-sliders.html       # Slider behavior tests
│   ├── debug.html              # Debug interface
│   └── simple-test.html        # Simple tests
│
├── Documentation
│   ├── README.md               # Project documentation (Thai)
│   └── DEPLOYMENT_GUIDE.md     # Deployment instructions
│
└── Legacy
    └── index-fixed.html        # Legacy version (deprecated)
```

## Key Files and Their Purpose

| File | Purpose | Lines |
|------|---------|-------|
| `script.js` | Core tax calculation, deduction logic, UI interactions | ~2200 |
| `salary-slips.js` | OCR integration, salary data management | ~1100 |
| `styles.css` | All CSS styling for frontend | ~1000 |
| `index.html` | Main calculator page with 4-step wizard | ~700 |
| `salary-slips.html` | 12-month salary slip management | ~600 |
| `export-pdf.js` | PDF generation using html2pdf.js | ~600 |

## Development Workflow

### Running Locally
```bash
# Start local server
python -m http.server 8000

# Open in browser
# http://localhost:8000/index.html
# http://localhost:8000/salary-slips.html
```

### Backend Development
```bash
cd backend
npm install
npm run dev    # Development with auto-reload
npm start      # Production
```

### Deployment
- **Frontend:** GitHub Pages (static hosting)
- **Backend:** Vercel serverless functions

## Code Conventions

### Language
- **UI text:** Thai (ภาษาไทย)
- **Code comments:** Thai (for domain-specific logic)
- **Variable names:** English (camelCase)
- **CSS classes:** kebab-case

### JavaScript Patterns
- **No frameworks** - Pure vanilla JavaScript (ES6+)
- **localStorage** for data persistence
- **Async/await** for OCR operations
- **Event delegation** where appropriate

### Naming Conventions
- Form IDs use prefixes: `plan1_`, `plan2_`
- localStorage keys: `taxCalc_*`, `salarySlips_*`, `ocrSettings`
- Functions: `calculate*()`, `update*()`, `save*()`, `load*()`

### Section Comments
```javascript
// ============================================================
// Section Name
// ============================================================
```

## Thai Tax Calculation Rules (2569)

### Tax Brackets
```
0 - 150,000 ฿         → 0%
150,001 - 300,000     → 5%
300,001 - 500,000     → 10%
500,001 - 750,000     → 15%
750,001 - 1,000,000   → 20%
1,000,001 - 2,000,000 → 25%
2,000,001 - 5,000,000 → 30%
5,000,001+            → 35%
```

### Important Deduction Limits
- **Expense deduction:** 50% of income, max 100,000 ฿
- **Insurance total (life + health):** max 100,000 ฿
- **Retirement funds (pension + PVD + RMF):** max 500,000 ฿
- **Thai ESG + Thai ESGx:** each max 300,000 ฿ (30% of income)
- **Donations (double deduction):** max 10% of net income

### Key Calculation Functions
- `calculateTax(netIncome, totalDeduction)` - Main tax calculation
- `getPlan1Deductions()` / `getPlan2Deductions()` - Deduction totals with limits
- `getDeductionBreakdown(plan)` - Detailed deduction breakdown

## Data Persistence (localStorage)

| Key | Description |
|-----|-------------|
| `taxCalc_incomeData` | Income data from Step 1 |
| `taxCalc_basicDeductions` | Basic deductions from Step 2 |
| `taxCalc_planData` | Plan 1 & 2 detailed deduction values |
| `salarySlips_2569` | Monthly salary slip data |
| `ocrSettings` | OCR engine preference & API key |
| `taxCalculationData` | Cross-page data transfer |

## OCR Integration

Three engine options in `salary-slips.js`:

1. **Backend Proxy** (default) - 10 free requests/day/IP, 90%+ accuracy
2. **Direct OpenAI** - User's API key, unlimited
3. **Tesseract.js** - Client-side, free, 60-70% accuracy

## External Libraries (CDN)

- **Chart.js** - Tax comparison charts
- **Tesseract.js** - Client-side OCR
- **PDF.js** - PDF reading
- **html2pdf.js** - PDF export

## Common Tasks for AI Assistants

### Adding a New Deduction Item
1. Add HTML input in `index.html` (Step 3 section)
2. Add calculation logic in `script.js` (`getPlan1Deductions`/`getPlan2Deductions`)
3. Update `savePlanData()` and `loadPlanData()` for persistence
4. Add to `getDeductionBreakdown()` for chart display
5. Update CSS if needed

### Modifying Tax Calculation
1. Core logic is in `calculateTax()` function in `script.js`
2. Tax brackets defined at top of `script.js`
3. Test changes using `test-calculation.html`

### Working with OCR
1. OCR logic is in `salary-slips.js`
2. Backend API in `backend/server.js`
3. Rate limiting handled via NodeCache

### Adding New UI Features
1. HTML structure in respective `.html` file
2. Styling in `styles.css`
3. JavaScript logic in corresponding `.js` file
4. Test with relevant test files

## Testing

Open test files directly in browser:
- `test-pvd.html` - PVD/RMF/pension limit calculations
- `test-calculation.html` - Tax calculation accuracy
- `test-sliders.html` - Slider behavior and limits
- `debug.html` - General debugging

## Common Pitfalls

1. **Combined limits** - Insurance and retirement funds have combined caps that must be enforced
2. **Double deduction donations** - Input is actual amount, deduction is 2x (capped at 10% of net income)
3. **localStorage sync** - Always update both UI and localStorage together
4. **Number formatting** - Use `parseNumberWithComma()` and `formatNumber()` for proper handling

## Git Workflow

- **Main branch:** Production code
- **Feature branches:** `claude/*` for AI-assisted development
- Commit messages: Clear, descriptive (Thai or English)
- Recent commits show bug fixes for calculation limits and UI improvements

## Backend Environment Variables

```env
OPENAI_API_KEY=sk-...      # OpenAI API key
RATE_LIMIT=10              # Requests per IP per day
PORT=3000                  # Local development port
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires: JavaScript enabled, localStorage, Canvas API, FileReader API, Fetch API

## Quick Reference

### Start Development
```bash
python -m http.server 8000
```

### Key Entry Points
- Main calculator: `index.html`
- Salary slips: `salary-slips.html`
- Tax logic: `script.js:calculateTax()`
- Deductions: `script.js:getPlan1Deductions()`

### Important Line References
- Tax brackets: `script.js:1-20`
- Tax calculation: `script.js:~40`
- Plan deductions: `script.js:~500-650`
- OCR engines: `salary-slips.js:~400-450`
