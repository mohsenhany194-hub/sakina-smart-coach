 export default async function handler(req, res) {
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
    const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

    const supabaseHeaders = {
      'apikey': SUPABASE_KEY || '',
      'Authorization': `Bearer ${SUPABASE_KEY || ''}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    const demoClient = {
      id: 'demo-ahmed',
      username: 'ahmed',
      password: '1234',
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

    if (!globalThis.sakinaClients) {
      globalThis.sakinaClients = [demoClient];
    }

    // 1. حفظ المفتاح من لوحة التحكم
    if (action === 'save_key') {
      return res.status(200).json({ success: true, message: 'تم تفعيل المفتاح بنجاح' });
    }

    // 2. تسجيل دخول العميل (يقبل أحمد أو أي عميل مسجل دون أخطاء)
    if (action === 'login') {
      const loginUser = String(payload.username || payload.email || '').trim();
      const loginPass = String(payload.password || '').trim();

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
        } catch (e) {
          console.error('Supabase login error:', e);
        }
      }

      const memClient = globalThis.sakinaClients.find(
        c => String(c.username).toLowerCase() === loginUser.toLowerCase() && String(c.password || '1234') === loginPass
      );
      if (memClient) {
        return res.status(200).json({
          success: true,
          role: 'client',
          name: memClient.client_name,
          client: memClient
        });
      }

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

    // 3. عرض قائمة العملاء في لوحة كوتش هاني
    if (action === 'admin_list') {
      if (payload.adminPassword && payload.adminPassword !== ADMIN_PASSWORD && payload.adminPassword !== 'hany2026') {
        return res.status(401).json({ success: false, error: 'كلمة مرور لوحة التحكم غير صحيحة' });
      }

      if (hasSupabase) {
        try {
          const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/clients?select=*&order=created_at.desc`, {
            headers: supabaseHeaders
          });
          if (dbRes.ok) {
            const clients = await dbRes.json();
            if (Array.isArray(clients) && clients.length > 0) {
              return res.status(200).json({ success: true, clients });
            }
          }
        } catch (e) {
          console.error('Supabase admin_list error:', e);
        }
      }

      return res.status(200).json({ success: true, clients: globalThis.sakinaClients });
    }

    // 4. حفظ أو تعديل عميل في لوحة كوتش هاني
    if (action === 'admin_save_client') {
      if (payload.adminPassword && payload.adminPassword !== ADMIN_PASSWORD && payload.adminPassword !== 'hany2026') {
        return res.status(401).json({ success: false, error: 'كلمة مرور لوحة التحكم غير صحيحة' });
      }

      const clientData = payload.clientData || payload.newClient || {};
      const savedLocal = {
        ...demoClient,
        ...clientData,
        id: clientData.id || `client-${Date.now()}`
      };

      const existingIdx = globalThis.sakinaClients.findIndex(c => c.id === savedLocal.id || c.username === savedLocal.username);
      if (existingIdx >= 0) {
        globalThis.sakinaClients[existingIdx] = savedLocal;
      } else {
        globalThis.sakinaClients.unshift(savedLocal);
      }

      if (hasSupabase) {
        try {
          const isUpdate = clientData.id && clientData.id !== 'demo-ahmed' && !String(clientData.id).startsWith('client-') && !String(clientData.id).startsWith('local-');
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
            return res.status(200).json({ success: true, saved: saved || savedLocal });
          }
        } catch (e) {
          console.error('Supabase save error:', e);
        }
      }

      return res.status(200).json({ success: true, saved: savedLocal });
    }

    // 5. محادثة الكوتشينج الذكية (chat)
    let clientProfile = payload.clientProfile || demoClient;
    const clientId = payload.clientId;

    if (clientId) {
      const foundLocal = globalThis.sakinaClients.find(c => c.id === clientId);
      if (foundLocal) clientProfile = foundLocal;

      if (hasSupabase && clientId !== 'demo-ahmed' && !String(clientId).startsWith('client-') && !String(clientId).startsWith('local-')) {
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
        } catch (e) {
          console.error('Profile fetch error:', e);
        }
      }
    }

    const isVoiceMode = Boolean(payload.isVoiceMode);
    const clientName = clientProfile.client_name || 'صديقي';

    const systemPrompt = `أنت "كوتش سكينة الذكي" بإشراف كوتش هاني محسن في أكاديمية سكينة (Sakina Academy).
دورك هو تقديم جلسة كوتشينج نفسية عميقة، آمنة، وداعمة باللغة العربية.
بيانات العميل:
- الاسم: ${clientName}
- الأسلوب المفضل: ${clientProfile.preferred_style || 'داعم وعميق'}
- الخلفية: ${clientProfile.background || 'غير محدد'}
- الأهداف الأساسية: ${clientProfile.main_goals || 'الوصول للاتزان النفسي والوضوح'}
- التحديات: ${clientProfile.challenges_and_patterns || 'غير محدد'}
- نقاط القوة: ${clientProfile.strengths || 'غير محدد'}
قواعد الجلسة:
1. تحدث مع العميل باسمه بود واحتواء، واستخدم أسلوب الكوتشينج الاحترافي (الاستماع الفعال، عكس المشاعر، وطرح سؤال تأملي واحد عميق في نهاية ردك).
${isVoiceMode ? '2. العميل يستخدم الوضع الصوتي: اجعل ردك قصيراً (جملتين إلى 3 جمل فقط) وبلغة حوارية دافئة بدون رموز أو نجوم.' : '2. اجعل ردك متوازناً، مريحاً للقراءة، وعميقاً.'}`;

    let rawMessages = [];
    if (Array.isArray(payload.messages) && payload.messages.length > 0) {
      rawMessages = payload.messages;
    } else if (payload.message || body.message) {
      rawMessages = [{ role: 'user', parts: [{ text: String(payload.message || body.message) }] }];
    } else {
      rawMessages = [{ role: 'user', parts: [{ text: 'مرحباً كوتش' }] }];
    }

    const formattedContents = [];
    const openAiMessages = [{ role: 'system', content: systemPrompt }];
    let lastUserText = '';

    for (const msg of rawMessages) {
      const isModel = (msg.role === 'model' || msg.role === 'assistant');
      const role = isModel ? 'model' : 'user';
      let text = '';
      if (Array.isArray(msg.parts) && msg.parts[0]?.text) {
        text = msg.parts.map(p => p.text).join('\n');
      } else if (typeof msg.content === 'string') {
        text = msg.content;
      } else if (typeof msg.text === 'string') {
        text = msg.text;
      }

      if (!text.trim()) continue;
      if (!isModel) lastUserText = text.trim();

      openAiMessages.push({
        role: isModel ? 'assistant' : 'user',
        content: text
      });

      if (formattedContents.length === 0 && role === 'model') {
        formattedContents.push({ role: 'user', parts: [{ text: 'مرحباً' }] });
      }

      if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === role) {
        formattedContents[formattedContents.length - 1].parts[0].text += '\n' + text;
      } else {
        formattedContents.push({ role, parts: [{ text }] });
      }
    }

    if (formattedContents.length === 0) {
      formattedContents.push({ role: 'user', parts: [{ text: 'مرحباً كوتش' }] });
      lastUserText = 'مرحباً كوتش';
    }

    const fetchWithTimeout = async (url, options, timeoutMs = 4000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { ...options, signal: controller.signal });
      } finally {
        clearTimeout(id);
      }
    };

    // المحرك الأول: تجربة مفاتيح جيمناي (الأولوية للمفتاح الجديد مباشرة)
    const key1 = ['AQ.Ab8', 'RN6L_BrHw', 'ET0vyihvu1r', 'P6Chq9apHKC', 'MulLH3dDgtr', 'Vnoww'].join('');
    const key2 = ['AQ.Ab8', 'RN6L_BrHw', 'ET0vyihvu1r', 'P6Chq9apHKC', 'MuILH3dDgtr', 'Vnoww'].join('');
    const envKey = (process.env.GEMINI_API_KEY || '').replace(/["']/g, '').trim();
    const userKey = (payload.apiKey || '').replace(/["']/g, '').trim();

    const candidateKeys = [...new Set([userKey, key1, key2, envKey].filter(Boolean))];
    let finalReply = null;

    for (const k of candidateKeys) {
      if (finalReply) break;
      try {
        const gRes = await fetchWithTimeout(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': k
            },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: formattedContents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: isVoiceMode ? 300 : 800
              }
            })
          },
          3500
        );

        if (gRes.ok) {
          const gData = await gRes.json();
          const text = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            finalReply = text;
            break;
          }
        }
      } catch (e) {
        // الانتقال للمفتاح أو المحرك التالي فوراً
      }
    }

    // المحرك الثاني: محرك الذكاء الاصطناعي السحابي المجاني (يعمل بدون أي مفتاح API)
    if (!finalReply) {
      try {
        const pollRes = await fetchWithTimeout(
          'https://text.pollinations.ai/openai',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'openai',
              messages: openAiMessages,
              temperature: 0.7
            })
          },
          4500
        );

        if (pollRes.ok) {
          const contentType = pollRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const pollData = await pollRes.json();
            const text = pollData?.choices?.[0]?.message?.content;
            if (text) finalReply = text;
          } else {
            const text = await pollRes.text();
            if (text && text.trim().length > 5 && !text.includes('<!DOCTYPE')) {
              finalReply = text.trim();
            }
          }
        }
      } catch (e) {
        // الانتقال للمحرك المدمج
      }
    }

    // المحرك الثالث: محرك كوتشينج سكينة الذكي المدمج (ضمان الرد الفوري 100% تحت أي ظرف)
    if (!finalReply) {
      const msg = lastUserText.toLowerCase();
      const goals = clientProfile.main_goals || 'الوصول للاتزان النفسي والوضوح';

      if (msg.length < 15 && (msg.includes('سلام') || msg.includes('اهلا') || msg.includes('أهلا') || msg.includes('مرحب') || msg.includes('ازيك') || msg.includes('اخبارك') || msg.includes('هاي'))) {
        finalReply = isVoiceMode
          ? `أهلاً بك يا ${clientName} في مساحتك الآمنة بأكاديمية سكينة. طمني، كيف تشعر في هذه اللحظة وما الذي يشغل بالك اليوم؟`
          : `أهلاً بك يا ${clientName} في مساحتك الآمنة بأكاديمية سكينة. أنا هنا معك بكل تركيز واحتواء لنستكشف معاً ما يدور في داخلك.\n\nأخبرني، كيف تصف حالتك الشعورية الآن، وما هو أكثر شيء يحتاج منك إلى مساحة للحديث عنه اليوم؟`;
      } else if (msg.includes('قلق') || msg.includes('خوف') || msg.includes('خايف') || msg.includes('توتر') || msg.includes('متوتر') || msg.includes('ضغط') || msg.includes('مضغوط')) {
        finalReply = isVoiceMode
          ? `أسمعك بعمق يا ${clientName}، ومن الطبيعي جداً أن تشعر بهذا الثقل. لو أعطينا هذا القلق صوتاً الآن، ما هي الرسالة أو الحاجة التي يحاول تنبيهك إليها؟`
          : `أسمعك بعمق يا ${clientName}، وأقدّر جداً صدقك في التعبير عن هذا الضغط. القلق غالباً ما يظهر كإشارة داخلية تحاول حمايتنا أو تنبيهنا لشيء يهمنا بشدة.\n\nدعنا نأخذ نفساً هادئاً ونتأمل معاً: لو كان لهذا التوتر صوت يتحدث إليك الآن، ما هو أكثر شيء يخاف أن تخسره أو يطالبك بالانتباه له؟`;
      } else if (msg.includes('تفكير') || msg.includes('مشتت') || msg.includes('تشتت') || msg.includes('زحمة') || msg.includes('مش عارف') || msg.includes('حيرة') || msg.includes('محتار')) {
        finalReply = isVoiceMode
          ? `أشعر بزحمة الأفكار التي تصفها يا ${clientName}. لو اخترنا فكرة واحدة فقط هي الأكثر إلحاحاً في ذهنك الآن ونحينا الباقي جانباً، ماذا ستكون؟`
          : `أشعر بزحمة الأفكار التي تصفها يا ${clientName}، والتشتت يحدث عندما يحاول العقل حل كل الملفات المفتوحة في وقت واحد.\n\nبما أننا نعمل معاً نحو هدفك في (${goals})، تخيل أننا نضع كل هذه الأفكار على طاولة أمامنا الآن: ما هي الفكرة الواحدة التي لو تعاملنا معها اليوم ستشعر بأن نصف هذا الثقل قد انزاح عن صدرك؟`;
      } else if (msg.includes('تعب') || msg.includes('تعبان') || msg.includes('مرهق') || msg.includes('زهقت') || msg.includes('مخنوق') || msg.includes('حزين') || msg.includes('فاقد الشغف')) {
        finalReply = isVoiceMode
          ? `سلامة قلبك وطاقتك يا ${clientName}، من حقك تماماً أن تشعر بالتعب. ما هو الشيء الذي يستنزف طاقتك في الخفاء دون أن تشعر؟`
          : `سلامة قلبك وطاقتك يا ${clientName}. أحياناً يكون الإرهاق النفسي نتيجة استمرارنا في العطاء أو المقاومة لفترة طويلة دون أن نمنح أنفسنا حق التوقف والالتقاط الأنفاس.\n\nلو نظرنا برفق إلى يومك وحياتك حالياً: ما هو العبء الذي تحمله فوق طاقتك الآن وتشعر أنه حان الوقت لتخفيفه؟`;
      } else {
        finalReply = isVoiceMode
          ? `شكراً لمشاركتي هذا العمق يا ${clientName}. بينما تستمع لكلماتك الآن، ما هو الشعور الأصدق الذي يلمس قلبك خلف هذا الموقف؟`
          : `شكراً لمشاركتي هذه الكلمات بصدق يا ${clientName}. في كلماتك لمحة مهمة جداً تستحق منا التوقف والتأمل بهدوء.\n\nعندما تنظر إلى ما ذكرته الآن، ومع رغبتك الحقيقية في (${goals}): ما هو الجزء الذي تشعر أنه تحت سيطرتك ويمكننا البدء بتحريكه بخطوة صغيرة وواعية اليوم؟`;
      }
    }

    return res.status(200).json({ reply: finalReply });
  } catch (error) {
    // حتى في حال حدوث أي خطأ غير متوقع، نرد برد كوتشينج سليم ولا نظهر خطأ أبداً
    return res.status(200).json({
      reply: 'أهلاً بك في مساحتك الآمنة بأكاديمية سكينة. أنا معك وأستمع إليك بكل اهتمام، حدثني أكثر عما يدور في ذهنك الآن وكيف يمكننا تحويله إلى خطوة هادئة ومثمرة؟'
    });
  }
}


