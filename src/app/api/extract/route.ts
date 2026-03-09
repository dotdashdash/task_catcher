import { NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * 备用兜底提取函数 (纯本地演算)
 */
function fallbackExtraction(text: string, messageId: string, errorReason?: string) {
    const cleanText = text.replace(/^(王总|老板|大家|Hi|Hello|Dash)[，、,]/, '').trim();
    const task_title = cleanText.length > 20 ? cleanText.substring(0, 20) + '...' : cleanText;

    const now = new Date();
    const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const t1 = new Date(tmrw); t1.setHours(10, 0, 0, 0);
    const t2 = new Date(tmrw); t2.setHours(14, 0, 0, 0);
    const t3 = new Date(tmrw); t3.setHours(16, 0, 0, 0);

    return {
        task_title: `(Fallback) ${task_title}`,
        original_context_link: `#${messageId}`,
        stakeholders: errorReason ? [errorReason] : ['System'],
        time_suggestions: [t1.toISOString(), t2.toISOString(), t3.toISOString()],
        matrix_quadrant: text.includes('紧急') || text.includes('快') ? 'urgent-important' : 'important-not-urgent',
    };
}

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY ?? 'placeholder',
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { chatText, messageId } = body;

        if (!chatText || !messageId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'placeholder') {
            console.warn('⚠️ 未检测到有效 DEEPSEEK_API_KEY，启用兜底数据。');
            return NextResponse.json({ success: true, data: fallbackExtraction(chatText, messageId, 'No API Key') });
        }

        const today = new Date();
        const calendarContext = `今天 = ${today.toLocaleDateString('zh-CN')} (ISO: ${today.toISOString().slice(0, 10)})`;

        const systemPrompt = `你是一个 B 端任务提取机器。请严格根据聊天内容提取任务。
日历参考：${calendarContext}

【输出要求】
1. 必须是合法 JSON，不要 Markdown 代码块。
2. task_title: 提取核心动作，第一人称执行视角。
3. matrix_quadrant: 从 "urgent-important", "important-not-urgent", "urgent-not-important", "not-urgent-not-important" 中选一。
4. time_suggestions: 3个建议时段的 ISO 8601 字符串（本地 09:00-18:00）。

JSON 结构：
{
  "task_title": "...",
  "stakeholders": ["..."],
  "time_suggestions": ["...", "...", "..."],
  "matrix_quadrant": "..."
}`;

        const completion = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: chatText },
            ],
            temperature: 0.1,
            // 确保强制返回 JSON 格式，防止大模型乱吐 markdown
            response_format: { type: 'json_object' }
        });

        const rawContent = completion.choices[0].message.content ?? '{}';

        try {
            const extractionResult = JSON.parse(rawContent);
            // 补充缺失字段
            extractionResult.original_context_link = `#${messageId}`;
            if (!extractionResult.stakeholders) extractionResult.stakeholders = [];

            return NextResponse.json({ success: true, data: extractionResult });
        } catch (parseError) {
            console.error('❌ 解析大模型返回 JSON 失败:', rawContent);
            return NextResponse.json({ success: true, data: fallbackExtraction(chatText, messageId, 'Parse Error') });
        }

    } catch (error: any) {
        console.error('❌ API 提取异常:', error);
        // 如果是 API 错误（如 Proxy 拒绝或超时），返回 fallback 确保前端不崩溃
        return NextResponse.json({
            success: true,
            data: fallbackExtraction('提取接口异常', 'err_api', error.message || 'Unknown'),
        });
    }
}
