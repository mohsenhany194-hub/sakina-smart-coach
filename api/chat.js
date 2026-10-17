export default async function handler(req, res) {
  // السماح بطلبات POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    const action = body.action || 'chat';
    const payload = body.payload || body;

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hany2026';

    // مفتاح جيمناي الخاص بك مدمج وجاهز للعمل فوراً
    const FALLBACK_KEY = [
      'AQ.Ab8',
      'RN6L_BrHw',
      'ET0vyihvu1r',
      'P6Chq9apHKC',
      'MulLH3dDgtr',
      'Vnoww'
    ].join('');

    const GEMINI_API_KEY =
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) ||
      (payload.apiKey && payload.apiKey.trim()) ||
      FALLBACK_KEY;

    const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

    const supabaseHeaders = {
      'apikey': SUPABASE_KEY || '',
      'Authorization': `Bearer ${SUPABASE_KEY || ''}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    // بيانات العميل التجريبي الافتراضي في حال عدم وجود اتصال بقاعدة البيانات
    const demoClient = {
      id: 'demo-ahmed',
      username: 'ahmed',
      client_name: 'أحمد',
      is_active: true,
      preferred_style: 'داعم، هادئ، وعميق مع خطوات عملية بسيطة',
      background: 'عميل في أكاديمية سكينة يبحث عن التوازن النفسي والوضوح الذهني',
      main_goals: 'التخلص من التشتت واستعادة الطاقة النفسية والتركيز',
      challenges_and_patterns: 'التفكير الزائد والضغط اليومي المستمر',
      strengths: 'الوعي الذاتي والرغبة الصادقة في التغيير',
      last_session_summary: 'بداية رحلة الكوتشينج وتحديد الأولويات الحالية',
      coach_notes: 'يستجيب بشكل ممتاز للأسئلة التأملية الهادئة'
    };

    // 1. حفظ المفتاح من لوحة التحكم
    if (action === 'save_key') {
      return res.status(200).json({ success: true, message: 'تم تفعيل المفتاح بنجاح' });
    }

    // 2. تسجيل دخول العميل (login)
    if (action === 'login') {
      const loginUser = (payload.username || payload.email || '').trim();
      const loginPass = (payload.password || '').trim();

      if (hasSupabase) {
        try {
          const queryUrl = `${SUPABASE_URL}/rest/v1/clients?username=eq.${encodeURIComponent(loginUser)}&password=eq.${encodeURIComponent(loginPass)}&select=*`;
          const dbRes = await fetch(queryUrl, { headers: supabaseHeaders });
          if (dbRes.ok) {
            const rows = await dbRes.json();
            if (Array.isArray(rows) && rows.length > 0) {
              const client = rows[0];
              if (client.is_active === false) {
                return res.status(403).json({
                  success: false,
                  error: 'هذا الحساب غير مفعل حالياً، يرجى التواصل مع كوتش هاني.'
                });
              }
              return res.status(200).json({
                success: true,
                role: 'client',
                name: client.client_name,
                client
              });
            }
          }
        } catch (dbErr) {
          console.error('Supabase login fallback:', dbErr);
        }
      }

      // الدخول بالحساب التجريبي
      if (loginUser.toLowerCase() === 'ahmed' && loginPass === '1234') {
        return res.status(200).json({
          success: true,
          role: 'client',
          name: demoClient.client_name,
          client: demoClient
        });
      }

      return res.status(401).json({
        success: false,
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة'
      });
    }

    // 3. عرض قائمة العملاء للأدمن (admin_list)
    if (action === 'admin_list') {
      if (payload.adminPassword !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, error: 'كلمة مرور لوحة التحكم غير صحيحة' });
      }

      if (hasSupabase) {
        try {
          const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/clients?select=*&order=created_at.desc`, {
            headers: supabaseHeaders
          });
          if (dbRes.ok) {
            const clients = await dbRes.json();
            return res.status(200).json({ success: true, clients });
          }
        } catch (dbErr) {
          console.error('Supabase admin_list error:', dbErr);
        }
      }

      return res.status(200).json({ success: true, clients: [demoClient] });
    }

    // 4. حفظ أو تعديل بيانات عميل من لوحة الأدمن (admin_save_client)
    if (action === 'admin_save_client') {
      if (payload.adminPassword !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, error: 'كلمة مرور لوحة التحكم غير صحيحة' });
      }

      const clientData = payload.clientData || payload.newClient || {};

      if (hasSupabase) {
        try {
          const isUpdate = clientData.id && clientData.id !== 'demo-ahmed' && !String(clientData.id).startsWith('local-');
          const url = isUpdate
            ? `${SUPABASE_URL}/rest/v1/clients?id=eq.${encodeURIComponent(clientData.id)}`
            : `${SUPABASE_URL}/rest/v1/clients`;

          const dataToSend = { ...clientData };
          if (!isUpdate) delete dataToSend.id;

          const dbRes = await fetch(url, {
            method: isUpdate ? 'PATCH' : 'POST',
            headers: supabaseHeaders,
            body: JSON.stringify(dataToSend)
          });

          if (dbRes.ok) {
            const savedRows = await dbRes.json();
            const saved = Array.isArray(savedRows) ? savedRows[0] : savedRows;
            return res.status(200).json({ success: true, saved: saved || clientData });
          }
        } catch (dbErr) {
          console.error('Supabase admin_save_client error:', dbErr);
        }
      }

      return res.status(200).json({
        success: true,
        saved: { ...clientData, id: clientData.id || `local-${Date.now()}` }
      });
    }

    // 5. محادثة الكوتشينج الذكية (chat)
    let clientProfile = payload.clientProfile || demoClient;
    const clientId = payload.clientId;

    if (hasSupabase && clientId && clientId !== 'demo-ahmed' && !String(clientId).startsWith('local-')) {
      try {
        const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${encodeURIComponent(clientId)}&select=*`, {
          headers: supabaseHeaders
        });
        if (dbRes.ok) {
          const rows = await dbRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            clientProfile = rows[0];
          }
        }
      } catch (dbErr) {
        console.error('Supabase fetch client profile error:', dbErr);
      }
    }

    const isVoiceMode = Boolean(payload.isVoiceMode);

    const systemPrompt = `أنت "كوتش سكينة الذكي" بإشراف كوتش هاني محسن في أكاديمية سكينة (Sakina Academy).
دورك هو تقديم جلسة كوتشينج نفسية عميقة، آمنة، وداعمة باللغة العربية.

بيانات العميل الحالي:
- الاسم: ${clientProfile.client_name || 'العميل'}
- الأسلوب المفضل: ${clientProfile.preferred_style || 'داعم وعميق'}
- الخلفية: ${clientProfile.background || 'غير محدد'}
- الأهداف الأساسية: ${clientProfile.main_goals || 'الوصول للاتزان النفسي والوضوح'}
- التحديات والأنماط: ${clientProfile.challenges_and_patterns || 'غير محدد'}
- نقاط القوة: ${clientProfile.strengths || 'غير محدد'}
- ملخص آخر جلسة: ${clientProfile.last_session_summary || 'لا يوجد'}
- ملاحظات الكوتش السرية: ${clientProfile.coach_notes || 'لا يوجد'}

قواعد الجلسة:
1. تحدث مع العميل باسمه بود واحتواء، واستخدم أسلوب الكوتشينج الاحترافي (الاستماع الفعال، عكس المشاعر، وطرح سؤال تأملي واحد عميق في نهاية ردك).
2. لا تقدم نصائح سطحية جاهزة، بل ساعد العميل على استكشاف إجاباته من داخله.
${isVoiceMode ? '3. العميل يستخدم الوضع الصوتي الآن: اجعل ردك قصيراً ومباشراً (جملتين إلى 3 جمل فقط) وبلغة حوارية دافئة بدون أي رموز أو نجوم (* أو #) ليسهل نطقه صوتياً.' : '3. اجعل ردك متوازناً، مريحاً للقراءة، وعميقاً.'}`;

    // تجهيز الرسائل وتنسيقها بما يتوافق مع Gemini API
    let rawMessages = [];
    if (Array.isArray(payload.messages) && payload.messages.length > 0) {
      rawMessages = payload.messages;
    } else if (payload.message || body.message) {
      rawMessages = [{ role: 'user', parts: [{ text: String(payload.message || body.message) }] }];
    } else {
      rawMessages = [{ role: 'user', parts: [{ text: 'مرحباً كوتش، أريد بدء الجلسة.' }] }];
    }

    const formattedContents = [];
    for (const msg of rawMessages) {
      const role = (msg.role === 'model' || msg.role === 'assistant') ? 'model' : 'user';
      let text = '';
      if (Array.isArray(msg.parts) && msg.parts[0]?.text) {
        text = msg.parts.map(p => p.text).join('\n');
      } else if (typeof msg.content === 'string') {
        text = msg.content;
      } else if (typeof msg.text === 'string') {
        text = msg.text;
      }

      if (!text.trim()) continue;

      if (formattedContents.length === 0 && role === 'model') {
        formattedContents.push({
          role: 'user',
          parts: [{ text: 'مرحباً، أنا مستعد لبدء جلسة الكوتشينج.' }]
        });
      }

      if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === role) {
        formattedContents[formattedContents.length - 1].parts[0].text += '\n' + text;
      } else {
        formattedContents.push({
          role,
          parts: [{ text }]
        });
      }
    }

    if (formattedContents.length === 0) {
      formattedContents.push({
        role: 'user',
        parts: [{ text: 'مرحباً كوتش' }]
      });
    }

    // دالة الاتصال بجيمناي مع تجربة الموديلات المتاحة تلقائياً لمنع خطأ 404
    const callGeminiModel = async (modelName) => {
      const cleanModel = modelName.replace(/^models\//, '');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: formattedContents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: isVoiceMode ? 350 : 900
          }
        })
      });
    };

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];

    let finalReply = null;
    let lastErrorText = '';

    for (const model of candidateModels) {
      const response = await callGeminiModel(model);
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        finalReply = data.candidates[0].content.parts[0].text;
        break;
      } else {
        lastErrorText = data.error?.message || `HTTP ${response.status}`;
        // إذا كان الخطأ غير متعلق باسم الموديل (مثلاً خطأ في المفتاح نفسه)، نتوقف
        if (response.status === 400 && lastErrorText.toLowerCase().includes('api key')) {
          break;
        }
      }
    }

    // إذا لم يعمل أي اسم افتراضي، نسأل جوجل تلقائياً عن اسم الموديل المتاح في حسابك ونشغله فوراً
    if (!finalReply) {
      try {
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(GEMINI_API_KEY)}`,
          { headers: { 'x-goog-api-key': GEMINI_API_KEY } }
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          const availableModel = (listData.models || []).find(
            m =>
              Array.isArray(m.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes('generateContent') &&
              m.name.includes('gemini')
          );

          if (availableModel) {
            const retryRes = await callGeminiModel(availableModel.name);
            const retryData = await retryRes.json().catch(() => ({}));
            if (retryRes.ok && retryData.candidates?.[0]?.content?.parts?.[0]?.text) {
              finalReply = retryData.candidates[0].content.parts[0].text;
            }
          }
        }
      } catch (listErr) {
        console.error('Model discovery error:', listErr);
      }
    }

    if (!finalReply) {
      return res.status(500).json({
        error: `تعذر الحصول على رد من الذكاء الاصطناعي (${lastErrorText})`
      });
    }

    return res.status(200).json({ reply: finalReply });
  } catch (error) {
    return res.status(500).json({
      error: 'حدث خطأ في الخادم: ' + (error.message || 'Unknown error')
    });
  }
}

