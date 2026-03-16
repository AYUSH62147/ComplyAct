"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface WSMessage {
    action?: string;
    type?: string;
    selector?: string;
    value?: string;
    message?: string;
    confidence?: number;
    delay?: number;
    timestamp?: string;
    level?: string;
    step?: string;
}

interface UseWebSocketReturn {
    isConnected: boolean;
    lastMessage: WSMessage | null;
    messages: WSMessage[];
    sendMessage: (data: object) => void;
    commandQueue: WSMessage[];
    logMessages: WSMessage[];
}

export function useWebSocket(url: string): UseWebSocketReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
    const [messages, setMessages] = useState<WSMessage[]>([]);
    const [commandQueue, setCommandQueue] = useState<WSMessage[]>([]);
    const [logMessages, setLogMessages] = useState<WSMessage[]>([]);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                setIsConnected(true);
                console.log("[WS] Connected to", url);
            };

            ws.onmessage = (event) => {
                try {
                    const data: WSMessage = JSON.parse(event.data);
                    setLastMessage(data);
                    setMessages((prev) => [...prev, data]);

                    // Route messages by type
                    if (data.type === "log") {
                        setLogMessages((prev) => [...prev, data]);
                    } else if (data.action) {
                        setCommandQueue((prev) => [...prev, data]);
                    }
                } catch (err) {
                    console.error("[WS] Parse error:", err);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                console.log("[WS] Disconnected. Reconnecting in 3s...");
                reconnectTimeoutRef.current = setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.error("[WS] Error:", err);
                ws.close();
            };

            wsRef.current = ws;
        } catch (err) {
            console.error("[WS] Connection failed:", err);
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
    }, [url]);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            wsRef.current?.close();
        };
    }, [connect]);

    const sendMessage = useCallback((data: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    return { isConnected, lastMessage, messages, sendMessage, commandQueue, logMessages };
}
