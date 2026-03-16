"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import MockERP from "@/components/MockERP/MockERP";
import Terminal from "@/components/Terminal/Terminal";
import SlackModal from "@/components/SlackModal/SlackModal";
import AuditReceipt from "@/components/AuditReceipt/AuditReceipt";

const WS_URL = "ws://localhost:8000/ws";
const API_URL = "http://localhost:8000";

type AuditState = "idle" | "processing" | "halted" | "completing" | "completed" | "failed";

interface AuditData {
  run_id: string;
  extracted_data?: {
    vendor_name: string;
    date: string;
    amount: number;
  };
  confidence_scores?: {
    vendor_name: number;
    date: number;
    amount: number;
  };
  halt_reason?: string;
}

interface HaltData {
  fieldName: string;
  originalValue: string;
  confidence: number;
  message: string;
}

export default function Home() {
  const { isConnected, commandQueue, logMessages } = useWebSocket(WS_URL);
  const [auditState, setAuditState] = useState<AuditState>("idle");
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [haltData, setHaltData] = useState<HaltData | null>(null);
  const [completionHash, setCompletionHash] = useState<string>("");
  const [humanOverrideApplied, setHumanOverrideApplied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [fieldsCompleted, setFieldsCompleted] = useState(0);
  const processedCommandCount = useRef(0);

  // Process commands from WebSocket
  useEffect(() => {
    if (commandQueue.length <= processedCommandCount.current) return;

    const newCommands = commandQueue.slice(processedCommandCount.current);
    processedCommandCount.current = commandQueue.length;

    for (const cmd of newCommands) {
      if (cmd.action === "halt") {
        setAuditState("halted");
        setHaltData({
          fieldName: "Date",
          originalValue: auditData?.extracted_data?.date || "10/12/2023",
          confidence: cmd.confidence || 0.42,
          message: cmd.message || "Ambiguous handwritten date detected.",
        });
      } else if (cmd.action === "resume") {
        setAuditState("completing");
      } else if (cmd.action === "complete") {
        setAuditState("completed");
        setFieldsCompleted(6);
        const hashMatch = cmd.message?.match(/Ledger ID: (.+)/);
        if (hashMatch) setCompletionHash(hashMatch[1]);
      } else if (cmd.action === "type" && cmd.selector) {
        // Track field completion progress
        setFieldsCompleted((prev) => {
          const next = prev + 1;
          return next > 6 ? 6 : next;
        });
      }
    }
  }, [commandQueue.length, auditData?.extracted_data]);

  const handleStartAudit = useCallback(async () => {
    if (isStarting || auditState === "processing") return;

    setIsStarting(true);
    setAuditState("processing");
    setFieldsCompleted(0);
    processedCommandCount.current = commandQueue.length;

    try {
      const dummyFile = new File(
        ["Vendor Audit Q3 2023 - Acme Corp"],
        "Vendor_Audit_Q3.pdf",
        { type: "application/pdf" }
      );

      const formData = new FormData();
      formData.append("file", dummyFile);

      const response = await fetch(`${API_URL}/api/audit/start`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to start audit");

      const data = await response.json();
      setAuditData(data);
    } catch (error) {
      console.error("Failed to start audit:", error);
      setAuditState("failed");
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, auditState, commandQueue.length]);

  const handleApprove = useCallback(async (overrideValue?: string) => {
    if (!auditData?.run_id) return;

    if (overrideValue) setHumanOverrideApplied(true);

    try {
      const response = await fetch(`${API_URL}/api/audit/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: auditData.run_id,
          approved: true,
          override_value: overrideValue || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to approve audit");
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  }, [auditData]);

  const handleReset = useCallback(() => {
    window.location.reload();
  }, []);

  const progressPercent = Math.round((fieldsCompleted / 6) * 100);

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950">
      {/* ─── Top Header Bar ──────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white tracking-tight">ComplyAct</span>
            <span className="text-[10px] text-zinc-500 font-mono">v0.1.0</span>
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <span className="text-[10px] text-zinc-500">Auditable Agentic Process Automation</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress indicator */}
          {auditState !== "idle" && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-mono">PROGRESS</span>
              <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${auditState === "halted"
                      ? "bg-red-500"
                      : auditState === "completed"
                        ? "bg-green-500"
                        : "bg-blue-500"
                    }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-400 font-mono w-8">{progressPercent}%</span>
            </div>
          )}

          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${auditState === "idle"
              ? isConnected ? "bg-green-950 text-green-400" : "bg-red-950 text-red-400"
              : auditState === "processing" || auditState === "completing"
                ? "bg-blue-950 text-blue-400"
                : auditState === "halted"
                  ? "bg-red-950 text-red-400 animate-pulse"
                  : auditState === "completed"
                    ? "bg-green-950 text-green-400"
                    : "bg-red-950 text-red-400"
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${auditState === "idle"
                ? isConnected ? "bg-green-400" : "bg-red-400"
                : auditState === "processing" || auditState === "completing"
                  ? "bg-blue-400 animate-pulse"
                  : auditState === "halted"
                    ? "bg-red-400"
                    : auditState === "completed"
                      ? "bg-green-400"
                      : "bg-red-400"
              }`} />
            {auditState === "idle"
              ? isConnected ? "READY" : "OFFLINE"
              : auditState === "processing"
                ? "RUNNING"
                : auditState === "halted"
                  ? "HALTED"
                  : auditState === "completing"
                    ? "COMPLETING"
                    : auditState === "completed"
                      ? "DONE"
                      : "FAILED"
            }
          </div>

          {/* AWS Badge */}
          <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded text-[10px] text-amber-400 font-mono">
            <span>☁</span> AWS Nova
          </div>
        </div>
      </header>

      {/* ─── Split Screen Body ───────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel: Mock ERP System */}
        <div className="w-1/2 border-r border-zinc-700 bg-white flex flex-col">
          <MockERP commandQueue={commandQueue} />
        </div>

        {/* Right Panel: Terminal + Controls */}
        <div className="w-1/2 bg-zinc-950 flex flex-col">
          <div className="flex-1 min-h-0">
            <Terminal logMessages={logMessages} isConnected={isConnected} />
          </div>

          {/* Control Bar */}
          <div className="border-t border-zinc-800 bg-zinc-900 p-3">
            {auditState === "idle" && (
              <button
                onClick={handleStartAudit}
                disabled={!isConnected || isStarting}
                className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition-all ${isConnected && !isStarting
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white cursor-pointer shadow-lg shadow-green-900/30"
                    : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  }`}
              >
                {isStarting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Initializing Agent...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>▶</span>
                    <span>Start Audit — Vendor_Audit_Q3.pdf</span>
                  </span>
                )}
              </button>
            )}

            {auditState === "processing" && (
              <div className="flex items-center gap-3 px-2">
                <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin shrink-0" />
                <span className="text-sm text-blue-400 font-mono flex-1">Agent executing — {fieldsCompleted}/6 fields</span>
                {auditData?.confidence_scores && (
                  <ConfidenceGauge scores={auditData.confidence_scores} />
                )}
              </div>
            )}

            {auditState === "halted" && (
              <div className="flex items-center gap-3 px-2">
                <span className="text-red-400 text-lg animate-pulse">⚠</span>
                <div className="flex-1">
                  <span className="text-sm font-mono font-bold text-red-400">HALTED</span>
                  <span className="text-xs text-zinc-500 font-mono ml-2">Awaiting human decision...</span>
                </div>
              </div>
            )}

            {auditState === "completing" && (
              <div className="flex items-center gap-3 px-2">
                <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin shrink-0" />
                <span className="text-sm text-green-400 font-mono">Override accepted — completing at 2x speed...</span>
              </div>
            )}

            {auditState === "completed" && (
              <div className="flex items-center gap-3 px-2">
                <span className="text-green-400 text-lg">✓</span>
                <span className="text-sm font-mono font-bold text-green-400 flex-1">AUDIT COMPLETE — QLDB Verified</span>
              </div>
            )}

            {auditState === "failed" && (
              <div className="flex items-center gap-2 px-2">
                <span className="text-red-400">✗</span>
                <span className="text-sm text-red-400 font-mono flex-1">FAILED</span>
                <button onClick={handleReset} className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded text-xs hover:bg-zinc-700">↻ Reset</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modal Overlays ──────────────────────────────── */}
      <SlackModal
        isOpen={auditState === "halted"}
        runId={auditData?.run_id || ""}
        haltReason={haltData?.message || "Ambiguous handwritten date detected."}
        fieldName={haltData?.fieldName || "Date"}
        originalValue={haltData?.originalValue || "10/12/2023"}
        confidence={haltData?.confidence || 0.42}
        onApprove={handleApprove}
      />

      <AuditReceipt
        isOpen={auditState === "completed"}
        runId={auditData?.run_id || ""}
        cryptoHash={completionHash}
        humanOverride={humanOverrideApplied}
        onReset={handleReset}
      />
    </main>
  );
}

function ConfidenceGauge({ scores }: { scores: { vendor_name: number; date: number; amount: number } }) {
  const avg = ((scores.vendor_name + scores.date + scores.amount) / 3 * 100).toFixed(0);
  const minScore = Math.min(scores.vendor_name, scores.date, scores.amount);
  const isLow = minScore < 0.8;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl backdrop-blur-sm">
      <div className="flex flex-col">
        <span className="text-[8px] text-zinc-500 font-bold tracking-widest uppercase">Nova Confidence</span>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-mono font-black italic tracking-tighter ${isLow ? "text-amber-400 drop-shadow-[0_0_8px_#fbbf24]" : "text-green-400 drop-shadow-[0_0_8px_#4ade80]"}`}>
            {avg}%
          </span>
          <div className="w-20 h-2 bg-zinc-900 rounded-full p-0.5 border border-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] ${isLow ? "bg-gradient-to-r from-amber-500 to-amber-300" : "bg-gradient-to-r from-green-600 to-emerald-400"}`}
              style={{ width: `${avg}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
         <div className={`w-1.5 h-1.5 rounded-full ${scores.vendor_name < 0.8 ? "bg-amber-500" : "bg-green-500"}`} />
         <div className={`w-1.5 h-1.5 rounded-full ${scores.date < 0.8 ? "bg-amber-500 pulse" : "bg-green-500"}`} />
         <div className={`w-1.5 h-1.5 rounded-full ${scores.amount < 0.8 ? "bg-amber-500" : "bg-green-500"}`} />
      </div>
    </div>
  );
}
