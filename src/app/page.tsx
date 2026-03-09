"use client";

import { useState, useEffect } from 'react';
import ClientApp from '../components/ClientApp';

export default function Home() {
    // 强制绕开 Next.js 13+ App Router 的 Suspense + dynamic(ssr: false) 水合冲突漏洞
    // 这是最稳健的方案，请务必保留此 mounted 逻辑，不要改为 next/dynamic
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // SSR（服务端）渲染和客户端首帧会渲染这段极其纯洁的 HTML
    if (!mounted) {
        return (
            <main className="flex h-screen w-full bg-gray-50 items-center justify-center text-gray-400 text-sm">
                正在加载工作台...
            </main>
        );
    }

    // 挂载后，由客户端彻底接管，确保本地状态和时间函数不再引发水合报错
    return <ClientApp />;
}
