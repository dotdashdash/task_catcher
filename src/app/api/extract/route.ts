import { NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * 备用兜底提取函数 (纯本地演算)
 */
function fallbackExtraction(text: string, messageId: string) {
    const cleanText = text.replace(/^(王总|老板|大家|Hi|Hello)[，、,]/, '').trim();
    const task_title = cleanText.length > 20 ? cleanText.substring(0, 20) + '...' : cleanText;

    const now = new Date();
    const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const t1 = new Date(tmrw); t1.setHours(10, 0, 0, 0);
    const t2 = new Date(tmrw); t2.setHours(14, 0, 0, 0);
    const t3 = new Date(tmrw); t3.setHours(16, 0, 0, 0);

    return {
        task_title: `(Fallback) ${task_title}`,
        original_context_link: `#${messageId}`,
        stakeholders: ['System'],
        time_suggestions: [t1.toISOString(), t2.toISOString(), t3.toISOString()],
        matrix_quadrant: text.includes('紧急') ? 'urgent-important' : 'important-not-urgent',
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

        if (!process.env.DEEPSEEK_API_KEY) {
            console.warn('⚠️ 未检测到 DEEPSEEK_API_KEY，启用兜底数据。');
            return NextResponse.json({ success: true, data: fallbackExtraction(chatText, messageId) });
        }

        // ===== JS 日历预计算（注入 Prompt，彻底消灭模型时间幻觉）=====
        const now = new Date();

        // 计算下一个指定星期几的日期（下周 = 必须跨过本周日）
        const getNextWeekday = (base: Date, targetDay: number): Date => {
            const d = new Date(base);
            d.setHours(0, 0, 0, 0);
            // 距离目标星期几的天数，至少 1 天
            let daysUntil = (targetDay - d.getDay() + 7) % 7;
            if (daysUntil === 0) daysUntil = 7; // 如果今天就是目标星期，则推到下周同一天
            d.setDate(d.getDate() + daysUntil);
            return d;
        };

        const today = new Date(now); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

        // 下周（本周日之后）的各工作日  ——  先找到"下周一"，再基于它计算
        const nextMonday = getNextWeekday(today, 1);   // 星期一 = 1
        const nextTuesday = new Date(nextMonday); nextTuesday.setDate(nextMonday.getDate() + 1);
        const nextWednesday = new Date(nextMonday); nextWednesday.setDate(nextMonday.getDate() + 2);
        const nextThursday = new Date(nextMonday); nextThursday.setDate(nextMonday.getDate() + 3);
        const nextFriday = new Date(nextMonday); nextFriday.setDate(nextMonday.getDate() + 4);

        // 本周（当天往后的工作日）
        const thisWeekdays: Date[] = [];
        for (let i = 1; i <= 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            if (d.getDay() >= 1 && d.getDay() <= 5 && d < nextMonday) thisWeekdays.push(d);
        }

        const fmtDate = (d: Date) => d.toLocaleDateString('zh-CN', {
            timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', weekday: 'short',
        });
        const fmtISO = (d: Date, h: number, m = 0) => {
            const dt = new Date(d); dt.setHours(h, m, 0, 0); return dt.toISOString();
        };

        // 向模型提供明确的日历对照表，要求其直接引用数字，禁止推算
        const calendarContext = `
今天      = ${fmtDate(today)}  (ISO date ${today.toISOString().slice(0, 10)})
明天      = ${fmtDate(tomorrow)}  (ISO date ${tomorrow.toISOString().slice(0, 10)})
下周一    = ${fmtDate(nextMonday)}  (ISO date ${nextMonday.toISOString().slice(0, 10)})
下周二    = ${fmtDate(nextTuesday)}  (ISO date ${nextTuesday.toISOString().slice(0, 10)})
下周三    = ${fmtDate(nextWednesday)}  (ISO date ${nextWednesday.toISOString().slice(0, 10)})
下周四    = ${fmtDate(nextThursday)}  (ISO date ${nextThursday.toISOString().slice(0, 10)})
下周五    = ${fmtDate(nextFriday)}  (ISO date ${nextFriday.toISOString().slice(0, 10)})
本周剩余工作日 = ${thisWeekdays.map(d => fmtDate(d)).join(' / ') || '无（今天已是周末或本周最后工作日）'}`;

        const systemPrompt = `你是一个没有感情的 B 端任务提取机器。请严格参考以下系统日历：
${calendarContext}

【最高红线警告 - 违者将导致系统崩溃】

1. 严禁自行推算日期：当用户提到"明天"、"下周一"、"下周二"等时，你必须直接照抄系统日历中对应行的 ISO date，绝对不允许自己做任何加减法。

2. 严禁非工作时间：你生成的 time_suggestions 中的每个时间戳，其对应的本地时刻必须严格在 09:00（含）到 18:00（不含）之间。绝对不允许出现 18:00 及之后的时间段（如 18:00、19:00、22:00、00:00 等）。请在确认时区后生成 ISO 8601 时间戳（时区为 UTC+8，即中国标准时间）。

3. 死线前置：如果用户说"XX之前"或"Deadline 是"，所有 3 个建议时间必须早于或等于该死线日期。

4. 主体视角与责任界定 (Task Ownership)：触发此提取动作的是正在阅读这些消息的"当前用户"（即接收方）。你必须仔细分析聊天上下文的语态。你提取的 task_title 必须是当前用户需要去执行、回复或跟进的核心动作。如果对方只是在陈述与当前用户无关的事情，请提取为"知悉：[相关事情]"。任务标题必须以第一人称执行者的视角来撰写（例如：对方说"你帮我 review 代码"，标题应精炼为"review 鉴权代码"而不是"他需要 review 代码"；对方说"让小李去补数据"，这是别人做的事，请提取为"知悉：小李补数据"）。

5. 任务降噪：若文本中混有多个任务，只提取商业价值最高的核心工作任务。

【你的输出必须是且只能是一段合法的 JSON 对象，绝对不含任何 Markdown 标记或解释文字】

JSON 字段要求：
- task_title: 不超过 15 字的任务名
- original_context_link: "#${messageId}"
- stakeholders: 人名或职位数组
- time_suggestions: 3 个 ISO 8601 时间戳字符串数组，所有时间本地时刻必须在 09:00–17:30 之间
- matrix_quadrant: 必须从以下 4 个英文值中选一个（一字不差）：
  "urgent-important" | "important-not-urgent" | "urgent-not-important" | "not-urgent-not-important"`;

        const completion = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `请提取以下聊天内容中的任务：\n"${chatText}"` },
            ],
            max_tokens: 400,
            temperature: 0.1,   // 降低随机性，减少"创意推算"
            response_format: { type: 'json_object' },
        });

        let rawContent = completion.choices[0].message.content ?? '';
        rawContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let extractionResult;
        try {
            extractionResult = JSON.parse(rawContent);
            if (!Array.isArray(extractionResult.time_suggestions) || !Array.isArray(extractionResult.stakeholders)) {
                throw new Error('缺少关键数组字段');
            }
            extractionResult.original_context_link = `#${messageId}`;
        } catch (parseError) {
            console.error('❌ JSON 解析失败，原文:', rawContent, parseError);
            extractionResult = fallbackExtraction(chatText, messageId);
        }

        return NextResponse.json({ success: true, data: extractionResult });

    } catch (error) {
        console.error('❌ API Route 全局异常，触发 Fallback:', error);
        return NextResponse.json({
            success: true,
            data: fallbackExtraction('任务处理失败', 'err_101'),
        });
    }
}
