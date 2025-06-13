import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { Message } from '@shared/schema';

interface WebSocketMessage {
  type: string;
  message?: Message;
  messageId?: number;
  userName?: string;
  timestamp: string;
}

export function useWebSocket() {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<number>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) return;
    
    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate WebSocket connection
      ws.send(JSON.stringify({
        type: 'auth',
        userId: (user as any).id,
        userName: (user as any).firstName && (user as any).lastName 
          ? `${(user as any).firstName} ${(user as any).lastName}` 
          : (user as any).email?.split('@')[0] || 'Anonymous'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        
        if (data.type === 'new_message' && data.message) {
          console.log('Processing new message:', data.message);
          const newMessage = data.message;
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const messageExists = prev.some(msg => msg.id === newMessage.id);
            if (messageExists) {
              console.log('Message already exists, skipping:', newMessage.id);
              return prev;
            }
            console.log('Adding new message to state:', newMessage);
            // Only add message if it's for the current room (will be filtered by parent component)
            return [...prev, newMessage];
          });
        } else if (data.type === 'message_deleted' && typeof data.messageId === 'number') {
          console.log('Message deleted:', data.messageId);
          const messageId = data.messageId;
          setDeletedMessageIds(prev => new Set(prev).add(messageId));
          setMessages(prev => prev.filter(msg => msg.id !== messageId));
        } else if (data.type === 'user_joined') {
          console.log(`${data.userName} joined the chat`);
        } else if (data.type === 'user_left') {
          console.log(`${data.userName} left the chat`);
        } else if (data.type === 'error') {
          console.error('WebSocket error:', data.message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after 1 second for faster recovery
      setTimeout(() => {
        if (isAuthenticated && user) {
          connect();
        }
      }, 1000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  }, [isAuthenticated, (user as any)?.id]);

  const sendMessage = useCallback((text: string, roomId: number = 1, replyTo?: Message | null, mentions?: string[]) => {
    console.log('Attempting to send message:', { text, roomId, replyTo: replyTo?.id, mentions, wsState: wsRef.current?.readyState });
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const messageData = {
        type: 'chat_message',
        text: text.trim(),
        roomId: roomId,
        replyToId: replyTo?.id || null,
        replyToText: replyTo?.originalText || null,
        replyToSenderName: replyTo?.senderName || null,
        mentions: mentions || []
      };
      console.log('Sending WebSocket message:', messageData);
      wsRef.current.send(JSON.stringify(messageData));
    } else {
      console.error('WebSocket is not connected. State:', wsRef.current?.readyState);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, (user as any)?.id, connect, disconnect]);

  return {
    isConnected,
    messages,
    deletedMessageIds,
    sendMessage,
    setMessages,
  };
}
