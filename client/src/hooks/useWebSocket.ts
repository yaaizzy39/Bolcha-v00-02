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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const userDataRef = useRef<any>(null);

  // Store user data in ref when available and also in localStorage for persistence
  useEffect(() => {
    if (user) {
      userDataRef.current = user;
      localStorage.setItem('wsUserData', JSON.stringify(user));
    }
  }, [user]);

  // Initialize user data from localStorage on mount
  useEffect(() => {
    const storedUserData = localStorage.getItem('wsUserData');
    if (storedUserData && !userDataRef.current) {
      try {
        userDataRef.current = JSON.parse(storedUserData);
      } catch (e) {
        console.error('Failed to parse stored user data:', e);
      }
    }
  }, []);

  const connect = useCallback(() => {
    // Get the most current user data
    const currentUser = user || userDataRef.current;
    const storedUserData = localStorage.getItem('wsUserData');
    let fallbackUser = null;
    
    if (storedUserData) {
      try {
        fallbackUser = JSON.parse(storedUserData);
      } catch (e) {
        console.error('Failed to parse stored user data');
      }
    }
    
    const effectiveUser = currentUser || fallbackUser;
    
    if (!isAuthenticated || !effectiveUser || isConnectingRef.current) {
      return;
    }
    
    // Clear any pending reconnect timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Don't close existing stable connection
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }
    
    // Close only if connection is closed/failed
    if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
      wsRef.current.close();
      wsRef.current = null;
    }

    isConnectingRef.current = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      isConnectingRef.current = false;
      setIsConnected(true);
      
      // Authenticate WebSocket connection - use current, stored, or localStorage user data
      let currentUser = user || userDataRef.current;
      
      // Fallback to localStorage if both are unavailable
      if (!currentUser) {
        const storedUserData = localStorage.getItem('wsUserData');
        if (storedUserData) {
          try {
            currentUser = JSON.parse(storedUserData);
            userDataRef.current = currentUser;
          } catch (e) {
            console.error('Failed to parse stored user data:', e);
          }
        }
      }
      
      const userId = (currentUser as any)?.id;
      const userName = (currentUser as any)?.firstName && (currentUser as any)?.lastName 
        ? `${(currentUser as any).firstName} ${(currentUser as any).lastName}` 
        : (currentUser as any)?.email?.split('@')[0] || 'Anonymous';
      
      console.log('Sending WebSocket auth:', { 
        userId, 
        userName, 
        hasUser: !!user, 
        hasStoredUser: !!userDataRef.current,
        currentUserData: currentUser,
        userEmail: (currentUser as any)?.email
      });
      
      // Only proceed if we have a valid userId
      if (!userId) {
        console.error('No valid userId available for WebSocket auth - closing connection');
        ws.close();
        return;
      }
      
      ws.send(JSON.stringify({
        type: 'auth',
        userId: userId,
        userName: userName
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

    ws.onclose = (event) => {
      console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
      isConnectingRef.current = false;
      setIsConnected(false);
      
      // Clear the reference if this was the current connection
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      
      // Auto-reconnect only if it wasn't a manual close and user is still authenticated
      if (event.code !== 1000 && isAuthenticated && (user || userDataRef.current)) {
        console.log('Scheduling WebSocket reconnection in 3 seconds...');
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            connect();
          }
        }, 3000);
      }
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
    // Only connect if authenticated and we have user data
    if (isAuthenticated && (user || userDataRef.current)) {
      // Don't create new connection if one is already open
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connect();
      }
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isAuthenticated, connect]);

  return {
    isConnected,
    messages,
    deletedMessageIds,
    sendMessage,
    setMessages,
  };
}
