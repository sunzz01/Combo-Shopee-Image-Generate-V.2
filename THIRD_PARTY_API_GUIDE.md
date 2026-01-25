# Third-Party API Integration Guide

## ภาพรวม (Overview)

เพิ่มความสามารถในการเชื่อมต่อกับ Third-party AI APIs เช่น **Phaya.io** และ **Custom API endpoints** ใดๆ ที่รองรับ OpenAI-compatible format

![Third-Party API Configuration UI](third_party_api_config_1769085771098.png)

## ฟีเจอร์ที่เพิ่มเข้ามา (New Features)

### 1. **Phaya.io Integration** 🇹🇭
- AI Platform จากประเทศไทยที่เข้าใจบริบทภาษาไทยได้ดีเลิศ
- รองรับการวิเคราะห์รูปภาพและสร้างเนื้อหา
- ตั้งค่าผ่าน:
  - **API Key**: กุญแจสำหรับเข้าถึง Phaya.io API
  - **API URL**: Endpoint URL (ค่าเริ่มต้น: `https://api.phaya.io/v1/chat/completions`)

### 2. **Custom API Integration** ⚙️
- เชื่อมต่อกับ API endpoint ใดๆ ที่คุณต้องการ
- รองรับ OpenAI-compatible format
- ตั้งค่าผ่าน:
  - **API Key**: กุญแจสำหรับเข้าถึง Custom API
  - **API Endpoint**: URL ของ API endpoint ของคุณ
  - **Model Name**: ชื่อ Model ที่ต้องการใช้ (เช่น `gpt-4`, `claude-3`, `gemini-pro`)

## การใช้งาน (How to Use)

### ขั้นตอนที่ 1: เปิดหน้า Settings
1. คลิกที่ไอคอน Extension ใน Chrome
2. เลือก **ตั้งค่า** (Settings)

### ขั้นตอนที่ 2: กรอกข้อมูล Third-Party API
1. เลื่อนลงมาที่ส่วน **"Third-Party AI APIs"**
2. เลือก API ที่ต้องการตั้งค่า:
   - **Phaya.io**: สำหรับ AI ไทย
   - **Custom API**: สำหรับ API อื่นๆ

### ขั้นตอนที่ 3: กรอก API Key และ URL
- **Phaya.io**:
  ```
  API Key: [Your Phaya.io API Key]
  API URL: https://api.phaya.io/v1/chat/completions
  ```

- **Custom API**:
  ```
  API Key: [Your Custom API Key]
  API Endpoint: https://api.example.com/v1/chat/completions
  Model Name: gpt-4 (optional)
  ```

### ขั้นตอนที่ 4: บันทึกการตั้งค่า
1. คลิกปุ่ม **"บันทึกทั้งหมด"** (Save All)
2. ระบบจะแจ้งเตือนว่าบันทึกสำเร็จ

### ขั้นตอนที่ 5: เลือก AI Model
1. กลับไปหน้าแรก
2. ในส่วน **"AI Models Hub"** เลือก **Phaya.io** หรือ **Custom API**
3. เริ่มใช้งาน!

## ไฟล์ที่ถูกแก้ไข (Modified Files)

### 1. `src/types.ts`
```typescript
// เพิ่ม Third-party AI model types
export type AIModelId = 'dalle-3' | 'gemini-flash-lite' | 'imagen-3' | 'veo-3-1' | 'gemini-3-pro' | 'phaya-ai' | 'custom-api';

// เพิ่ม configuration interface
export interface ThirdPartyApiConfig {
    apiKey: string;
    apiUrl: string;
    modelName?: string;
}
```

### 2. `src/services/aiService.ts`
```typescript
// เพิ่ม Third-party AI models
{
    id: 'phaya-ai',
    name: 'Phaya.io',
    version: 'Third Party API',
    description: 'AI Platform จากประเทศไทย รองรับภาษาไทยได้ดีเยี่ยม',
    tags: ['THAI AI', 'THIRD PARTY', 'VISION'],
    latency: 'Custom',
    status: 'READY',
    quote: '"AI ที่เข้าใจบริบทภาษาไทยได้ดีที่สุด"',
    realModelName: 'phaya-io',
    isThirdParty: true,
    requiresCustomApiKey: true
}
```

### 3. `src/sidepanel/App.tsx`
- เพิ่ม state สำหรับ Third-party API credentials
- เพิ่ม UI สำหรับการตั้งค่า
- บันทึกข้อมูลลง Chrome Storage

## Chrome Storage Keys

```typescript
{
    'phaya_api_key': string,        // Phaya.io API Key
    'phaya_api_url': string,        // Phaya.io API URL
    'custom_api_key': string,       // Custom API Key
    'custom_api_url': string,       // Custom API Endpoint
    'custom_model_name': string     // Custom Model Name
}
```

## UI/UX Design

### Phaya.io Section
- **สี**: Gradient จาก Violet ไป Indigo (`from-violet-50 to-indigo-50`)
- **ไอคอน**: Sparkles (✨)
- **Border**: `border-violet-200`

### Custom API Section
- **สี**: Gradient จาก Slate ไป Slate (`from-slate-50 to-slate-100`)
- **ไอคอน**: Settings (⚙️)
- **Border**: `border-slate-300`

## ตัวอย่างการใช้งาน (Example Use Cases)

### Use Case 1: วิเคราะห์รูปสินค้าด้วย Phaya.io
1. ตั้งค่า Phaya.io API Key
2. เลือก Model **"Phaya.io"** ในหน้าแรก
3. สแกนรูปสินค้า
4. วิเคราะห์ด้วย AI ไทย

### Use Case 2: ใช้ Custom AI Model
1. ตั้งค่า Custom API Endpoint
2. ระบุ Model Name (เช่น `claude-3-opus`)
3. เลือก Model **"Custom API"**
4. เริ่มวิเคราะห์รูปภาพ

## Security Considerations

- ✅ API Keys ถูกเก็บแบบ **password field** (ซ่อนข้อความ)
- ✅ ข้อมูลถูกบันทึกใน **Chrome Storage Local** (ปลอดภัย)
- ✅ ไม่มีการส่งข้อมูลไปยัง Server ภายนอก

## Next Steps (ขั้นตอนต่อไป)

สำหรับนักพัฒนา (Developers):
1. ✅ เพิ่ม Third-party API types และ interfaces
2. ✅ สร้าง UI สำหรับการตั้งค่า
3. ✅ บันทึกข้อมูลลง Chrome Storage
4. 🔄 **[TODO]** เพิ่มฟังก์ชันในการเรียกใช้ Third-party APIs ใน `background.ts` หรือ `aiService.ts`
5. 🔄 **[TODO]** เพิ่มการทดสอบ API Key สำหรับ Phaya.io และ Custom API
6. 🔄 **[TODO]** เพิ่ม Error handling สำหรับ Third-party APIs

---

## การพัฒนาเพิ่มเติม (Future Development)

- [ ] เพิ่ม list ของ Third-party AI providers ที่รองรับ
- [ ] เพิ่มการ validate API URL format
- [ ] เพิ่มการ test connection สำหรับแต่ละ API
- [ ] เพิ่ม documentation สำหรับแต่ละ provider
- [ ] เพิ่ม rate limiting และ quota monitoring

---

**สร้างเมื่อ**: 2026-01-22  
**เวอร์ชัน**: v2.0 PRO  
**ผู้พัฒนา**: Gimi Multi-X Team
