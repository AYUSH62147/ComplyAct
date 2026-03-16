"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface WSMessage {
    msg_id?: string;
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
    const processedIds = useRef<Set<string>>(new Set());
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
    const [messages, setMessages] = useState<WSMessage[]>([]);
    const [commandQueue, setCommandQueue] = useState<WSMessage[]>([]);
    const [logMessages, setLogMessages] = useState<WSMessage[]>([]);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

    const connect = useCallback(() => {
        // Prevent multiple simultaneous connections
        if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const data: WSMessage = JSON.parse(event.data);
                    
                    // Deduplication Logic
                    if (data.msg_id) {
                        if (processedIds.current.has(data.msg_id)) {
                            return;
                        }
                        processedIds.current.add(data.msg_id);
                    }

                    setLastMessage(data);
                    setMessages((prev) => [...prev, data]);

                    // Route messages by type
                    if (data.type === "log" || (!data.action && data.message)) {
                        setLogMessages((prev) => [...prev, data]);
                    } else if (data.action) {
                        setCommandQueue((prev) => [...prev, data]);
                    }
                } catch (err) {
                    console.error("[WS] Parse error:", err);
                }
            };

            ws.onclose = (event) => {
                setIsConnected(false);
                wsRef.current = null;
                // Only reconnect if it wasn't a clean close
                if (event.code !== 1000) {
                    reconnectTimeoutRef.current = setTimeout(connect, 3000);
                }
            };

            ws.onerror = (err) => {
                console.error("[WS] Error:", err);
                ws.close();
            };
        } catch (err) {
            console.error("[WS] Connection failed:", err);
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
    }, [url]);

    useEffect(() => {
        // Clear processed IDs on new connection attempt (e.g. page reload)
        processedIds.current.clear();
        connect();
        
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                const ws = wsRef.current;
                wsRef.current = null;
                ws.onclose = null; // Prevent reconnect on cleanup close
                ws.close(1000); // Clean close code
            }
        };
    }, [connect]);

    const sendMessage = useCallback((data: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    return { isConnected, lastMessage, messages, sendMessage, commandQueue, logMessages };
}
