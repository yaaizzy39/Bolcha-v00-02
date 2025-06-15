import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { users, messages, chatRooms } from "@shared/schema";
import { eq } from "drizzle-orm";

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

// Translation API function using Google Apps Script
async function translateText(text: string, source: string, target: string): Promise<string> {
  console.log(`Translation request: "${text}" (${source} -> ${target})`);
  
  try {
    // Skip translation if source and target are the same
    if (source === target) {
      return text;
    }

    // Use fallback translation first for common phrases
    const fallbackResult = getSimpleTranslation(text, target);
    if (fallbackResult !== text) {
      console.log(`Using local translation: "${text}" -> "${fallbackResult}"`);
      return fallbackResult;
    }

    // Try Google Apps Script translation API
    const gasUrl = process.env.GAS_TRANSLATE_URL || 'https://script.google.com/macros/s/AKfycbyRgU6XjIjoFZh1Y8kIY9-YnLmkNxalGWwlI-0k93wnjfFjWcjDZijIOMy_-WjV47Be0A/exec';
    
    // Try both GET and POST methods for GAS API compatibility
    let response;
    
    // First try GET method with query parameters
    const getUrl = `${gasUrl}?text=${encodeURIComponent(text)}&source=${source}&target=${target}`;
    try {
      response = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        // If GET fails, try POST method
        response = await fetch(gasUrl, {
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
    } catch (error) {
      // If GET fails completely, try POST
      response = await fetch(gasUrl, {
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
      console.log(`GAS API response: ${responseText}`);
      
      try {
        const data = JSON.parse(responseText);
        if (data.translatedText && data.translatedText !== text) {
          console.log(`GAS translation: "${text}" -> "${data.translatedText}"`);
          return data.translatedText;
        }
      } catch (parseError) {
        console.log(`GAS API response not JSON: ${responseText.substring(0, 100)}...`);
      }
    } else {
      console.log(`GAS API request failed with status: ${response.status}`);
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

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user settings
  app.patch('/api/user/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settingsSchema = z.object({
        preferredLanguage: z.string().optional(),
        interfaceLanguage: z.string().optional(),
        showOriginalText: z.boolean().optional(),
        autoTranslate: z.boolean().optional(),
        messageAlignment: z.string().optional(),
      });
      
      const settings = settingsSchema.parse(req.body);
      const updatedUser = await storage.updateUserSettings(userId, settings);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Update user profile image
  app.post('/api/user/profile-image', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { imageUrl, useCustom } = req.body;
      
      if (!imageUrl || typeof useCustom !== 'boolean') {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const updatedUser = await storage.updateUserProfileImage(userId, imageUrl, useCustom);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({ message: "Failed to update profile image" });
    }
  });



  // Toggle between Google and custom profile image
  app.post('/api/user/toggle-profile-image', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // If switching to Google profile and no Google profile image URL exists, try to fetch it
      if (user.useCustomProfileImage && !user.profileImageUrl) {
        const accessToken = req.user.access_token;
        if (accessToken) {
          try {
            const googleResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`);
            if (googleResponse.ok) {
              const googleProfile = await googleResponse.json();
              if (googleProfile.picture) {
                await db
                  .update(users)
                  .set({ 
                    profileImageUrl: googleProfile.picture,
                    firstName: googleProfile.given_name || user.firstName,
                    lastName: googleProfile.family_name || user.lastName,
                    updatedAt: new Date(),
                  })
                  .where(eq(users.id, userId));
              }
            }
          } catch (error) {
            console.log('Could not refresh Google profile image:', error);
          }
        }
      }

      const updatedUser = await storage.updateUserProfileImage(
        userId, 
        user.customProfileImageUrl || '', 
        !user.useCustomProfileImage
      );
      res.json(updatedUser);
    } catch (error) {
      console.error("Error toggling profile image:", error);
      res.status(500).json({ message: "Failed to toggle profile image" });
    }
  });

  // Chat room routes
  app.get('/api/rooms', isAuthenticated, async (req, res) => {
    try {
      const rooms = await storage.getChatRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ message: "Failed to fetch chat rooms" });
    }
  });

  app.get('/api/rooms/:id', isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const room = await storage.getChatRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      
      res.json(room);
    } catch (error) {
      console.error("Error fetching room:", error);
      res.status(500).json({ message: "Failed to fetch room" });
    }
  });

  app.post('/api/rooms', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Creating room with data:", req.body);
      console.log("User ID:", req.user.claims.sub);
      
      const { name, description } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: "Room name is required" });
      }
      
      const roomData = {
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: req.user.claims.sub,
      };
      
      console.log("Final room data:", roomData);
      const room = await storage.createChatRoom(roomData);
      console.log("Created room:", room);
      
      // Broadcast new room to all connected clients
      broadcastToAll(wss, {
        type: 'room_created',
        room: room,
        timestamp: new Date().toISOString()
      });
      
      res.json(room);
    } catch (error) {
      console.error("Error creating chat room:", error);
      console.error("Error details:", error instanceof Error ? error.message : error);
      res.status(500).json({ message: "Failed to create chat room" });
    }
  });

  app.delete('/api/rooms/:id', isAuthenticated, async (req: any, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const success = await storage.deleteChatRoom(roomId, userId);
      if (success) {
        // Broadcast room deletion to all connected clients
        broadcastToAll(wss, {
          type: 'room_deleted',
          roomId: roomId,
          timestamp: new Date().toISOString()
        });
        
        res.json({ message: "Chat room deleted successfully" });
      } else {
        res.status(403).json({ message: "Not authorized to delete this room" });
      }
    } catch (error) {
      console.error("Error deleting chat room:", error);
      res.status(500).json({ message: "Failed to delete chat room" });
    }
  });

  // Get messages for a specific room
  app.get('/api/messages/:roomId', isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const messages = await storage.getMessages(roomId);
      res.json(messages.reverse()); // Return in chronological order
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Get participants in a room
  app.get('/api/rooms/:roomId/participants', isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      
      // Get the room info to include room creator
      const room = await db
        .select()
        .from(chatRooms)
        .where(eq(chatRooms.id, roomId))
        .limit(1);
      
      if (room.length === 0) {
        return res.status(404).json({ message: 'Room not found' });
      }
      
      // Get unique users who have sent messages in this room
      const messageParticipants = await db
        .selectDistinct({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
          useCustomProfileImage: users.useCustomProfileImage,
          customProfileImageUrl: users.customProfileImageUrl
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.roomId, roomId))
        .orderBy(users.firstName, users.lastName);

      // Get room creator info
      const roomCreator = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
          useCustomProfileImage: users.useCustomProfileImage,
          customProfileImageUrl: users.customProfileImageUrl
        })
        .from(users)
        .where(eq(users.id, room[0].createdBy))
        .limit(1);

      // Combine and deduplicate participants
      const allParticipants = [...messageParticipants];
      
      // Add room creator if not already in the list
      if (roomCreator.length > 0) {
        const creatorExists = messageParticipants.some(p => p.id === roomCreator[0].id);
        if (!creatorExists) {
          allParticipants.push(roomCreator[0]);
        }
      }

      res.json(allParticipants);
    } catch (error) {
      console.error('Error fetching room participants:', error);
      res.status(500).json({ message: 'Failed to fetch room participants' });
    }
  });

  // Legacy route for backward compatibility
  app.get('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessages(1); // Default to room 1
      res.json(messages.reverse());
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Delete message route
  app.delete('/api/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      
      const deleted = await storage.deleteMessage(messageId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Message not found or not authorized to delete" });
      }

      // Broadcast message deletion to all connected clients
      broadcastToAll(wss, {
        type: 'message_deleted',
        messageId: messageId,
        timestamp: new Date().toISOString(),
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Cleanup job for inactive rooms (runs every hour)
  setInterval(async () => {
    try {
      const cleanedUp = await storage.cleanupInactiveRooms();
      if (cleanedUp > 0) {
        console.log(`Cleaned up ${cleanedUp} inactive chat rooms`);
      }
    } catch (error) {
      console.error("Error cleaning up inactive rooms:", error);
    }
  }, 60 * 60 * 1000); // Run every hour

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server setup with custom path to avoid conflicts with Vite
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/websocket'
  });

  // Track online users per room
  const roomOnlineUsers = new Map<number, Set<string>>();

  // Helper function to broadcast to specific room
  function broadcastToRoom(wss: WebSocketServer, roomId: number, data: any) {
    const message = JSON.stringify(data);
    let sentCount = 0;
    wss.clients.forEach((client: WebSocketClient) => {
      if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
        client.send(message);
        sentCount++;
      }
    });
    console.log(`Broadcast message sent to ${sentCount} clients in room ${roomId}`);
  }

  // Helper function to get online user count for a room
  function getOnlineUserCount(roomId: number): number {
    return roomOnlineUsers.get(roomId)?.size || 0;
  }

  // Helper function to broadcast online user count updates
  function broadcastOnlineCount(roomId: number) {
    const count = getOnlineUserCount(roomId);
    console.log(`Broadcasting online count for room ${roomId}: ${count} users`);
    broadcastToRoom(wss, roomId, {
      type: 'online_count_updated',
      roomId,
      onlineCount: count,
      timestamp: new Date().toISOString(),
    });
  }
  
  wss.on('connection', (ws: WebSocketClient, req) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received WebSocket message:', message);
        
        if (message.type === 'auth') {
          // Handle WebSocket authentication
          ws.userId = message.userId || null;
          ws.userName = message.userName || 'Anonymous';
          
          console.log('WebSocket authenticated:', { userId: ws.userId, userName: ws.userName });
          
          // Broadcast user joined
          broadcastToAll(wss, {
            type: 'user_joined',
            userName: ws.userName,
            timestamp: new Date().toISOString(),
          });
          
          return;
        }

        if (message.type === 'join_room') {
          // Handle room joining
          const roomId = message.roomId;
          if (roomId && ws.userId) {
            // Remove user from previous room
            if (ws.roomId) {
              const prevRoomUsers = roomOnlineUsers.get(ws.roomId);
              if (prevRoomUsers) {
                prevRoomUsers.delete(ws.userId);
                if (prevRoomUsers.size === 0) {
                  roomOnlineUsers.delete(ws.roomId);
                }
                // Broadcast updated count for previous room
                broadcastOnlineCount(ws.roomId);
              }
            }

            // Add user to new room
            ws.roomId = roomId;
            if (!roomOnlineUsers.has(roomId)) {
              roomOnlineUsers.set(roomId, new Set());
            }
            roomOnlineUsers.get(roomId)!.add(ws.userId);
            
            // Broadcast updated count for new room
            broadcastOnlineCount(roomId);
            
            console.log(`User ${ws.userId} joined room ${roomId}, online count: ${getOnlineUserCount(roomId)}`);
          }
          return;
        }

        if (message.type === 'chat_message' && ws.userId) {
          console.log('Processing chat message:', { userId: ws.userId, text: message.text, roomId: message.roomId });
          
          // Get user data for profile image
          const user = await storage.getUser(ws.userId);
          let profileImageUrl = user?.useCustomProfileImage && user?.customProfileImageUrl 
            ? user.customProfileImageUrl 
            : user?.profileImageUrl;
          
          // Prevent base64 data URLs from being stored directly - use a placeholder or external URL
          if (profileImageUrl && profileImageUrl.startsWith('data:')) {
            profileImageUrl = null; // Use fallback avatar instead of storing base64 data
          }

          // Extract mentions from message text
          const mentions = extractMentions(message.text);

          // Validate message
          const messageData = {
            roomId: message.roomId || 1, // Default to general chat room
            senderId: ws.userId,
            senderName: ws.userName || 'Anonymous',
            senderProfileImageUrl: profileImageUrl,
            originalText: message.text,
            originalLanguage: detectLanguage(message.text),
            replyToId: message.replyToId || null,
            replyToText: message.replyToText || null,
            replyToSenderName: message.replyToSenderName || null,
            mentions: mentions,
          };

          console.log('Message data to save:', messageData);

          try {
            // Verify room exists before saving message
            const room = await storage.getChatRoom(messageData.roomId);
            if (!room) {
              console.error('Room not found:', messageData.roomId);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Chat room not found',
              }));
              return;
            }
            
            console.log('Room verification passed:', room.name);

            // Check if room is admin-only and user is not admin
            if (room.adminOnly && !user?.isAdmin) {
              console.log('Non-admin user attempted to post in admin-only room:', { userId: ws.userId, roomId: messageData.roomId });
              ws.send(JSON.stringify({
                type: 'error',
                message: 'This room is restricted to administrators only',
              }));
              return;
            }

            // Save message to database
            console.log('Attempting to save message with data:', messageData);
            const savedMessage = await storage.createMessage(messageData);
            console.log('Message saved successfully:', savedMessage.id);

            // Update room activity timestamp
            await storage.updateRoomActivity(messageData.roomId);

            // Broadcast message to all clients
            const broadcastData = {
              type: 'new_message',
              message: {
                ...savedMessage,
                id: Number(savedMessage.id), // Ensure id is a number
              },
              timestamp: new Date().toISOString(),
            };

            console.log('Broadcasting message:', broadcastData);
            broadcastToAll(wss, broadcastData);
          } catch (saveError) {
            console.error('Error saving message:', saveError);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to save message: ' + (saveError instanceof Error ? saveError.message : String(saveError)),
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
        }));
      }
    });

    ws.on('close', () => {
      // Remove user from online count when disconnecting
      if (ws.userId && ws.roomId) {
        const roomUsers = roomOnlineUsers.get(ws.roomId);
        if (roomUsers) {
          roomUsers.delete(ws.userId);
          if (roomUsers.size === 0) {
            roomOnlineUsers.delete(ws.roomId);
          }
          // Broadcast updated count
          broadcastOnlineCount(ws.roomId);
          console.log(`User ${ws.userId} left room ${ws.roomId}, online count: ${getOnlineUserCount(ws.roomId)}`);
        }
      }

      if (ws.userName) {
        broadcastToAll(wss, {
          type: 'user_left',
          userName: ws.userName,
          timestamp: new Date().toISOString(),
        });
      }
      console.log('WebSocket client disconnected');
    });
  });

  // Manual cleanup trigger for testing
  app.post('/api/cleanup-rooms', isAuthenticated, async (req, res) => {
    try {
      const deletedCount = await storage.cleanupInactiveRooms();
      res.json({ message: `Cleaned up ${deletedCount} inactive rooms`, deletedCount });
    } catch (error) {
      console.error('Manual cleanup error:', error);
      res.status(500).json({ message: 'Cleanup failed' });
    }
  });

  // Translation endpoint
  app.post('/api/translate', isAuthenticated, async (req, res) => {
    try {
      const { text, source, target } = req.body;
      
      console.log(`Translation API request: "${text}" (${source} -> ${target})`);
      
      if (!text || !source || !target) {
        console.log('Translation API: Missing required parameters');
        return res.status(400).json({ message: 'Missing required parameters' });
      }

      const translatedText = await translateText(text, source, target);
      console.log(`Translation API result: "${text}" -> "${translatedText}"`);
      
      res.json({ translatedText });
    } catch (error) {
      console.error('Translation API error:', error);
      res.status(500).json({ message: 'Translation failed' });
    }
  });

  // Like endpoints
  app.post('/api/messages/:messageId/like', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const userId = req.user.claims.sub;
      
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      
      const result = await storage.toggleMessageLike(messageId, userId);
      
      // Broadcast like update to all connected clients
      broadcastToAll(wss, {
        type: 'message_like_updated',
        messageId: messageId,
        liked: result.liked,
        totalLikes: result.totalLikes,
        userId: userId,
        timestamp: new Date().toISOString(),
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error toggling message like:", error);
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  // Get user's liked messages
  app.get('/api/user/likes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const likedMessageIds = await storage.getUserLikes(userId);
      res.json({ likedMessageIds });
    } catch (error) {
      console.error("Error fetching user likes:", error);
      res.status(500).json({ message: "Failed to fetch likes" });
    }
  });



  // Get online user count for a room
  app.get('/api/rooms/:roomId/online-count', isAuthenticated, (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const count = getOnlineUserCount(roomId);
      res.json({ onlineCount: count });
    } catch (error) {
      console.error("Error fetching online count:", error);
      res.status(500).json({ message: "Failed to fetch online count" });
    }
  });

  // Start periodic cleanup of inactive rooms (every 6 hours)
  setInterval(async () => {
    try {
      const deletedCount = await storage.cleanupInactiveRooms();
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} inactive rooms`);
      }
    } catch (error) {
      console.error('Error during room cleanup:', error);
    }
  }, 6 * 60 * 60 * 1000); // Run every 6 hours

  return httpServer;
}

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


