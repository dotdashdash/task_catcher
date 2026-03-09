# AI Task Catcher: B2B Task Management MVP

### 一句话简介 / One-liner
一个常驻桌面的 AI 任务助手，将碎片化聊天记录转化为结构化日程。

---

### 产品痛点 / The Problem
在 B 端协同场景中，最大的生产力杀手是录入摩擦力。现有的任务管理工具（如 Jira, Linear）要求手动录入，导致大量碎片化需求流失在聊天记录中。


### 核心产品逻辑 / Core Product Logic
* **第一人称视角 (First-Person Ownership)**：我设计了 AI 识别对话主体的逻辑。 如果消息发送方要求“你把报告发我”，AI 提取的任务是“发送报告”而非“对方要报告”。 
* **人机协同草稿 (Human-in-the-Loop)**：系统不直接写入日历，而是生成 3 个智能建议时间供我确认，确保最终决策权掌握在人手中。 
* **隐私优先 (Privacy First)**：基于 Local-First 架构，任务数据完全存储在本地 localStorage，无需担心商业敏感数据泄露。

### 工程挑战与解决方案 / Engineering Challenges & Solutions
在开发这个 MVP 的过程中，我主导解决了两个核心技术痛点：

1. **对抗大模型时间幻觉 (Date/Time Hallucination)**：
   大模型经常算错相对日期（如“下周二”）。我通过在 Node.js 后端预计算绝对时间对照表并注入 System Prompt，结合 09:00-18:00 的作息红线约束，彻底解决了时间推算幻觉问题。 
2. **攻克 Next.js 水合冲突 (Hydration Conflict)**：
   针对本地缓存数据与服务端渲染对比导致的页面崩溃（Hydration Error），我采用了架构级隔离：利用 next/dynamic 强制核心交互组件进行 CSR（纯客户端渲染），确保了系统的极致稳定性。 

### 技术栈 / Tech Stack
* **Framework**: Next.js 16 (App Router) 
* **AI Integration**: OpenAI SDK + DeepSeek API 
* **Styling**: Tailwind CSS
* **Storage**: LocalStorage
