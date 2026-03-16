"use client";

import React, { useState } from "react";

interface SlackModalProps {
    isOpen: boolean;
    runId: string;
    haltReason: string;
    fieldName: string;
    originalValue: string;
    confidence: number;
    onApprove: (overrideValue?: string) => void;
    onDismiss?: () => void;
}

export default function SlackModal({
    isOpen,
    runId,
    haltReason,
    fieldName,
    originalValue,
    confidence,
    onApprove,
    onDismiss,
}: SlackModalProps) {
    const [overrideValue, setOverrideValue] = useState("");
    const [isApproving, setIsApproving] = useState(false);
    const [selectedOption, setSelectedOption] = useState<"approve" | "override" | null>(null);

    if (!isOpen) return null;

    const handleApprove = async () => {
        setIsApproving(true);
        if (selectedOption === "override" && overrideValue) {
            onApprove(overrideValue);
        } else {
            onApprove();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Close Button (Cross) */}
                <button
                    onClick={onDismiss}
                    className="absolute -top-3 -right-3 z-10 w-8 h-8 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 rounded-full border border-zinc-200 shadow-xl transition-all"
                    aria-label="Close"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                    {/* Slack-style Header */}
                    <div className="bg-[#4A154B] px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A" />
                                    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0" />
                                    <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.522 2.521 2.528 2.528 0 0 1-2.52-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.521 2.522v6.312z" fill="#2EB67D" />
                                    <path d="M15.165 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.165 24a2.528 2.528 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.528 2.528 0 0 1-2.52-2.522 2.528 2.528 0 0 1 2.52-2.52h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.313z" fill="#ECB22E" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">ComplyAct Governance Bot</h3>
                                <p className="text-white/60 text-xs">#audit-approvals • Just now</p>
                            </div>
                        </div>
                    </div>

                    {/* Message Body */}
                    <div className="px-6 py-5">
                        {/* Alert Banner */}
                        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                            <span className="text-red-500 text-xl mt-0.5">⚠️</span>
                            <div>
                                <p className="text-sm font-semibold text-red-800">Human Override Required</p>
                                <p className="text-xs text-red-600 mt-1">{haltReason}</p>
                            </div>
                        </div>

                        {/* Field Details */}
                        <div className="space-y-3 mb-5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Run ID</span>
                                <span className="font-mono text-xs text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">{runId.slice(0, 8)}...</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Flagged Field</span>
                                <span className="font-semibold text-zinc-800">{fieldName}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Extracted Value</span>
                                <span className="font-mono text-zinc-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{originalValue}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Confidence Score</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-20 h-2 bg-zinc-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-500 rounded-full"
                                            style={{ width: `${confidence * 100}%` }}
                                        />
                                    </div>
                                    <span className="font-mono text-xs font-bold text-red-600">{(confidence * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Source</span>
                                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">✍ Handwritten</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <hr className="border-zinc-200 mb-4" />

                        {/* Decision Options */}
                        <div className="space-y-3">
                            {/* Option 1: Approve Original */}
                            <button
                                onClick={() => setSelectedOption("approve")}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${selectedOption === "approve"
                                        ? "border-green-500 bg-green-50"
                                        : "border-zinc-200 hover:border-zinc-300 bg-white"
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedOption === "approve" ? "border-green-500 bg-green-500" : "border-zinc-300"
                                    }`}>
                                    {selectedOption === "approve" && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-800">Approve Original Value</p>
                                    <p className="text-xs text-zinc-500">Accept &quot;{originalValue}&quot; as-is and continue</p>
                                </div>
                            </button>

                            {/* Option 2: Override */}
                            <button
                                onClick={() => setSelectedOption("override")}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${selectedOption === "override"
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-zinc-200 hover:border-zinc-300 bg-white"
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedOption === "override" ? "border-blue-500 bg-blue-500" : "border-zinc-300"
                                    }`}>
                                    {selectedOption === "override" && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-zinc-800">Override with Corrected Value</p>
                                    <p className="text-xs text-zinc-500">Provide the correct date value</p>
                                </div>
                            </button>

                            {/* Override Input (shown when override selected) */}
                            {selectedOption === "override" && (
                                <div className="ml-8 animate-in slide-in-from-top-2 duration-200">
                                    <input
                                        type="text"
                                        value={overrideValue}
                                        onChange={(e) => setOverrideValue(e.target.value)}
                                        placeholder="Enter corrected date (e.g., 12/10/2023)"
                                        className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
                        <p className="text-[10px] text-zinc-400 font-mono">
                            Response required within 60s for audit compliance
                        </p>
                        <button
                            onClick={handleApprove}
                            disabled={!selectedOption || isApproving || (selectedOption === "override" && !overrideValue)}
                            className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${selectedOption && !isApproving && !(selectedOption === "override" && !overrideValue)
                                    ? "bg-[#4A154B] hover:bg-[#611f69] text-white cursor-pointer"
                                    : "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                                }`}
                        >
                            {isApproving ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Submitting...
                                </span>
                            ) : (
                                "Submit Decision"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
