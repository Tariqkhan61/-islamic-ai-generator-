/* ============================================
   GEMINI AI SERVERLESS FUNCTION
   Vercel API Route
   Designed by M Tariq Mahboob
   ============================================ */

export default async function handler(req, res) {
  
  // CORS headers (development ke liye)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Sirf POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed. Use POST.' 
    });
  }
  
  try {
    const { topic, type, language, length } = req.body;
    
    // Validation
    if (!topic || topic.trim() === '') {
      return res.status(400).json({ 
        error: 'Topic is required',
        message: 'موضوع لکھنا ضروری ہے'
      });
    }
    
    // API Key check
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ 
        error: 'API key not configured',
        message: 'GEMINI_API_KEY environment variable set nahi hai'
      });
    }
    
    // Build prompt for Gemini
    const prompt = buildPrompt(topic, type, language, length);
    
    console.log('🚀 Sending request to Gemini...');
    console.log('   Topic:', topic);
    console.log('   Type:', type);
    console.log('   Language:', language);
    console.log('   Length:', length);
    
    // Call Gemini API
   const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      })
    });
    
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('❌ Gemini API Error:', errorData);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }
    
    const data = await geminiResponse.json();
    
    // Extract text from response
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No content generated');
    }
    
    console.log('✅ Content generated successfully');
    
    return res.status(200).json({
      success: true,
      content: generatedText,
      meta: {
        topic,
        type,
        language,
        length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    return res.status(500).json({
      success: false,
      error: 'Generation failed',
      message: error.message || 'کچھ غلط ہو گیا، دوبارہ کوشش کریں'
    });
  }
}

/* ============================================
   PROMPT BUILDER
   ============================================ */
function buildPrompt(topic, type, language, length) {
  
  const typeInstructions = {
    quran: 'قرآن مجید کی متعلقہ آیات مع اردو ترجمہ اور مختصر تفسیر شامل کریں۔',
    hadith: 'متعلقہ صحیح احادیث مع حوالہ جات (صحیح بخاری، صحیح مسلم وغیرہ) شامل کریں۔',
    bayan: 'جمعہ یا کسی مناسبت سے مکمل بیان تیار کریں، جس میں تعارف، موضوع کی وضاحت، آیات، احادیث اور اختتام شامل ہو۔',
    post: 'سوشل میڈیا (فیس بک/انسٹاگرام/واٹس ایپ) کے لیے مختصر، دلکش اور شیئر کے قابل پوسٹ بنائیں۔',
    quote: 'اسلامی حکمت بھرے اقوال، بزرگان دین کے فرامین اور نصیحت آمیز باتیں شامل کریں۔',
    dua: 'مسنون دعائیں، اذکار اور وظائف مع اردو ترجمہ اور فضیلت شامل کریں۔'
  };
  
  const lengthInstructions = {
    short: 'مختصر اور جامع (تقریباً 100-150 الفاظ)',
    medium: 'درمیانہ (تقریباً 250-350 الفاظ)',
    long: 'تفصیلی (تقریباً 500-700 الفاظ)'
  };
  
  const languageInstructions = {
    ur: 'اردو زبان میں لکھیں (نستعلیق فونٹ کے مطابق)',
    en: 'Write in English language',
    ar: 'اكتب باللغة العربية'
  };
  
  const typeText = typeInstructions[type] || 'اسلامی مواد تیار کریں۔';
  const lengthText = lengthInstructions[length] || 'درمیانہ';
  const languageText = languageInstructions[language] || 'اردو زبان میں لکھیں';
  
  return `آپ ایک ماہر اسلامی اسکالر اور مصنف ہیں۔

موضوع: ${topic}

ہدایات:
1. ${typeText}
2. ${languageText}
3. لمبائی: ${lengthText}
4. شروع میں "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" لکھیں
5. آخر میں "جزاک الله خیراً" یا کوئی مناسب اختتامیہ لکھیں
6. صرف مستند اسلامی مصادر استعمال کریں
7. خوبصورت انداز میں لکھیں جسے پڑھنے میں لطف آئے
8. نمبر شمار یا بلٹ پوائنٹس استعمال کر سکتے ہیں

اب مواد تیار کریں:`;
}