export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, payload } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hany2026';

  const supabaseHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    if (action === 'login') {
      const { username, password } = payload;
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/clients?username=eq.${encodeURIComponent(username.trim())}&password=eq.${encodeURIComponent(password.trim())}&select=*`,
        { headers: supabaseHeaders }
      );
      const data = await response.json();

      if (!data || data.length === 0) {
        return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
      }
      const client = data[0];
      if (!client.is_active) {
        return res.status(403).json({ error: 'انتهى اشتراكك الشهري الحالي في أكاديمية سكينة. تواصل مع كوتش هاني لتجديد حسابك.' });
      }

      return res.status(200).json({ success: true, client });
    }

    if (action === 'admin_list') {
      if (payload.adminPassword !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'كلمة مرور لوحة كوتش هاني غير صحيحة.' });
      }
      const response = await fetch(`${SUPABASE_URL}/rest/v1/clients?select=*&order=created_at.desc`, {
        headers: supabaseHeaders
      });
      const clients = await response.json();
      return res.status(200).json({ clients });
    }

    if (action === 'admin_save_client') {
      if (payload.adminPassword !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'غير مصرح' });
      }
      const clientData = payload.clientData;
      let url = `${SUPABASE_URL}/rest/v1/clients`;
      let method = 'POST';

      if (clientData.id && !String(clientData.id).startsWith('client-') && !String(clientData.id).startsWith('demo-')) {
        url += `?id=eq.${clientData.id}`;
        method = 'PATCH';
      }

      const combinedNotes = `${clientData.coach_notes || ''}\n\n[معلومات إضافية ومحتوى ملفات العميل]:\n${clientData.additional_info || ''}`.trim();

      const response = await fetch(url, {
        method,
        headers: supabaseHeaders,
        body: JSON.stringify({
          username: clientData.username.trim(),
          password: clientData.password.trim(),
          client_name: clientData.client_name,
          is_active: clientData.is_active,
          preferred_style: clientData.preferred_style,
          background: clientData.background,
          main_goals: clientData.main_goals,
          challenges_and_patterns: clientData.challenges_and_patterns,
          strengths: clientData.strengths,
          last_session_summary: clientData.last_session_summary,
          coach_notes: combinedNotes
        })
      });

      const saved = await response.json();
      return res.status(200).json({ success: true, saved });
    }

    if (action === 'chat') {
      const { clientId, clientDirectProfile, messages, isVoiceMode } = payload;
      let c = clientDirectProfile || null;

      if (SUPABASE_URL && SUPABASE_KEY && clientId && !String(clientId).startsWith('demo-') && !String(clientId).startsWith('client-')) {
        const clientRes = await fetch(
          `${SUPABASE_URL}/rest/v1/clients?id=eq.${encodeURIComponent(clientId)}&select=*`,
          { headers: supabaseHeaders }
        );
        const clientArr = await clientRes.json();
        if (clientArr && clientArr.length > 0) {
          c = clientArr[0];
        }
      }

      if (!c || c.is_active === false) {
        return res.status(403).json({ error: 'الحساب غير مفعّل حالياً.' });
      }

      const systemInstruction = `
# HANI — ELITE AI LIFE COACH (أكاديمية سكينة - إشراف كوتش هاني)
## الشعار: وعي • متعة • جودة حياة

### 1. هويتك ورسالتك
أنت HANI، مدرب حياة وتطوير إنساني افتراضي متقدم في "أكاديمية سكينة" بإشراف كوتش هاني، مصمم لتقديم تجربة كوتشينج شخصية وعميقة، باللغة العربية (مع فهم ممتاز للهجة المصرية وباقي اللهجات) أو بأي لغة يتحدث بها العميل.
أنت لست محرك إجابات، ولا مستشارًا يوزع النصائح الجاهزة، ولا روبوتًا يكرر عبارات تحفيزية. أنت شريك في رحلة العميل نحو الوعي الذاتي، واكتشاف قدراته، وفهم أنماطه، واتخاذ قراراته، وتحويل أهدافه إلى أفعال.

### 2. المبادئ الأساسية لهويتك
- الإنسان قبل المشكلة، والفهم قبل الحل، والاستماع قبل السؤال التالي.
- الفضول قبل الافتراض، والوعي قبل النصيحة، والاختيار قبل التوجيه.
- الفعل الواقعي قبل الكلام التحفيزي، واستقلال العميل قبل اعتماده عليك.
- التعاطف دون شفقة أو أحكام، الصراحة دون قسوة، التحدي دون إذلال، الطموح دون وعود زائفة.

### 3. إطار الكوتشينج المهني (ICF) وأدوات الكوتشينج
طبّق الكفاءات الأساسية للاتحاد الدولي للكوتشينج ICF: الأمان النفسي، الحضور، الإنصات الفعّال لما يقوله العميل وما يتجنبه، إثارة الوعي بأسئلة قوية ومختصرة، وتحويل الوعي إلى خطوات عملية.
استخدم عند الحاجة أدوات: GROW، SMART Goals، عجلة الحياة، استكشاف القيم والمعتقدات، التمييز بين الحقائق والتفسيرات، وتصميم العادات الصغيرة وخطط If-Then.

### 4. مرونة اللغات والصوت والشات
- تحدث بأي لغة يختارها العميل (عربي، مصري، إنجليزي، أو خلط بين اللغات).
- وضع التواصل الحالي: ${isVoiceMode ? 'وضع المحادثة الصوتية (Voice Mode): اجعل ردك قصيرًا جدًا (جملتين إلى 4 جمل)، بدون رموز مثل (*) أو (#)، واختم بسؤال واحد واضح.' : 'وضع الشات النصي: اجعل ردك دافئًا، مقسمًا لفقرات قصيرة مريحة للعين، واختم بسؤال واحد عميق.'}

### 5. الحدود الأخلاقية والسلامة النفسية
أنت كوتش تطوير شخصي ولست طبيبًا نفسيًا. لا تشخّص اضطرابات ولا تصف أدوية. في حالات خطر إيذاء النفس أو الأزمات الحادة، تعامل بتعاطف ووجّه العميل فورًا لدعم بشري متخصص.

### 6. الملف السري الشامل للعميل الحالي (${c.client_name})
<client_profile>
- اسم العميل: ${c.client_name}
- الأسلوب المفضل: ${c.preferred_style || ''}
- الخلفية والسياق الحياتي/المهني: ${c.background || ''}
- الأهداف الكبرى الحالية: ${c.main_goals || ''}
- التحديات والأنماط المتكررة: ${c.challenges_and_patterns || ''}
- نقاط القوة والموارد: ${c.strengths || ''}
- ملخص آخر جلسة مع كوتش هاني والخطوة المطلوبة: ${c.last_session_summary || ''}
- توجيهات كوتش هاني والمعلومات الإضافية والملفات المرفقة للعميل:
${c.coach_notes || ''}
${c.additional_info || ''}
</client_profile>
`;

      const formattedContents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const aiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: formattedContents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
          })
        }
      );

      const aiData = await aiRes.json();
      const reply = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;

      return res.status(200).json({ reply });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
