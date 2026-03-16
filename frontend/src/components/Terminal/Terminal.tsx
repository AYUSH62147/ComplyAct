"use client";

import React, { useEffect, useRef, useState } from "react";

interface LogMessage {
    type?: string;
    timestamp?: string;
    level?: string;
    message?: string;
    step?: string;
}

interface TerminalProps {
    logMessages: LogMessage[];
    isConnected: boolean;
}

const levelColors: Record<string, string> = {
    info: "text-blue-400",
    warn: "text-yellow-400",
    error: "text-red-400",
    success: "text-green-400",
    agent: "text-purple-400",
};

const levelIcons: Record<string, string> = {
    info: "ℹ",
    warn: "⚠",
    error: "✗",
    success: "✓",
    agent: "🤖",
};

const WELCOME_LOGS: LogMessage[] = [
    {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "ComplyAct Agent v0.1.0 initialized",
        step: "boot",
    },
    {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Powered by AWS Nova Pro • Nova Act • Nova Sonic",
        step: "boot",
    },
    {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "Awaiting audit trigger...",
        step: "idle",
    },
];

export default function Terminal({ logMessages, isConnected }: TerminalProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [typingLine, setTypingLine] = useState<{ message: string; level: string; step?: string } | null>(null);
    const [typedText, setTypedText] = useState("");
    const [renderedCount, setRenderedCount] = useState(0);
    const [renderedLogs, setRenderedLogs] = useState<LogMessage[]>([]);

    // Process new log messages with typewriter effect
    useEffect(() => {
        if (logMessages.length <= renderedCount) return;

        const nextLog = logMessages[renderedCount];
        const fullText = nextLog.message || "";

        // Start typewriter
        setTypingLine({
            message: fullText,
            level: nextLog.level || "info",
            step: nextLog.step,
        });
        setTypedText("");

        let charIndex = 0;
        const speed = fullText.length > 60 ? 10 : 20; // Faster for long messages
        const interval = setInterval(() => {
            charIndex++;
            setTypedText(fullText.slice(0, charIndex));
            if (charIndex >= fullText.length) {
                clearInterval(interval);
                // Move to rendered logs
                setRenderedLogs((prev) => [...prev, nextLog]);
                setRenderedCount((prev) => prev + 1);
                setTypingLine(null);
                setTypedText("");
            }
        }, speed);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logMessages.length, renderedCount]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [renderedLogs, typedText]);

    const formatTimestamp = (ts?: string) => {
        if (!ts) return "00:00:00";
        try {
            return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
        } catch {
            return "00:00:00";
        }
    };

    const allLogs = [...WELCOME_LOGS, ...renderedLogs];

    return (
        <div className="flex flex-col h-full bg-zinc-950">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-green-400 font-mono">▸ ComplyAct Terminal</span>
                    <span className="text-[10px] text-zinc-600 font-mono">v0.1.0</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono ${isConnected ? "bg-green-950 text-green-400" : "bg-red-950 text-red-400"
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                        }`} />
                    {isConnected ? "LIVE" : "OFFLINE"}
                </div>
            </div>

            {/* Terminal Body */}
            <div ref={scrollRef} className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
                {allLogs.map((log, i) => (
                    <div key={`log-${i}`} className="flex gap-2 mb-1 hover:bg-zinc-900/50 px-1 rounded">
                        <span className="text-zinc-600 shrink-0">{formatTimestamp(log.timestamp)}</span>
                        <span className={`shrink-0 ${levelColors[log.level || "info"]}`}>
                            {levelIcons[log.level || "info"]}
                        </span>
                        {log.step && <span className="text-zinc-500 shrink-0">[{log.step}]</span>}
                        <span className={`${levelColors[log.level || "info"]} opacity-90`}>{log.message}</span>
                    </div>
                ))}

                {/* Typewriter line */}
                {typingLine && (
                    <div className="flex gap-2 mb-1 px-1">
                        <span className="text-zinc-600 shrink-0">{formatTimestamp(new Date().toISOString())}</span>
                        <span className={`shrink-0 ${levelColors[typingLine.level]}`}>
                            {levelIcons[typingLine.level]}
                        </span>
                        {typingLine.step && <span className="text-zinc-500 shrink-0">[{typingLine.step}]</span>}
                        <span className={`${levelColors[typingLine.level]} opacity-90`}>
                            {typedText}
                            <span className="inline-block w-1.5 h-3 bg-current animate-pulse ml-0.5" />
                        </span>
                    </div>
                )}

                {/* Idle cursor */}
                {!typingLine && (
                    <div className="flex gap-2 mt-2 px-1">
                        <span className="text-green-500">▸</span>
                        <span className="inline-block w-2 h-3.5 bg-green-500 animate-pulse" />
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900 border-t border-zinc-800 text-[10px] font-mono text-zinc-500">
                <span>DEMO_MODE: ON</span>
                <span>LOGS: {allLogs.length + (typingLine ? 1 : 0)}</span>
                <span>AWS NOVA PRO | NOVA ACT</span>
            </div>
        </div>
    );
}
