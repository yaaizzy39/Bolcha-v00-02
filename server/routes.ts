import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertMessageSchema } from "@shared/schema";
import { z } from "zod";

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
}

// Translation API function
async function translateText(text: string, source: string, target: string): Promise<string> {
  try {
    const apiUrl = `https://script.google.com/macros/s/AKfycbyRgU6XjIjoFZh1Y8kIY9-YnLmkNxalGWwlI-0k93wnjfFjWcjDZijIOMy_-WjV47Be0A/exec?text=${encodeURIComponent(text)}&source=${source}&target=${target}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      redirect: 'follow', // Follow redirects automatically
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChatApp/1.0)',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }
    
    const resultText = await response.text();
    
    // Parse JSON response from Google Apps Script
    try {
      const jsonResult = JSON.parse(resultText);
      if (jsonResult.code === 200 && jsonResult.text) {
        return jsonResult.text;
      }
      if (jsonResult.text) {
        return jsonResult.text;
      }
    } catch (parseError) {
      // If JSON parsing fails, check if it's a simple text response
      if (resultText && !resultText.includes('<HTML>') && !resultText.includes('<!DOCTYPE')) {
        return resultText.trim();
      }
    }
    
    return text; // Return original text if translation fails
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original text on error
  }
}

// Language detection function
function detectLanguage(text: string): string {
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  return japaneseRegex.test(text) ? 'ja' : 'en';
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

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocketClient, req) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received WebSocket message:', message);
        
        if (message.type === 'auth') {
          // Handle WebSocket authentication
          ws.userId = message.userId;
          ws.userName = message.userName;
          
          // Broadcast user joined
          broadcastToAll(wss, {
            type: 'user_joined',
            userName: message.userName,
            timestamp: new Date().toISOString(),
          });
          
          return;
        }

        if (message.type === 'chat_message' && ws.userId) {
          console.log('Processing chat message:', { userId: ws.userId, text: message.text, roomId: message.roomId });
          
          // Get user data for profile image
          const user = await storage.getUser(ws.userId);
          const profileImageUrl = user?.useCustomProfileImage && user?.customProfileImageUrl 
            ? user.customProfileImageUrl 
            : user?.profileImageUrl;

          // Validate message
          const messageData = {
            roomId: message.roomId || 1, // Default to general chat room
            senderId: ws.userId,
            senderName: ws.userName || 'Anonymous',
            senderProfileImageUrl: profileImageUrl,
            originalText: message.text,
            originalLanguage: detectLanguage(message.text),
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

            // Save message to database
            const savedMessage = await storage.createMessage(messageData);
            console.log('Message saved successfully:', savedMessage);

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
              message: 'Failed to save message: ' + saveError.message,
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

  // Translation endpoint
  app.post('/api/translate', isAuthenticated, async (req, res) => {
    try {
      const { text, source, target } = req.body;
      
      if (!text || !source || !target) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }

      const translatedText = await translateText(text, source, target);
      res.json({ translatedText });
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({ message: 'Translation failed' });
    }
  });

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
