"use client";

import React, { useState, useEffect, useRef } from "react";

interface MockERPProps {
    commandQueue: Array<{
        action?: string;
        selector?: string;
        value?: string;
        message?: string;
        confidence?: number;
        delay?: number;
    }>;
}

interface FormData {
    "vendor-name": string;
    "invoice-number": string;
    "date": string;
    "amount": string;
    "payment-terms": string;
    "vendor-address": string;
}

const FIELDS = [
    { id: "vendor-name", label: "Vendor Name", type: "text", placeholder: "Enter vendor name..." },
    { id: "invoice-number", label: "Invoice Number", type: "text", placeholder: "INV-XXXX-XXXX" },
    { id: "date", label: "Date", type: "text", placeholder: "MM/DD/YYYY" },
    { id: "amount", label: "Amount ($)", type: "text", placeholder: "0.00" },
    { id: "payment-terms", label: "Payment Terms", type: "text", placeholder: "Net 30, Net 60..." },
    { id: "vendor-address", label: "Vendor Address", type: "text", placeholder: "Full address..." },
];

export default function MockERP({ commandQueue }: MockERPProps) {
    const [formData, setFormData] = useState<FormData>({
        "vendor-name": "",
        "invoice-number": "",
        "date": "",
        "amount": "",
        "payment-terms": "",
        "vendor-address": "",
    });
    const [activeField, setActiveField] = useState<string | null>(null);
    const [isHalted, setIsHalted] = useState(false);
    const [haltMessage, setHaltMessage] = useState<string>("");
    const [isComplete, setIsComplete] = useState(false);
    const processedCount = useRef(0);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [isCursorVisible, setIsCursorVisible] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout[]>([]);
    const formRef = useRef<HTMLDivElement>(null);

    // Track field positions for the Ghost Cursor
    const updateCursorPosition = (selector: string) => {
        const id = selector.replace("#", "");
        const element = document.getElementById(id);
        if (element && formRef.current) {
            const rect = element.getBoundingClientRect();
            const parentRect = formRef.current.getBoundingClientRect();
            setCursorPos({
                x: rect.left - parentRect.left + 10,
                y: rect.top - parentRect.top + rect.height / 2
            });
            setIsCursorVisible(true);
        }
    };

    useEffect(() => {
        if (commandQueue.length <= processedCount.current) return;

        const newCommands = commandQueue.slice(processedCount.current);
        processedCount.current = commandQueue.length;

        newCommands.forEach((cmd) => {
            switch (cmd.action) {
                case "focus":
                    if (cmd.selector) {
                        const fieldId = cmd.selector.replace("#", "");
                        setActiveField(fieldId);
                        updateCursorPosition(cmd.selector);
                    }
                    break;

                case "type":
                    if (cmd.selector && cmd.value) {
                        const fieldId = cmd.selector.replace("#", "");
                        setActiveField(fieldId);
                        const chars = cmd.value.split("");
                        const baseDelay = (cmd.delay || 0.05) * 1000;
                        chars.forEach((char, i) => {
                            const timeout = setTimeout(() => {
                                setFormData((prev) => ({
                                    ...prev,
                                    [fieldId]: prev[fieldId as keyof FormData] + char,
                                }));
                            }, baseDelay * (i + 1));
                            typingTimeoutRef.current.push(timeout);
                        });
                        const clearTimeout_ = setTimeout(() => {
                            setActiveField(null);
                        }, baseDelay * (chars.length + 2));
                        typingTimeoutRef.current.push(clearTimeout_);
                    }
                    break;

                case "halt":
                    setIsHalted(true);
                    setHaltMessage(cmd.message || "Execution halted.");
                    break;

                case "resume":
                    setIsHalted(false);
                    setHaltMessage("");
                    break;

                case "complete":
                    setIsComplete(true);
                    setActiveField(null);
                    break;

                default:
                    break;
            }
        });
    }, [commandQueue]);

    useEffect(() => {
        return () => {
            typingTimeoutRef.current.forEach((t) => clearTimeout(t));
        };
    }, []);

    const filledCount = Object.values(formData).filter(Boolean).length;

    return (
        <div className="flex flex-col h-full">
            {/* ERP Header Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-zinc-100 to-zinc-50 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <span className="ml-2 text-xs font-mono text-zinc-400">legacy-erp.internal:8443</span>
                </div>
                <div className="flex items-center gap-2">
                    {isHalted && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full animate-pulse">
                            ⚠ HALTED
                        </span>
                    )}
                    {isComplete && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-600 rounded-full">
                            ✓ COMPLETE
                        </span>
                    )}
                    {!isHalted && !isComplete && filledCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-blue-100 text-blue-600 rounded-full">
                            FILLING...
                        </span>
                    )}
                </div>
            </div>

            {/* ERP Content Area */}
            <div className="flex-1 overflow-hidden flex bg-zinc-50/50">
                {/* Visual Document Sidebar (The "Strength" item) */}
                <div className="w-56 border-r border-zinc-200 bg-zinc-100/50 p-4 flex flex-col gap-3 overflow-y-auto hidden lg:flex">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Document Source</span>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[8px] font-bold text-green-600 uppercase">Live Preview</span>
                        </div>
                    </div>
                    <div className="aspect-[1/1.4] w-full bg-white border border-zinc-300 rounded shadow-md relative overflow-hidden group">
                        {/* Real Document Preview - Zoomed to look like it's being "looked at" */}
                        <iframe 
                            src={`/source_document.pdf?v=${Date.now()}#toolbar=0&navpanes=0&scrollbar=0`} 
                            className="w-full h-[150%] border-none pointer-events-none transform scale-110 origin-top opacity-90"
                            title="Source Document"
                        />
                        {/* Scanning beam effect */}
                        {processedCount.current > 0 && !isComplete && (
                             <div className="absolute left-0 w-full h-0.5 bg-blue-400/50 top-0 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_10px_#60a5fa] z-10" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/20 pointer-events-none" />
                    </div>
                </div>

                <div ref={formRef} className="flex-1 overflow-auto p-6 relative bg-white">
                {/* Visual Ghost Cursor */}
                {isCursorVisible && (
                    <div
                        className="absolute z-50 pointer-events-none transition-all duration-500 ease-in-out"
                        style={{ left: cursorPos.x, top: cursorPos.y }}
                    >
                        <div className="relative">
                            {/* Cursor Sparkle/Glow */}
                            <div className="absolute inset-0 w-8 h-8 -translate-x-1/2 -translate-y-1/2 bg-blue-400/20 blur-xl rounded-full" />
                            {/* Main Cursor Icon */}
                            <svg className="w-5 h-5 text-blue-600 drop-shadow-md transform -rotate-12" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M7 2l12 11.2-5.8.8 3.5 6-1.7 1-3.5-6-4.5 5.5z" />
                            </svg>
                            {/* Label */}
                            <div className="absolute left-6 top-0 px-1.5 py-0.5 bg-blue-600 text-[8px] text-white font-bold rounded shadow-sm whitespace-nowrap animate-in fade-in zoom-in duration-300">
                                NOVA ACT AGENT
                            </div>
                        </div>
                    </div>
                )}
                <div className="max-w-lg mx-auto">
                    <div className="mb-5">
                        <h2 className="text-lg font-bold text-zinc-800">Vendor Audit Entry</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-zinc-400">Form ID: VAE-2023-Q3 • Department: Finance</p>
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                                <span>{filledCount}/{FIELDS.length}</span>
                                <div className="w-12 h-1 bg-zinc-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                                        style={{ width: `${(filledCount / FIELDS.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3.5">
                        {FIELDS.map((field, index) => {
                            const isFilled = !!formData[field.id as keyof FormData];
                            const isActive = activeField === field.id;
                            const isHaltedField = isHalted && field.id === "date";

                            return (
                                <div key={field.id} className="relative group">
                                    <div className="flex items-center justify-between mb-1">
                                        <label
                                            htmlFor={field.id}
                                            className={`text-sm font-medium transition-colors duration-200 ${isActive ? "text-blue-600"
                                                    : isHaltedField ? "text-red-600"
                                                        : isFilled ? "text-green-700"
                                                            : "text-zinc-700"
                                                }`}
                                        >
                                            <span className="text-zinc-400 text-xs mr-1">{index + 1}.</span>
                                            {field.label}
                                        </label>
                                        {isFilled && !isHaltedField && (
                                            <span className="text-green-500 text-xs font-mono flex items-center gap-0.5">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                                verified
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            id={field.id}
                                            type={field.type}
                                            value={formData[field.id as keyof FormData]}
                                            readOnly
                                            placeholder={field.placeholder}
                                            className={`w-full px-3 py-2 text-sm border rounded-md font-mono transition-all duration-200 outline-none text-zinc-900 ${isActive
                                                    ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50 shadow-lg shadow-blue-100"
                                                    : isHaltedField
                                                        ? "border-red-400 ring-2 ring-red-200 bg-red-50"
                                                        : isFilled
                                                            ? "border-green-300 bg-green-50/50 font-bold"
                                                            : "border-zinc-200 bg-white"
                                                }`}
                                        />
                                        {isActive && (
                                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                <div className="w-0.5 h-4 bg-blue-500 animate-pulse" />
                                                <span className="text-[9px] text-blue-500 font-mono font-bold tracking-wider">AGENT</span>
                                            </div>
                                        )}
                                    </div>
                                    {isHaltedField && (
                                        <div className="mt-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex items-center gap-1.5">
                                            <span className="animate-pulse">⚠</span>
                                            {haltMessage || "Low confidence — awaiting human review"}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Form Footer */}
                    <div className="mt-5 pt-4 border-t border-zinc-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400 font-mono">
                                {filledCount === FIELDS.length ? "All fields complete" : `${filledCount} of ${FIELDS.length} fields filled`}
                            </span>
                        </div>
                        <button
                            disabled
                            className={`px-4 py-2 text-xs font-medium rounded-md transition-all ${isComplete
                                    ? "bg-green-600 text-white"
                                    : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                                }`}
                        >
                            {isComplete ? "✓ Submitted" : "Submit Entry"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}
