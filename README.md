# Salon Dinners 2026 - Fixed for Vercel

## What's Fixed:
- ✅ Removed all `window.storage` (Claude artifact API) - replaced with `localStorage`
- ✅ Changed N8N to Make.com
- ✅ Added SSR protection for browser APIs
- ✅ Tailwind CSS via CDN

## Quick Deploy to GitHub:

### Step 1: Go to your GitHub repository
1. Go to https://github.com/YOUR-USERNAME/salon-dinners
2. Click on `pages` folder
3. Click on `index.js`
4. Click the **pencil icon** (edit)
5. **Select all** (Ctrl+A) and **delete**
6. Open the `index.js` from this folder, copy ALL content
7. Paste into GitHub
8. Click **"Commit changes"**

### Step 2: Vercel will auto-redeploy
Wait 2-3 minutes and your site should work!

## File Structure:
```
salon-dinners/
├── package.json
├── next.config.js
├── .gitignore
└── pages/
    ├── _app.js
    ├── _document.js
    └── index.js      ← This is the main file with all fixes
```

## Make.com Setup:
1. Go to Admin panel (password: `salon2026`)
2. Go to "Export Data" tab
3. Enter your Make.com webhook URL
4. Click "Save Webhook URL"

All new registrations will automatically be sent to Make.com!
