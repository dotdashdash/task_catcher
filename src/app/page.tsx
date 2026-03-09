"use client";

import dynamic from 'next/dynamic';

// 强制关闭 SSR，彻底消灭 React Hydration Error
// Next.js App Router 要求：ssr:false 只能在 Client Component 里使用
const ClientApp = dynamic(() => import('../components/ClientApp'), {
    ssr: false,
    loading: () => (
        <main className="flex h-screen w-full bg-gray-50 items-center justify-center text-gray-400 text-sm">
            正在加载工作台...
        </main>
    ),
});

export default function Page() {
    return <ClientApp />;
}
