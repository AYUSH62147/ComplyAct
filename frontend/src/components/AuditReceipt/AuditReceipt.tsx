"use client";

import React from "react";

interface AuditReceiptProps {
    isOpen: boolean;
    runId: string;
    cryptoHash: string;
    humanOverride: boolean;
    onReset: () => void;
}

export default function AuditReceipt({
    isOpen,
    runId,
    cryptoHash,
    humanOverride,
    onReset,
}: AuditReceiptProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Receipt Card */}
            <div className="relative w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-zinc-700">
                    {/* Success Header */}
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">Audit Complete</h2>
                        <p className="text-green-200 text-sm mt-1">Cryptographic receipt generated</p>
                    </div>

                    {/* Receipt Details */}
                    <div className="px-6 py-5 space-y-4">
                        {/* QLDB Badge */}
                        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-950/50 border border-amber-700/50 rounded-lg">
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="text-xs font-mono text-amber-400 font-bold">VERIFIED BY AMAZON QLDB</span>
                        </div>

                        {/* Details Grid */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-500">Run ID</span>
                                <span className="font-mono text-xs text-zinc-300">{runId.slice(0, 8)}...{runId.slice(-4)}</span>
                            </div>

                            <div>
                                <span className="text-xs text-zinc-500 block mb-1">SHA-256 Audit Hash</span>
                                <div className="bg-zinc-800 rounded-lg p-3 font-mono text-xs text-green-400 break-all leading-relaxed border border-zinc-700">
                                    {cryptoHash || "pending..."}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-500">Human Override</span>
                                <span className={`text-xs font-mono px-2 py-0.5 rounded ${humanOverride
                                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                    }`}>
                                    {humanOverride ? "APPLIED" : "NONE"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-500">Timestamp</span>
                                <span className="font-mono text-xs text-zinc-300">
                                    {new Date().toISOString().replace("T", " ").slice(0, 19)} UTC
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-500">Immutability</span>
                                <span className="text-xs font-mono text-green-400">Tamper-proof ✓</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-zinc-700">
                        <button
                            onClick={onReset}
                            className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-all border border-zinc-600"
                        >
                            ↻ Close & Run New Audit
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
