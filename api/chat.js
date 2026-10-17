
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, action, email, password } = req.body;

  if (action === 'login') {
    if (email === 'ahmed' && password === '1234') {
      return res.status(200).json({ success: true, role: 'client', name: 'أحمد' });
    }
    return res.status(401).json({ success: false, error: 'بيانات الدخول غير صحيحة' });
  }

  if (action === 'save_key') {
    return res.status(200).json({ success: true, message: "تم تفعيل المفتاح بنجاح" });
  }

  const apiKey = process.env.GEMINI_API_KEY || req.body.apiKey;

  if (!apiKey) {
    return res.status(400).json({ error: 'عذراً، مفتاح الذكاء الاصطناعي غير موجود.' });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ 
            text: `أنت كوتش حياة محترف وداعم نفسي في أكاديمية سكينة. العميل يقول لك: "${message}". رد عليه بأسلوب كوتشينج عميق، داعم، ومختصر.` 
          }] 
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'خطأ في الاتصال بجيمناي');
    }

    const reply = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ reply: reply });
    
  } catch (error) {
    return res.status(500).json({ error: 'حدث خطأ أثناء التفكير: ' + error.message });
  }
}
