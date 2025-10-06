
MyLadyArab v13 - Master (نسخة تجريبية)
---------------------------------------
محتويات المشروع:
- server/: كود الخادم (Node.js + Express + Socket.io + SQLite)
- public/: واجهة بسيطة بالعربية (HTML + CSS + JS)

التشغيل محلياً:
1) تأكد أنك منصب Node.js >= 18
2) ادخل مجلد server:
   cd server
   npm install
   node index.js
3) افتح المتصفح وادخل http://localhost:4000

نقاط مهمة:
- حساب الملك الافتراضي: MEDO / ChangeMe123! غيّرها فوراً بعد أول تسجيل دخول.
- قاعدة البيانات محفوظة في server/data.sqlite
- هذا إصدار MVP تجريبي: المتجر وظّف قاعدة بسيطة (الشراء يضاف في المستقبل)
- يمكنك رفع المشروع مجاناً على Render (Node web service) لو عايز رابط عام.
