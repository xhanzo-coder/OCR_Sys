import { NextResponse } from 'next/server';

// 定义从前端接收到的请求体的数据结构
interface RequestBody {
  imageBase64: string;
}

// 这是我们的主要处理函数，处理来自前端的 POST 请求
export async function POST(request: Request) {
  try {
    // 1. 从请求中解析出 JSON 数据
    const body: RequestBody = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    // 2. 从服务器的环境变量中获取你的 API Key
    // const apiKey = process.env.ARK_API_KEY;
    // 临时解决方案：直接硬编码API密钥（仅用于测试）
    const apiKey = "2a478b88-f8e9-4003-a1d2-b6414eb1a1c8";
    
    if (!apiKey) {
      console.error('API key is not configured. Make sure ARK_API_KEY is in your .env.local file.');
      return NextResponse.json({ error: 'API key is not configured on the server' }, { status: 500 });
    }

    console.log('使用API密钥:', apiKey);

    // 3. 设计我们的专属提示词 (Prompt) - 只请求文本和位置信息
    const ocrPrompt = `
      你是一个专业的OCR（光学字符识别）助手。请分析我提供的这张图片。
      请识别出图片中所有的文字内容，并提供每个文字块的位置信息。
      
      请必须以一个纯粹的JSON对象的格式返回你的结果，不要有任何额外的解释。JSON结构如下：

      {
        "text_blocks": [
          {
            "text": "识别出的文字内容",
            "position": {
              "x": 左上角x坐标（相对于图片宽度的百分比，0-1之间的小数）,
              "y": 左上角y坐标（相对于图片高度的百分比，0-1之间的小数）,
              "width": 文字块宽度（相对于图片宽度的百分比，0-1之间的小数）,
              "height": 文字块高度（相对于图片高度的百分比，0-1之间的小数）
            }
          },
          // 更多文字块...
        ],
        "full_text": "所有识别出的文字内容拼接在一起"
      }
    `;

    // 4. 构建发送给火山引擎的请求体
    const payload = {
      // model: 'doubao-1.5-vision-pro-250328',
      model: 'doubao-1.5-vision-lite-250315',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: ocrPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64, 
              },
            },
          ],
        },
      ],
      // 关键修复：增加 max_tokens 参数，允许模型生成更长的响应
      max_tokens: 16384, 
      response_format: { type: "json_object" },
    };

    console.log('发送请求到火山引擎API...');

    // 5. 发送请求到火山引擎
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    console.log('收到响应，状态码:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from Volcengine:', errorData);
      return NextResponse.json({ error: 'Failed to get response from AI model', details: errorData }, { status: response.status });
    }

    // 6. 解析来自火山引擎的成功响应
    const data = await response.json();
    console.log('成功获取API响应');
    
    // 我们期望返回的内容在 choices[0].message.content 中
    const contentString = data.choices?.[0]?.message?.content;
    if (!contentString) {
      console.error('响应结构无效:', JSON.stringify(data));
      throw new Error("Invalid response structure from AI model");
    }

    console.log('收到内容字符串，长度:', contentString.length);

    // 将这个JSON字符串解析成一个真正的JavaScript对象
    const parsedContent = JSON.parse(contentString);
    console.log('成功解析内容');

    // 7. 将解析后的结果返回给前端
    return NextResponse.json(parsedContent);

  } catch (error: any) {
    console.error('Error in /api/ocr:', error.message);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
  }
}
