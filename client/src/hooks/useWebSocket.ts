import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { Message } from '@shared/schema';

interface WebSocketMessage {
  type: string;
  message?: Message;
  userName?: string;
  timestamp: string;
}

export function useWebSocket() {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) return;

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
        userId: user.id,
        userName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.email?.split('@')[0] || 'Anonymous'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        
        if (data.type === 'new_message' && data.message) {
          console.log('Processing new message:', data.message);
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const messageExists = prev.some(msg => msg.id === data.message!.id);
            if (messageExists) {
              console.log('Message already exists, skipping:', data.message.id);
              return prev;
            }
            console.log('Adding new message to state:', data.message);
            // Only add message if it's for the current room (will be filtered by parent component)
            return [...prev, data.message!];
          });
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
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (isAuthenticated) {
          connect();
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  const sendMessage = useCallback((text: string, roomId: number = 1) => {
    console.log('Attempting to send message:', { text, roomId, wsState: wsRef.current?.readyState });
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const messageData = {
        type: 'chat_message',
        text: text.trim(),
        roomId: roomId
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
  }, [isAuthenticated, user, connect, disconnect]);

  return {
    isConnected,
    messages,
    sendMessage,
    setMessages,
  };
}
