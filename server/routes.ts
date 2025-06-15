import { Express, Request, Response, NextFunction } from "express";
import { Server, createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage.js";
import { isAuthenticated, setupAuth } from "./replitAuth.js";
import type { InsertMessage, InsertChatRoom } from "../shared/schema.js";

interface AuthenticatedUser {
  claims: {
    sub: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
}

interface WebSocketClient extends WebSocket {
  userId?: string;
  userName?: string;
  roomId?: number;
}

async function translateText(text: string, source: string, target: string): Promise<string> {
  console.log(`Translation request: "${text}" (${source} -> ${target})`);
  
  if (source === target) {
    return text;
  }

  try {
    // Get active translation APIs ordered by priority
    const apis = await storage.getActiveTranslationApis();
    
    if (apis.length === 0) {
      console.log('No active translation APIs configured');
      return text;
    }

    // Try each API in priority order
    for (const api of apis) {
      try {
        console.log(`Trying API: ${api.name} (${api.url})`);
        
        let response;
        
        try {
          // Try GET request first
          const params = new URLSearchParams({
            text: text,
            source: source,
            target: target
          });
          
          response = await fetch(`${api.url}?${params}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            }
          });
          
          if (!response.ok) {
            throw new Error(`GET request failed: ${response.status}`);
          }
        } catch (error) {
          // If GET fails, try POST
          response = await fetch(api.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: text,
              source: source,
              target: target
            })
          });
        }

        if (response.ok) {
          const responseText = await response.text();
          console.log(`API ${api.name} response: ${responseText.substring(0, 100)}...`);
          
          try {
            const data = JSON.parse(responseText);
            // Check for various response formats
            const translatedText = data.translatedText || data.text || data.result;
            if (translatedText && translatedText !== text && data.code === 200) {
              console.log(`API ${api.name} translation: "${text}" -> "${translatedText}"`);
              await storage.updateApiStats(api.id, true);
              return translatedText;
            }
          } catch (parseError) {
            console.log(`API ${api.name} response not JSON: ${responseText.substring(0, 100)}...`);
          }
        } else {
          console.log(`API ${api.name} request failed with status: ${response.status}`);
        }
        
        // Mark this API as having an error
        await storage.updateApiStats(api.id, false);
        
      } catch (apiError) {
        console.log(`API ${api.name} failed:`, apiError);
        await storage.updateApiStats(api.id, false);
      }
    }

    console.log(`No translation available for: "${text}"`);
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

// No local translation - return original text when translation service fails
function getSimpleTranslation(text: string, target: string): string {
  console.log(`Translation service failed for: "${text}"`);
  return text;
}

// Enhanced language detection function
function detectLanguage(text: string): string {
  // Language detection patterns
  const patterns: Record<string, RegExp> = {
    'ja': /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,  // Japanese
    'ko': /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/,  // Korean
    'zh': /[\u4E00-\u9FFF]/,                              // Chinese
    'ar': /[\u0600-\u06FF\u0750-\u077F]/,                // Arabic
    'hi': /[\u0900-\u097F]/,                             // Hindi
    'th': /[\u0E00-\u0E7F]/,                             // Thai
    'vi': /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i,
    'ru': /[\u0400-\u04FF]/,                             // Russian
    'es': /[ñáéíóúü]/i,                                  // Spanish
    'fr': /[àâäçéèêëïîôùûüÿ]/i,                          // French
    'de': /[äöüßÄÖÜ]/,                                   // German
    'pt': /[ãâáàçêéíôóõúü]/i,                            // Portuguese
    'it': /[àèéìíîòóù]/i,                                // Italian
    'nl': /[äëïöüÄËÏÖÜ]/,                                // Dutch
  };

  // Check for non-Latin scripts first
  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return lang;
    }
  }

  // Default to English for basic Latin text
  return 'en';
}

// Extract mentions from message text
function extractMentions(text: string): string[] {
  const mentionPattern = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionPattern.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return Array.from(new Set(mentions));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  const server = createServer(app);

  // Chat rooms routes
  app.get('/api/rooms', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const rooms = await storage.getChatRooms();
      res.json(rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  });

  app.post('/api/rooms', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as AuthenticatedUser;
      const { name, description } = req.body;
      
      const roomData: InsertChatRoom = {
        name: name?.trim() || 'New Room',
        description: description?.trim() || null,
        createdBy: user.claims.sub,
      };

      const room = await storage.createChatRoom(roomData);
      res.json(room);
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(500).json({ error: 'Failed to create room' });
    }
  });

  app.delete('/api/rooms/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as AuthenticatedUser;
      const roomId = parseInt(req.params.id);
      
      const success = await storage.deleteChatRoom(roomId, user.claims.sub);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(403).json({ error: 'Unauthorized or room not found' });
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      res.status(500).json({ error: 'Failed to delete room' });
    }
  });

  // Messages routes
  app.get('/api/rooms/:roomId/messages', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const limit = parseInt(req.query.limit as string) || 200;
      
      const messages = await storage.getMessages(roomId, limit);
      console.log(`Fetched ${messages.length} messages for room ${roomId}`);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/rooms/:roomId/messages', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as AuthenticatedUser;
      const roomId = parseInt(req.params.roomId);
      const { text, replyToId } = req.body;
      
      if (!text?.trim()) {
        return res.status(400).json({ error: 'Message text is required' });
      }

      const messageData: InsertMessage = {
        roomId,
        senderId: user.claims.sub,
        senderName: user.claims.first_name || user.claims.email || 'Anonymous',
        originalText: text.trim(),
        originalLanguage: detectLanguage(text.trim()),
        replyToId: replyToId || null,
      };

      const message = await storage.createMessage(messageData);
      
      // Update room activity
      await storage.updateRoomActivity(roomId);
      
      res.json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: 'Failed to create message' });
    }
  });

  app.delete('/api/messages/:messageId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as AuthenticatedUser;
      const messageId = parseInt(req.params.messageId);
      
      const success = await storage.deleteMessage(messageId, user.claims.sub);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(403).json({ error: 'Unauthorized or message not found' });
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  // Translation route with manual-only functionality and proper authentication
  app.post('/api/translate', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { text, source, target } = req.body;
      
      if (!text || !source || !target) {
        return res.status(400).json({ error: 'Missing required parameters: text, source, target' });
      }

      console.log(`Translation request from user ${req.user?.claims?.sub}: "${text}" (${source} -> ${target})`);

      // Get active translation APIs in priority order
      const apis = await storage.getActiveTranslationApis();
      
      if (apis.length === 0) {
        console.log('No translation APIs configured');
        return res.json({ translatedText: text }); // Return original text
      }

      // Try each API sequentially until one succeeds
      for (const api of apis) {
        try {
          console.log(`Trying API: ${api.name}`);
          const response = await fetch(api.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              source,
              target
            }),
          });

          if (response.ok) {
            const data = await response.json();
            await storage.updateApiStats(api.id, true);
            console.log(`Translation successful via ${api.name}: "${data.translatedText}"`);
            return res.json({ translatedText: data.translatedText });
          } else {
            console.log(`API ${api.name} failed with status ${response.status}`);
            await storage.updateApiStats(api.id, false);
          }
        } catch (error) {
          console.log(`API ${api.name} error:`, error);
          await storage.updateApiStats(api.id, false);
        }
      }

      // All APIs failed - return original text
      console.log('All translation APIs failed, returning original text');
      return res.json({ translatedText: text });
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({ error: 'Translation service error' });
    }
  });

  // User settings routes
  app.get('/api/auth/user', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as AuthenticatedUser;
      const userData = await storage.getUser(user.claims.sub);
      
      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(userData);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  app.patch('/api/auth/user', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as AuthenticatedUser;
      const updates = req.body;
      
      const updatedUser = await storage.updateUserSettings(user.claims.sub, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Update user settings
  app.patch('/api/user/settings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as AuthenticatedUser;
      const updates = req.body;
      const updatedUser = await storage.updateUserSettings(user.claims.sub, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Update user profile image
  app.post('/api/user/profile-image', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as AuthenticatedUser;
      const { imageUrl, useCustom } = req.body;
      
      console.log('Profile image update request:', {
        userId: user.claims.sub,
        imageUrlLength: imageUrl?.length || 0,
        useCustom,
        hasImageUrl: !!imageUrl
      });
      
      if (!imageUrl || typeof useCustom !== 'boolean') {
        console.log('Missing required fields for profile image update');
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const updatedUser = await storage.updateUserProfileImage(user.claims.sub, imageUrl, useCustom);
      console.log('Profile image updated successfully:', {
        userId: user.claims.sub,
        useCustomProfileImage: updatedUser.useCustomProfileImage,
        hasCustomImageUrl: !!updatedUser.customProfileImageUrl
      });
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating profile image:', error);
      res.status(500).json({ error: 'Failed to update profile image' });
    }
  });

  // Likes routes
  app.post('/api/messages/:messageId/like', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as AuthenticatedUser;
      const messageId = parseInt(req.params.messageId);
      
      const result = await storage.toggleMessageLike(messageId, user.claims.sub);
      res.json(result);
    } catch (error) {
      console.error('Error toggling like:', error);
      res.status(500).json({ error: 'Failed to toggle like' });
    }
  });

  app.get('/api/messages/:messageId/likes', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const likes = await storage.getMessageLikes(messageId);
      res.json(likes);
    } catch (error) {
      console.error('Error fetching likes:', error);
      res.status(500).json({ error: 'Failed to fetch likes' });
    }
  });

  app.get('/api/user/likes', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as AuthenticatedUser;
      const likedMessageIds = await storage.getUserLikes(user.claims.sub);
      res.json(likedMessageIds);
    } catch (error) {
      console.error('Error fetching user likes:', error);
      res.status(500).json({ error: 'Failed to fetch user likes' });
    }
  });

  // Admin translation API management routes
  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as AuthenticatedUser;
      console.log('Checking admin access for user:', user.claims.sub);
      const userData = await storage.getUser(user.claims.sub);
      console.log('User data:', userData);
      console.log('isAdmin field:', userData?.isAdmin);
      if (!userData?.isAdmin) {
        console.log('User is not admin, access denied');
        return res.status(403).json({ error: 'Admin access required' });
      }
      console.log('Admin access granted');
      next();
    } catch (error) {
      console.error('Error verifying admin status:', error);
      res.status(500).json({ error: 'Failed to verify admin status' });
    }
  };

  // Test admin endpoint
  app.get('/api/admin/test', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as AuthenticatedUser;
      console.log('Admin test endpoint accessed by user:', user.claims.sub);
      const userData = await storage.getUser(user.claims.sub);
      console.log('User data in test endpoint:', userData);
      res.json({ 
        message: 'Admin test successful', 
        user: userData,
        isAdmin: userData?.isAdmin 
      });
    } catch (error) {
      console.error('Error in admin test:', error);
      res.status(500).json({ error: 'Test failed' });
    }
  });

  app.get('/api/admin/translation-apis', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    try {
      const apis = await storage.getTranslationApis();
      res.json(apis);
    } catch (error) {
      console.error('Error fetching translation APIs:', error);
      res.status(500).json({ error: 'Failed to fetch translation APIs' });
    }
  });

  // Temporary direct API creation endpoint
  app.post('/api/translation-apis/create', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as AuthenticatedUser;
      console.log('Direct API creation endpoint accessed by user:', user.claims.sub);
      const userData = await storage.getUser(user.claims.sub);
      console.log('User data for direct creation:', userData);
      
      if (!userData?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      console.log('Creating new translation API with data:', req.body);
      const { name, url, priority, isActive } = req.body;
      
      if (!name || !url) {
        return res.status(400).json({ error: 'Name and URL are required' });
      }
      
      const newApi = await storage.createTranslationApi({
        name,
        url,
        priority: priority || 1,
        isActive: isActive !== false
      });
      console.log('Successfully created translation API:', newApi);
      res.json(newApi);
    } catch (error) {
      console.error('Error creating translation API:', error);
      res.status(500).json({ error: 'Failed to create translation API', details: String(error) });
    }
  });

  app.post('/api/admin/translation-apis', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    try {
      console.log('Creating new translation API with data:', req.body);
      const { name, url, priority, isActive } = req.body;
      
      if (!name || !url) {
        return res.status(400).json({ error: 'Name and URL are required' });
      }
      
      const newApi = await storage.createTranslationApi({
        name,
        url,
        priority: priority || 1,
        isActive: isActive !== false
      });
      console.log('Successfully created translation API:', newApi);
      res.json(newApi);
    } catch (error) {
      console.error('Error creating translation API:', error);
      res.status(500).json({ error: 'Failed to create translation API', details: String(error) });
    }
  });

  app.put('/api/admin/translation-apis/:id', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const updatedApi = await storage.updateTranslationApi(id, updates);
      res.json(updatedApi);
    } catch (error) {
      console.error('Error updating translation API:', error);
      res.status(500).json({ error: 'Failed to update translation API' });
    }
  });

  app.delete('/api/admin/translation-apis/:id', isAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTranslationApi(id);
      if (success) {
        res.json({ message: 'Translation API deleted successfully' });
      } else {
        res.status(404).json({ error: 'Translation API not found' });
      }
    } catch (error) {
      console.error('Error deleting translation API:', error);
      res.status(500).json({ error: 'Failed to delete translation API' });
    }
  });

  // WebSocket setup
  const wss = new WebSocketServer({ 
    server,
    path: '/websocket'
  });

  function broadcastToRoom(wss: WebSocketServer, roomId: number, data: any) {
    const message = JSON.stringify(data);
    let sentCount = 0;
    let totalInRoom = 0;
    
    wss.clients.forEach((client: WebSocketClient) => {
      if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
        totalInRoom++;
        client.send(message);
        sentCount++;
      }
    });
    
    console.log(`Broadcast message sent to ${sentCount} clients in room ${roomId}`);
  }

  function getOnlineUserCount(roomId: number): number {
    let count = 0;
    wss.clients.forEach((client: WebSocketClient) => {
      if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
        count++;
      }
    });
    return count;
  }

  function broadcastOnlineCount(roomId: number) {
    const onlineCount = getOnlineUserCount(roomId);
    console.log(`Broadcasting online count for room ${roomId}: ${onlineCount} users`);
    broadcastToRoom(wss, roomId, {
      type: 'online_count_updated',
      roomId,
      onlineCount,
      timestamp: new Date().toISOString()
    });
  }

  wss.on('connection', (ws: WebSocketClient, req) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data);
        
        if (data.type === 'auth') {
          ws.userId = data.userId;
          ws.userName = data.userName;
          console.log('WebSocket authenticated:', { userId: data.userId, userName: data.userName });
          
          broadcastToAll(wss, {
            type: 'user_joined',
            userName: data.userName,
            timestamp: new Date().toISOString()
          });
        } else if (data.type === 'join_room') {
          const previousRoomId = ws.roomId;
          
          if (previousRoomId !== undefined) {
            broadcastOnlineCount(previousRoomId);
          }
          
          ws.roomId = data.roomId;
          broadcastOnlineCount(data.roomId);
          
          const onlineCount = getOnlineUserCount(data.roomId);
          console.log(`User ${ws.userId} joined room ${data.roomId}, online count: ${onlineCount}`);
        } else if (data.type === 'chat_message') {
          // Handle chat message creation and broadcasting
          if (ws.roomId && ws.userId) {
            try {
              const messageData = {
                roomId: ws.roomId,
                senderId: ws.userId,
                senderName: ws.userName || 'Unknown User',
                originalText: data.text,
                originalLanguage: detectLanguage(data.text),
                replyToId: data.replyToId || null,
                replyToText: data.replyToText || null,
                replyToSenderName: data.replyToSenderName || null,
                mentions: data.mentions || []
              } as InsertMessage;

              const newMessage = await storage.createMessage(messageData);
              
              broadcastToRoom(wss, ws.roomId, {
                type: 'new_message',
                message: newMessage,
                timestamp: new Date().toISOString()
              });
            } catch (error) {
              console.error('Error creating message:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to send message',
                timestamp: new Date().toISOString()
              }));
            }
          }
        } else if (data.type === 'new_message') {
          if (ws.roomId) {
            broadcastToRoom(wss, ws.roomId, {
              type: 'new_message',
              message: data.message,
              timestamp: new Date().toISOString()
            });
          }
        } else if (data.type === 'message_deleted') {
          if (ws.roomId) {
            broadcastToRoom(wss, ws.roomId, {
              type: 'message_deleted',
              messageId: data.messageId,
              timestamp: new Date().toISOString()
            });
          }
        } else if (data.type === 'room_created') {
          broadcastToAll(wss, {
            type: 'room_created',
            room: data.room,
            timestamp: new Date().toISOString()
          });
        } else if (data.type === 'room_deleted') {
          broadcastToAll(wss, {
            type: 'room_deleted',
            roomId: data.roomId,
            timestamp: new Date().toISOString()
          });
        } else if (data.type === 'message_like_updated') {
          if (ws.roomId) {
            broadcastToRoom(wss, ws.roomId, {
              type: 'message_like_updated',
              messageId: data.messageId,
              liked: data.liked,
              totalLikes: data.totalLikes,
              userId: data.userId,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      if (ws.roomId !== undefined) {
        broadcastOnlineCount(ws.roomId);
      }
      
      if (ws.userName) {
        broadcastToAll(wss, {
          type: 'user_left',
          userName: ws.userName,
          timestamp: new Date().toISOString()
        });
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  function broadcastToAll(wss: WebSocketServer, data: any) {
    const message = JSON.stringify(data);
    let sentCount = 0;
    
    wss.clients.forEach((client: WebSocketClient) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
      }
    });
    
    console.log(`Broadcast message sent to ${sentCount} clients out of ${wss.clients.size} total`);
  }

  return server;
}