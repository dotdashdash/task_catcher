"use client";

import { useState, useRef, useEffect } from 'react';
import {
    Loader2,
    Sparkles,
    Link as LinkIcon,
    CheckCircle2,
    MoreHorizontal,
    Clock,
    Users,
    Send,
    UserCircle2
} from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ExtractedData {
    task_title: string;
    original_context_link: string;
    stakeholders: string[];
    time_suggestions: string[];
    matrix_quadrant: string;
}

interface ConfirmedTask extends ExtractedData {
    id: string;
    confirmed_time: string;
}

interface ChatMessage {
    id: string;
    sender: string;
    time: string;
    text: string;
    isMe: boolean;
}

const INITIAL_MESSAGES: ChatMessage[] = [
    { id: "msg_1", sender: "王总 (Boss)", time: "09:00 AM", text: "Dash，今天下班前你先把 Q3 的产品架构图画出来，具体的数据指标让数据组的小李明天去补。", isMe: false },
    { id: "msg_2", sender: "Alice (Finance)", time: "09:30 AM", text: "我昨天已经把上个月的财务报表发给王总了，王总说没问题，你这边知悉一下就行。", isMe: false },
    { id: "msg_3", sender: "老张 (R&D)", time: "10:15 AM", text: "我这边的接口联调有点卡住了，下周一上午你有空的话，能不能帮我 review 一下那段鉴权代码？", isMe: false },
    { id: "msg_4", sender: "小王 (PM)", time: "11:00 AM", text: "我明后天休年假，原定明天下午 2 点的需求评审会，就拜托你替我主持一下啦。", isMe: false },
    { id: "msg_5", sender: "Me", time: "11:05 AM", text: "收到，都没问题，我这就用 AI 提取一下排进日程。", isMe: true },
];

function formatTimeSlot(isoString: string) {
    try {
        const start = new Date(isoString);
        if (isNaN(start.getTime())) throw new Error("Invalid date");
        const end = addMinutes(start, 30);
        const datePart = format(start, 'M月d日 (EEEE)', { locale: zhCN });
        const timePart = `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
        return { datePart, timePart };
    } catch {
        return { datePart: "待定", timePart: "未知时间" };
    }
}

function QuadrantBox({ title, tasks, type }: { title: string; tasks: ConfirmedTask[]; type: string }) {
    const styles: Record<string, string> = {
        'urgent-important': 'bg-red-50/30 border-red-100/50',
        'important-not-urgent': 'bg-orange-50/30 border-orange-100/50',
        'urgent-not-important': 'bg-blue-50/30 border-blue-100/50',
        'not-urgent-not-important': 'bg-gray-50 border-gray-100',
    };
    const headerColors: Record<string, string> = {
        'urgent-important': 'text-red-700 bg-red-100/50',
        'important-not-urgent': 'text-orange-700 bg-orange-100/50',
        'urgent-not-important': 'text-blue-700 bg-blue-100/50',
        'not-urgent-not-important': 'text-gray-600 bg-gray-100',
    };

    return (
        <div className={`rounded-xl border flex flex-col overflow-hidden p-4 ${styles[type] ?? styles['not-urgent-not-important']}`}>
            <div className={`w-fit px-2.5 py-1 rounded text-xs font-bold tracking-wide mb-3 ${headerColors[type] ?? headerColors['not-urgent-not-important']}`}>
                {title}
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
                {tasks.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm border border-dashed border-gray-300 rounded-lg text-gray-400 font-medium">
                        (Empty)
                    </div>
                ) : (
                    tasks.map(t => {
                        const { datePart, timePart } = formatTimeSlot(t.confirmed_time);
                        return (
                            <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow animate-in slide-in-from-bottom-2 fade-in duration-300">
                                <p className="text-[13px] font-semibold text-gray-800 leading-snug">{t.task_title}</p>
                                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center text-xs text-gray-500 font-medium tracking-tight">
                                        <Clock className="w-3.5 h-3.5 mr-1" />
                                        {datePart.split(' ')[0]} {timePart}
                                    </div>
                                    <div className="flex -space-x-1.5">
                                        {t.stakeholders.slice(0, 2).map((s, i) => (
                                            <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 border border-white flex items-center justify-center text-[9px] font-bold text-indigo-700 uppercase ring-1 ring-black/5" title={s}>
                                                {s[0]}
                                            </div>
                                        ))}
                                        {t.stakeholders.length > 2 && (
                                            <div className="w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[9px] font-bold text-gray-500">...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default function ClientApp() {
    const [isExtracting, setIsExtracting] = useState(false);
    const [draftTask, setDraftTask] = useState<ExtractedData | null>(null);
    const [tasks, setTasks] = useState<ConfirmedTask[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
    const [inputValue, setInputValue] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = () => {
        if (!inputValue.trim()) return;
        const newMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            sender: "Me",
            time: format(new Date(), "h:mm a"),
            text: inputValue.trim(),
            isMe: true,
        };
        setMessages(prev => [...prev, newMessage]);
        setInputValue("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    const handleExtract = async (text: string, id: string) => {
        setIsExtracting(true);
        try {
            const res = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatText: text, messageId: id })
            });
            const json = await res.json();
            if (json.success && json.data) {
                setDraftTask(json.data);
            }
        } catch (e) {
            console.error("Fetch 请求提取任务失败:", e);
        } finally {
            setIsExtracting(false);
        }
    };

    const confirmTask = (time: string) => {
        if (!draftTask) return;
        const newTask: ConfirmedTask = { id: Date.now().toString(), ...draftTask, confirmed_time: time };
        setTasks(prev => [...prev, newTask]);
        setDraftTask(null);
    };

    const urgentImportant = tasks.filter(t => t.matrix_quadrant === 'urgent-important');
    const importantNotUrgent = tasks.filter(t => t.matrix_quadrant === 'important-not-urgent');
    const urgentNotImportant = tasks.filter(t => t.matrix_quadrant === 'urgent-not-important');
    const neither = tasks.filter(t => t.matrix_quadrant === 'not-urgent-not-important');

    return (
        <main className="flex h-screen w-full overflow-hidden bg-gray-50 text-gray-900 font-sans">
            {/* 左栏：聊天模拟器 */}
            <section className="w-[40%] flex flex-col bg-white border-r border-gray-200 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.05)] z-10">
                <header className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">T</div>
                        <h2 className="font-semibold text-gray-800 tracking-tight">Team Sync</h2>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-gray-400" />
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-3 group ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                            <UserCircle2 className="w-8 h-8 text-gray-300 flex-shrink-0" />
                            <div className={`flex-1 max-w-[85%] ${msg.isMe ? 'flex flex-col items-end' : ''}`}>
                                <div className={`flex items-baseline gap-2 mb-1 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-sm font-medium text-gray-700">{msg.sender}</span>
                                    <span className="text-xs text-gray-400">{msg.time}</span>
                                </div>
                                <div className={`flex items-center gap-2 relative ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                                    <div className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed w-fit border shadow-sm transition-colors duration-200 break-words max-w-full ${msg.isMe ? 'bg-indigo-600 text-white rounded-tr-sm border-indigo-700' : 'bg-indigo-50 text-indigo-900 rounded-tl-sm border-indigo-100/50 group-hover:bg-indigo-100/50 group-hover:border-indigo-200'}`}>
                                        {msg.text}
                                    </div>
                                    <button
                                        onClick={() => handleExtract(msg.text, msg.id)}
                                        disabled={isExtracting}
                                        className={`absolute ${msg.isMe ? '-left-2 -translate-x-full' : '-right-2 translate-x-full'} top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-semibold text-indigo-600 transition-all duration-300 opacity-0 ${msg.isMe ? 'mr-2 group-hover:mr-0' : '-ml-2 group-hover:ml-0'} group-hover:opacity-100 hover:border-indigo-300 hover:shadow hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed z-10 whitespace-nowrap`}
                                    >
                                        {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                        {isExtracting ? '提取中...' : '提取任务'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="h-20 border-t border-gray-100 px-6 py-4 bg-white shrink-0">
                    <div className="bg-gray-100 h-full rounded-lg flex items-center px-4 justify-between text-gray-700 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            className="bg-transparent border-none outline-none flex-1 py-2 text-sm placeholder:text-gray-400"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button onClick={handleSendMessage} disabled={!inputValue.trim()} className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50 p-2">
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </section>

            {/* 右栏：任务控制台 */}
            <section className="w-[60%] flex flex-col relative px-8 py-10">
                <header className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Task Console</h1>
                    <p className="text-sm text-gray-500 mt-1">Eisenhower Matrix View</p>
                </header>

                <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-1 min-h-0">
                    <QuadrantBox title="重要 & 紧急" tasks={urgentImportant} type="urgent-important" />
                    <QuadrantBox title="重要 & 不紧急" tasks={importantNotUrgent} type="important-not-urgent" />
                    <QuadrantBox title="紧急 & 不重要" tasks={urgentNotImportant} type="urgent-not-important" />
                    <QuadrantBox title="不重要 & 不紧急" tasks={neither} type="not-urgent-not-important" />
                </div>

                {draftTask && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-gray-900/10">
                        <div className="bg-white rounded-2xl shadow-2xl p-7 w-[480px] border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 leading-tight mb-2">{draftTask.task_title}</h3>
                                    <div className="flex items-center text-gray-600 bg-gray-100 px-2 py-1 rounded-md text-sm w-fit">
                                        <Users className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                        {draftTask.stakeholders.join(', ')}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <a href={draftTask.original_context_link} className="group flex items-center justify-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
                                    <LinkIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                                    查看原始对话上下文
                                </a>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3 text-sm">
                                    <span className="font-semibold text-gray-700">AI 日历建议</span>
                                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs font-medium border border-indigo-100">30 分钟时段</span>
                                </div>
                                <div className="space-y-2.5">
                                    {draftTask.time_suggestions.map((time, idx) => {
                                        const { datePart, timePart } = formatTimeSlot(time);
                                        return (
                                            <button key={idx} onClick={() => confirmTask(time)} className="group w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50/50 hover:shadow-sm transition-all text-left bg-white">
                                                <div className="flex items-center gap-3">
                                                    <Clock className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{datePart}</div>
                                                        <div className="text-xs text-gray-500 group-hover:text-indigo-600 transition-colors">{timePart}</div>
                                                    </div>
                                                </div>
                                                <CheckCircle2 className="w-5 h-5 text-indigo-500 opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button onClick={() => setDraftTask(null)} className="text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors px-4 py-2">
                                    暂不处理
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}
