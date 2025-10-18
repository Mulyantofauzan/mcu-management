# 🚨 SECURITY CRITICAL - READ BEFORE DEPLOYING

## ⚠️ IMMEDIATE ACTIONS REQUIRED

### 1. Regenerate Supabase Keys (CRITICAL)

**WHY:** Your Supabase credentials were exposed in the public GitHub repository.

**ACTION NOW:**
1. Login to [Supabase Dashboard](https://app.supabase.com)
2. Select project: `gbbpzbpfzzsmghciulse`
3. Go to: **Settings → API**
4. Click **"Regenerate"** for the `anon` key
5. Copy the NEW key

**DO NOT SKIP THIS STEP!**

### 2. Setup Netlify Environment Variables

1. Go to Netlify: **Site settings → Environment variables**
2. Add these variables:

```
SUPABASE_URL = https://gbbpzbpfzzsmghciulse.supabase.co
SUPABASE_ANON_KEY = <YOUR_NEW_REGENERATED_KEY_FROM_STEP_1>
```

3. Redeploy your site

### 3. Enable Row Level Security (RLS)

Run this SQL in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcus ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcu_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Basic policy: Allow all operations for authenticated users
-- ADJUST THIS based on your specific security requirements
CREATE POLICY "Enable all for authenticated users" ON users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON employees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON mcus
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON mcu_changes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON activity_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON job_titles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON departments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON vendors
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 4. Change Default Passwords

Current default passwords are PUBLIC:
- `admin` / `admin123`
- `petugas` / `petugas123`

**ACTION:**
1. Login to the app
2. Go to "Kelola User"
3. Change ALL user passwords immediately

---

## 🔐 Known Security Issues (To Be Fixed)

### Password Hashing is WEAK

Current implementation uses Base64 encoding which is NOT secure:

```javascript
// CURRENT (INSECURE):
const passwordHash = btoa(password); // Anyone can decode this!
```

**Fix Options:**

**Option A: Use Supabase Auth (Recommended)**
- Automatic bcrypt hashing
- Email verification
- Password reset flows
- Contact developer to implement

**Option B: Implement bcrypt.js**
- Add bcrypt library
- Update authService.js
- Re-hash all existing passwords

**UNTIL FIXED:** Do NOT use this application with real sensitive data or real user passwords.

---

## ✅ Security Checklist

Before going to production:

- [ ] **CRITICAL:** Regenerated Supabase anon key
- [ ] **CRITICAL:** Set environment variables in Netlify
- [ ] **CRITICAL:** Enabled Row Level Security
- [ ] **CRITICAL:** Changed all default passwords
- [ ] **HIGH:** Implemented proper password hashing (bcrypt or Supabase Auth)
- [ ] **HIGH:** Added input validation on all forms
- [ ] **HIGH:** Fixed XSS vulnerabilities (escapeHtml)
- [ ] **MEDIUM:** Added HTTPS (Netlify does this automatically)
- [ ] **MEDIUM:** Set up regular database backups
- [ ] **MEDIUM:** Monitor Supabase logs for suspicious activity

---

## 🆘 If You've Been Hacked

If you suspect unauthorized access:

1. **Immediately:**
   - Regenerate ALL Supabase keys
   - Change ALL user passwords
   - Check Supabase logs for unauthorized queries
   - Check activity_log table for suspicious activity

2. **Review:**
   - Recent database changes
   - New user accounts
   - Deleted/modified data

3. **Restore:**
   - Use Supabase backup if needed
   - Supabase free tier: daily backups available

4. **Prevent:**
   - Enable RLS policies
   - Implement proper authentication
   - Add rate limiting
   - Monitor access logs

---

## 📞 Get Help

This application has known security vulnerabilities that need to be addressed before production use.

Contact your development team to:
1. Implement proper password hashing
2. Add comprehensive input validation
3. Fix XSS vulnerabilities
4. Set up proper RLS policies
5. Implement audit logging

**DO NOT deploy to production until these issues are fixed.**
