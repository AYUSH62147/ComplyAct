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
        const speed = fullText.length > 60 ? 3 : 8; // Ultra-fast for large chunks, snappy for others
        const interval = setInterval(() => {
            charIndex += 2; // Type 2 chars at a time for even more speed
            const currentText = fullText.slice(0, charIndex);
            setTypedText(currentText);
            
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
            <div ref={scrollRef} className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed relative group">
                {/* Scanline Effect Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] z-10 opacity-30 group-hover:opacity-40 transition-opacity" />
                
                <div className="relative z-0">
                    {allLogs.map((log, i) => (
                        <div key={`log-${i}`} className="flex gap-2 mb-1 hover:bg-zinc-900/40 px-1 rounded transition-colors group/line">
                            <span className="text-zinc-600 shrink-0 tabular-nums">{formatTimestamp(log.timestamp)}</span>
                            <span className={`shrink-0 ${levelColors[log.level || "info"]} drop-shadow-[0_0_8px_currentColor] opacity-90`}>
                                {levelIcons[log.level || "info"]}
                            </span>
                            {log.step && (
                                <span className="text-zinc-500 shrink-0 text-[10px] border border-zinc-800 px-1 rounded bg-zinc-900/50">
                                    {log.step.toUpperCase()}
                                </span>
                            )}
                            <span className={`${levelColors[log.level || "info"]} opacity-90 group-hover/line:opacity-100 transition-opacity`}>
                                {log.message}
                            </span>
                        </div>
                    ))}

                    {/* Typewriter line */}
                    {typingLine && (
                        <div className="flex gap-2 mb-1 px-1">
                            <span className="text-zinc-600 shrink-0 tabular-nums">{formatTimestamp(new Date().toISOString())}</span>
                            <span className={`shrink-0 ${levelColors[typingLine.level]} drop-shadow-[0_0_8px_currentColor]`}>
                                {levelIcons[typingLine.level]}
                            </span>
                            {typingLine.step && (
                                <span className="text-zinc-500 shrink-0 text-[10px] border border-zinc-800 px-1 rounded bg-zinc-900/50">
                                    {typingLine.step.toUpperCase()}
                                </span>
                            )}
                            <span className={`${levelColors[typingLine.level]} drop-shadow-[0_0_5px_currentColor]`}>
                                {typedText}
                                <span className="inline-block w-1.5 h-3 bg-current animate-[pulse_0.6s_ease-in-out_infinite] ml-0.5 shadow-[0_0_10px_currentColor]" />
                            </span>
                        </div>
                    )}

                    {/* Idle cursor */}
                    {!typingLine && (
                        <div className="flex gap-2 mt-2 px-1">
                            <span className="text-green-500 animate-pulse">▸</span>
                            <span className="inline-block w-2 h-3.5 bg-green-500 animate-[pulse_0.8s_ease-in-out_infinite] shadow-[0_0_12px_#22c55e]" />
                        </div>
                    )}
                </div>
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
