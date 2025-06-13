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

  // Get messages
  app.get('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages.reverse()); // Return in chronological order
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocketClient, req) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
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
          // Validate message
          const messageData = {
            senderId: ws.userId,
            senderName: ws.userName || 'Anonymous',
            originalText: message.text,
            originalLanguage: detectLanguage(message.text),
          };

          // Save message to database
          const savedMessage = await storage.createMessage(messageData);

          // Broadcast message to all clients
          const broadcastData = {
            type: 'new_message',
            message: {
              ...savedMessage,
              id: savedMessage.id.toString(),
            },
            timestamp: new Date().toISOString(),
          };

          broadcastToAll(wss, broadcastData);
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
  wss.clients.forEach((client: WebSocketClient) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
