# WhatsApp Integration Notes - For Future Implementation

**Status:** Planning Phase (Not Yet Implemented)
**Last Updated:** 2026-02-03
**Decision:** To be implemented after approval workflow is tested and stable

---

## 📝 SUMMARY OF DISCUSSION

### **Question:** Bisa ga buat WA API sendiri?

**Answer:** YES! Ada 3 options:

---

## 🎯 OPTION COMPARISON

| Aspek | Manual (Phase 1) | DIY + WhatsApp Web.js (Phase 2) | Official API Twilio/Gupshup (Phase 3) |
|-------|---|---|---|
| **Setup Time** | 1 hari | 2-3 hari | 1-2 minggu + approval |
| **Cost** | FREE | FREE | $0.02-0.05/msg |
| **Ban Risk** | None | Medium | None (official) |
| **Maintenance** | None | High (fix when blocked) | None |
| **Reliabilitas** | 100% | 85% | 99%+ |
| **Support** | Manual user | Community | 24/7 Enterprise |
| **Attachment Support** | Manual | ✅ Yes | ✅ Yes |
| **Automation Level** | Manual share | Fully automatic | Fully automatic |
| **Production Ready** | ✅ Yes | ⚠️ Risky | ✅ Safe |

---

## 🏗️ OPTION 1: MANUAL (CURRENT RECOMMENDATION - PHASE 1)

### **How It Works:**
1. Dokter approve MCU
2. PDF "Surat Rujukan" auto-generated
3. Show download button on UI
4. Provide WA share button with pre-filled message
5. User manually sends to group

### **Pros:**
- ✅ Zero cost
- ✅ Zero maintenance
- ✅ No ban risk
- ✅ 100% reliable
- ✅ Can implement in 1 day

### **Cons:**
- ❌ Not fully automated
- ❌ Requires user action

### **Implementation:**
```javascript
// Simple button on approval modal
<button onclick="shareToWhatsApp()">
  📱 Share to WhatsApp
</button>

function shareToWhatsApp() {
    const message = encodeURIComponent(`
✅ MCU REVIEW - Dr. ${dokterName}

Nama: ${employeeName}
Hasil MCU: ${hasilAwal}
Catatan: ${catatanAwal}

📋 Data Rujukan:
${dataRujukan}

[PDF surat rujukan attached]
    `);

    // Open WhatsApp with pre-filled message
    window.open(`https://wa.me/?text=${message}`);
}
```

**Timeline:** 1 day

---

## 🔧 OPTION 2: DIY WITH WhatsApp Web.js (PHASE 2 - OPTIONAL)

### **Best Open-Source Libraries:**

1. **WhatsApp Web.js** (Recommended for DIY)
   - Easiest to learn
   - Active community
   - Can send attachments
   - Supports groups
   - URL: https://github.com/open-wa/wa-automate-nodejs

2. **Evolution API**
   - More enterprise
   - Better session management
   - Dashboard included
   - URL: https://github.com/EvolutionAPI/evolution-api

3. **WAHA (WhatsApp HTTP API)**
   - REST API interface
   - Multiple engines
   - Dashboard UI
   - URL: https://waha.devlike.pro/

### **How It Works:**
```
1. Install WhatsApp Web.js
2. Login via QR code (scan with phone)
3. Session saved
4. Auto-send messages via API
5. Support attachments (PDF)
```

### **Architecture:**
```
Server (Node.js)
├─ WhatsApp Web.js client
├─ Browser automation (Chromium)
├─ Session management
└─ Message queue

When Dokter approves:
├─ Generate PDF
├─ Queue message
├─ Auto-send to group
└─ Log result
```

### **Implementation Example:**

```javascript
// File: backend/services/waService.js

const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.sessionPath = './wa-session';
    }

    async initialize() {
        this.client = new Client({
            session: this.loadSession(),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        this.client.on('qr', async (qr) => {
            // Show QR on admin page for scanning
            const qrImage = await qrcode.toDataURL(qr);
            console.log('QR Code generated:', qrImage);
        });

        this.client.on('ready', () => {
            console.log('WhatsApp client ready');
            this.isReady = true;
            this.saveSession();
        });

        this.client.on('disconnected', () => {
            console.log('Client disconnected, will reconnect...');
            this.isReady = false;
            this.reconnect();
        });

        await this.client.initialize();
    }

    async sendToGroup(groupId, message, attachmentPath = null) {
        if (!this.isReady) {
            throw new Error('WhatsApp client not ready');
        }

        try {
            if (attachmentPath) {
                // Send with PDF attachment
                const MessageMedia = require('whatsapp-web.js').MessageMedia;
                const media = MessageMedia.fromFilePath(attachmentPath);
                await this.client.sendMessage(groupId, media, {caption: message});
            } else {
                // Send text only
                await this.client.sendMessage(groupId, message);
            }
            return { success: true };
        } catch (error) {
            console.error('WA send error:', error);
            return { success: false, error: error.message };
        }
    }

    async getGroups() {
        if (!this.isReady) return [];
        const chats = await this.client.getChats();
        return chats.filter(chat => chat.isGroup);
    }

    saveSession() {
        if (this.client.session) {
            fs.writeFileSync(this.sessionPath, JSON.stringify(this.client.session));
        }
    }

    loadSession() {
        if (fs.existsSync(this.sessionPath)) {
            const data = fs.readFileSync(this.sessionPath, 'utf8');
            return JSON.parse(data);
        }
        return null;
    }

    async reconnect() {
        // Auto-reconnect logic
        setTimeout(() => this.initialize(), 5000);
    }
}

export const waService = new WhatsAppService();
waService.initialize();
```

### **Integration with Approval Service:**

```javascript
// In approvalService.js

async approveMCUByDokter(mcuId, approvalData) {
    // ... approval logic ...

    // Generate PDF
    const pdfPath = await generateSuratRujukan(mcuId, approvalData);

    // Prepare message
    const waMessage = `
✅ MCU REVIEW - Dr. ${currentUser.displayName}

Nama: ${employeeName}
Hasil MCU: ${approvalData.hasil_awal}
Catatan: ${approvalData.catatan_awal}

📋 Data Rujukan:
${approvalData.data_rujukan || 'Tidak ada'}

Waktu Approval: ${new Date().toLocaleString('id-ID')}
    `;

    // Send via WhatsApp
    const groupId = process.env.WA_GROUP_ID;

    try {
        const result = await waService.sendToGroup(groupId, waMessage, pdfPath);
        if (result.success) {
            console.log('WA notification sent');
        }
    } catch (error) {
        console.error('WA send failed:', error);
        // Don't fail approval if WA fails
    }

    // Continue with approval save...
}
```

### **Setup Steps:**
1. Install: `npm install whatsapp-web.js qrcode`
2. Run service: `node waService.js`
3. Scan QR code with phone
4. Session saved automatically
5. Auto-send when approval triggers

### **Pros:**
- ✅ Fully automated
- ✅ Zero manual user action
- ✅ Support attachments
- ✅ Free (no cost)
- ✅ Full control

### **Cons:**
- ❌ Ban risk (WhatsApp can ban anytime)
- ❌ High resource usage (browser automation)
- ❌ Session management overhead
- ❌ Needs monitoring & maintenance
- ❌ Not officially supported by WhatsApp

### **Ban Risk Mitigation:**
- Use dedicated business number
- Don't send spam
- Maintain reasonable rate limiting
- Monitor session health
- Have fallback plan (manual/email)

### **Timeline:** 2-3 days

---

## 💳 OPTION 3: OFFICIAL API - Twilio/Gupshup (PHASE 3 - SAFEST)

### **Recommended Providers:**

1. **Twilio WhatsApp API**
   - Cost: $0.0079 per message
   - Official, reliable
   - 24/7 support
   - URL: https://www.twilio.com/whatsapp

2. **Gupshup WhatsApp API**
   - Cost: $0.02-0.05 per message
   - Simple integration
   - Good documentation
   - URL: https://www.gupshup.io

3. **MessageBird**
   - Cost: $0.02 per message
   - Enterprise support
   - URL: https://www.messagebird.com

### **How It Works:**
```
1. Register WhatsApp Business account
2. Get API credentials
3. Integrate REST API
4. Send messages programmatically
5. Track delivery/read status
```

### **Implementation Example:**

```javascript
// Using Twilio WhatsApp API

const twilio = require('twilio');

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsAppMessage(toNumber, message, attachmentUrl) {
    try {
        const result = await client.messages.create({
            from: 'whatsapp:+1234567890',  // Your WhatsApp number
            to: `whatsapp:${toNumber}`,
            body: message,
            mediaUrl: attachmentUrl ? [attachmentUrl] : []
        });
        return { success: true, sid: result.sid };
    } catch (error) {
        console.error('Twilio error:', error);
        return { success: false, error: error.message };
    }
}
```

### **Pros:**
- ✅ Official, safe, no ban risk
- ✅ 99%+ reliability
- ✅ 24/7 enterprise support
- ✅ Full compliance
- ✅ Tracking & analytics
- ✅ Scalable

### **Cons:**
- ❌ Cost per message ($0.02-0.05)
- ❌ Requires approval process
- ❌ Setup takes 1-2 weeks
- ❌ Ongoing subscription

### **Timeline:** 1-2 weeks + approval

---

## 🗺️ IMPLEMENTATION ROADMAP

### **PHASE 1 (Now - Next 2 weeks): MANUAL**
```
✅ Keep approval workflow simple
✅ User manually shares to WhatsApp
✅ No ban risk
✅ Easy to implement
✅ Focus on approval logic stability
```

### **PHASE 2 (1-2 months): DIY (Optional)**
```
⚠️  If manual works well and team comfortable with automation
⚠️  Monitor for ban risk
⚠️  Have fallback plan
⚠️  Use dedicated business number
```

### **PHASE 3 (Later): Official API**
```
💡 If high volume needed
💡 When budget allows
💡 For long-term stability
💡 Enterprise requirements
```

---

## ⚠️ RISKS & MITIGATION

| Risk | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| **Ban Risk** | None | Medium | None |
| **Cost** | Free | Free | ~$0.02/msg |
| **Reliability** | 100% | 85% | 99%+ |
| **Maintenance** | None | High | None |
| **Support** | Manual | Community | 24/7 |

### **Phase 2 Specific Risks:**
- WhatsApp can ban account anytime
- Session may disconnect (need monitoring)
- Browser automation resource heavy
- Not officially supported

### **Mitigation for Phase 2:**
- ✅ Use dedicated business number (not personal)
- ✅ Don't send spam/high volume
- ✅ Implement rate limiting
- ✅ Monitor session health
- ✅ Have email/manual backup
- ✅ Log all messages
- ✅ Ready to fallback to paid API

---

## 📋 DECISION MATRIX

**Choose based on:**

| Scenario | Recommendation |
|----------|---|
| **Quick implementation, low volume** | Phase 1: Manual |
| **Want automation, can accept risk** | Phase 2: DIY WhatsApp Web.js |
| **Need enterprise reliability** | Phase 3: Twilio/Gupshup |
| **High volume, compliance critical** | Phase 3: Official API |
| **Budget conscious, low risk tolerance** | Phase 1: Manual + later Phase 3 |

---

## 📚 RESOURCES

### **Open-Source Libraries:**
- [WhatsApp Web.js](https://github.com/open-wa/wa-automate-nodejs)
- [Evolution API](https://github.com/EvolutionAPI/evolution-api)
- [WAHA - WhatsApp HTTP API](https://waha.devlike.pro/)
- [WPPConnect](https://github.com/wppconnect-team/wppconnect)

### **Official APIs:**
- [Twilio WhatsApp API](https://www.twilio.com/whatsapp)
- [Gupshup](https://www.gupshup.io)
- [MessageBird](https://www.messagebird.com)

### **Documentation:**
- [WhatsApp Business API](https://www.whatsapp.com/business/api)
- [Meta Business Platform](https://developers.facebook.com/docs/whatsapp)

---

## ✅ NEXT STEPS

### **Now:**
- ✅ Keep Phase 1 (Manual) in approval workflow documentation
- ✅ Save this notes for future reference
- ✅ Implement approval workflow first
- ✅ Test approval logic with manual WA sharing

### **Later (After approval is stable):**
- Evaluate Phase 2 (DIY) if automation needed
- Or jump to Phase 3 (Official) if budget available
- Update WA notification service accordingly

### **Before implementing Phase 2/3:**
- [ ] Get approval from team
- [ ] Assess ban risk tolerance
- [ ] Prepare fallback plan
- [ ] Review WhatsApp policies
- [ ] Test with pilot group first

---

## 🎯 RECOMMENDATION

**For now:** Stick with **Phase 1 (Manual)**
- Focus on approval workflow stability
- Manual WA sharing is reliable & safe
- Can upgrade anytime without affecting core logic
- User experience good enough

**Future (after 1-2 months):** Evaluate Phase 2 or 3
- Based on real usage patterns
- Team feedback
- Volume requirements
- Budget constraints

---

**Document Version:** 1.0
**Status:** Planning Phase (Not Yet Implemented)
**Last Updated:** 2026-02-03
**Next Review:** After approval workflow is implemented & tested
