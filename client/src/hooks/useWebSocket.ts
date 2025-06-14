import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { Message } from '@shared/schema';

interface BaseWebSocketMessage {
  type: string;
  timestamp: string;
}

interface NewMessageData extends BaseWebSocketMessage {
  type: 'new_message';
  message: Message;
}

interface DeleteMessageData extends BaseWebSocketMessage {
  type: 'message_deleted';
  messageId: number;
}

interface UserEventData extends BaseWebSocketMessage {
  type: 'user_joined' | 'user_left';
  userName: string;
}

interface ErrorMessageData extends BaseWebSocketMessage {
  type: 'error';
  message: string;
}

type WebSocketMessage = NewMessageData | DeleteMessageData | UserEventData | ErrorMessageData;

export function useWebSocket() {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<number>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const userDataRef = useRef<any>(null);
  const connectionAttemptRef = useRef<number>(0);

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
    // Robust user data retrieval with multiple fallbacks
    let effectiveUser = null;
    
    // Try current user first
    if (user && (user as any)?.id) {
      effectiveUser = user;
    }
    // Try stored user data from ref
    else if (userDataRef.current && (userDataRef.current as any)?.id) {
      effectiveUser = userDataRef.current;
    }
    // Try localStorage as final fallback
    else {
      const storedUserData = localStorage.getItem('wsUserData');
      if (storedUserData) {
        try {
          const parsedUser = JSON.parse(storedUserData);
          if (parsedUser && parsedUser.id) {
            effectiveUser = parsedUser;
            userDataRef.current = parsedUser; // Update ref
          }
        } catch (e) {
          console.error('Failed to parse stored user data');
        }
      }
    }
    
    // Don't connect if no valid user data
    if (!effectiveUser) {
      console.log('No user data available for WebSocket connection');
      return;
    }
    
    // Prevent multiple concurrent connection attempts
    if (isConnectingRef.current) {
      console.log('Connection already in progress, skipping...');
      return;
    }
    
    // Increment connection attempt counter to track duplicate attempts
    connectionAttemptRef.current += 1;
    const currentAttempt = connectionAttemptRef.current;
    
    // Clear any pending reconnect timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Strict check to prevent duplicate connections
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        return; // Already connected
      }
      if (wsRef.current.readyState === WebSocket.CONNECTING) {
        return; // Currently connecting
      }
    }
    
    // Properly close any existing connection before creating new one
    if (wsRef.current) {
      console.log('Closing existing WebSocket connection gracefully');
      wsRef.current.onclose = null; // Prevent reconnect loops
      wsRef.current.onerror = null; // Prevent error handling
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }

    isConnectingRef.current = true;
    console.log('Connecting to WebSocket...');
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/websocket`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Verify this is still the current connection attempt
      if (connectionAttemptRef.current !== currentAttempt) {
        console.log('Closing outdated WebSocket connection');
        ws.close();
        return;
      }
      
      console.log('WebSocket connected');
      isConnectingRef.current = false;
      setIsConnected(true);
      setIsReconnecting(false);
      
      // Use the effective user from connect function
      const userId = (effectiveUser as any)?.id;
      const userName = (effectiveUser as any)?.firstName && (effectiveUser as any)?.lastName 
        ? `${(effectiveUser as any).firstName} ${(effectiveUser as any).lastName}` 
        : (effectiveUser as any)?.email?.split('@')[0] || 'Anonymous';
      
      console.log('Sending WebSocket auth:', { 
        userId, 
        userName, 
        hasUser: !!user, 
        hasStoredUser: !!userDataRef.current,
        currentUserData: effectiveUser,
        userEmail: (effectiveUser as any)?.email
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
        
        if (data.type === 'new_message' && data.message && typeof data.message === 'object') {
          console.log('Processing new message:', data.message);
          const newMessage = data.message as Message;
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
          
          // Handle room not found error by clearing current room selection
          if (data.message === 'Chat room not found') {
            console.log('Room not found, triggering room selection reset');
            // Dispatch custom event to notify components about room deletion
            window.dispatchEvent(new CustomEvent('roomDeleted', { 
              detail: { message: data.message } 
            }));
          }
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
      
      // Smart reconnection logic - only reconnect for unexpected closures
      if (event.code !== 1000 && event.code !== 1001) {
        console.log('WebSocket disconnected unexpectedly, attempting reconnection...');
        setIsReconnecting(true);
        
        // Clear any existing timeouts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        if (reconnectingTimeoutRef.current) {
          clearTimeout(reconnectingTimeoutRef.current);
        }
        
        // Auto-clear reconnecting state after 10 seconds if still trying
        reconnectingTimeoutRef.current = setTimeout(() => {
          console.log('Reconnection timeout - clearing reconnecting state');
          setIsReconnecting(false);
        }, 10000);
        
        // Delayed reconnect to avoid rapid connection attempts
        reconnectTimeoutRef.current = setTimeout(() => {
          // Verify we still need to reconnect and have user data
          if ((!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) && 
              (user || userDataRef.current || localStorage.getItem('wsUserData'))) {
            console.log('Attempting WebSocket reconnection...');
            connect();
          } else {
            console.log('No reconnection needed or no user data available');
            setIsReconnecting(false);
            if (reconnectingTimeoutRef.current) {
              clearTimeout(reconnectingTimeoutRef.current);
              reconnectingTimeoutRef.current = null;
            }
          }
        }, 2000); // Increased delay for better stability
      } else {
        console.log('WebSocket closed normally, no reconnection needed');
        setIsReconnecting(false);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  }, []);

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

  // Single connection management effect
  useEffect(() => {
    const shouldConnect = () => {
      const storedUserData = localStorage.getItem('wsUserData');
      const hasValidAuth = isAuthenticated || (user && (user as any).id) || storedUserData;
      
      return hasValidAuth && 
             (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) &&
             !isConnectingRef.current;
    };

    if (shouldConnect()) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (reconnectingTimeoutRef.current) {
        clearTimeout(reconnectingTimeoutRef.current);
      }
    };
  }, [isAuthenticated]);

  // Separate effect for handling user data persistence
  useEffect(() => {
    if (user && (user as any).id) {
      localStorage.setItem('wsUserData', JSON.stringify(user));
      userDataRef.current = user;
    }
  }, [user]);

  return {
    isConnected,
    isReconnecting,
    messages,
    deletedMessageIds,
    sendMessage,
    setMessages,
  };
}
