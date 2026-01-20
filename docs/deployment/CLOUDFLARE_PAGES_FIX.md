# 🔧 Cloudflare Pages Root Directory Fix

**Error:** "root directory not found"
**Cause:** Cloudflare Pages root directory setting is wrong
**Solution:** Update the root directory setting

---

## Quick Fix

In Cloudflare Pages dashboard for your **mcu-management** project:

1. Go to: **Settings → Build & deployments**
2. Look for **Root directory** field
3. Change it to: **`.`** (dot = current directory)
4. OR leave it **empty** (defaults to root)

Your settings should be:
```
Root directory: . (or empty)
Build command: npm run build
Build output directory: mcu-management/dist
```

5. Click: **Save and deploy**
6. Wait for redeploy

---

## Why This Happens

Cloudflare Pages expects:
- **Root directory**: Where to start looking (usually `.` or empty)
- **Build command**: What to run (`npm run build`)
- **Build output**: Where the built files are (`mcu-management/dist`)

If root directory is wrong, it can't find package.json or files to build.

---

## Step-by-Step

### In Cloudflare Dashboard:
1. Open: https://pages.cloudflare.com/
2. Select: **mcu-management** project
3. Click: **Settings**
4. Click: **Build & deployments**
5. Look for these fields:

```
Root directory: [empty or .]
Build command: npm run build
Build output directory: mcu-management/dist
```

6. If root directory has a value, clear it or set to `.`
7. Click: **Save** at bottom
8. Cloudflare will automatically redeploy

---

## What Should Happen

After fixing:
```
✅ Cloning repository
✅ Initializing build environment
✅ Installing dependencies
✅ Running: npm run build
✅ Build output: mcu-management/dist
✅ Deploying site
✅ Your site is live!
```

---

## Verify Success

After deployment:
1. Go to your site: `https://mcu-management.pages.dev`
2. Should show your MCU app
3. Check browser console - no errors
4. Try uploading a file

---

## If Still Not Working

Check these in Cloudflare:
1. **Root directory** - Must be empty or `.`
2. **Build command** - Must be `npm run build`
3. **Build output directory** - Must be `mcu-management/dist`
4. **Connected branch** - Should be `main`

All correct? Try:
- Click: **Trigger deploy** button
- Wait 2-3 minutes for build
- Check the build logs for errors

---

**Most common fix:** Root directory should be empty or `.` (not anything else)

Go update this now and let it redeploy! 🚀
