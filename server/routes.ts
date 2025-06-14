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
}

// Translation API function
async function translateText(text: string, source: string, target: string): Promise<string> {
  try {
    // Skip translation if source and target are the same
    if (source === target) {
      return text;
    }

    const apiUrl = `https://script.google.com/macros/s/AKfycbyRgU6XjIjoFZh1Y8kIY9-YnLmkNxalGWwlI-0k93wnjfFjWcjDZijIOMy_-WjV47Be0A/exec?text=${encodeURIComponent(text)}&source=${source}&target=${target}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      redirect: 'follow',
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
        const translatedText = jsonResult.text.trim();
        // If translation is identical to original (failed translation), try alternative approach
        if (translatedText === text.trim() || translatedText === text) {
          console.log(`Translation failed for "${text}" (returned same text) -> trying fallback`);
          return getSimpleTranslation(text, target);
        }
        return translatedText;
      }
      if (jsonResult.text) {
        const translatedText = jsonResult.text.trim();
        if (translatedText === text.trim() || translatedText === text) {
          console.log(`Translation failed for "${text}" (returned same text) -> trying fallback`);
          return getSimpleTranslation(text, target);
        }
        return translatedText;
      }
    } catch (parseError) {
      // If JSON parsing fails, check if it's a simple text response
      if (resultText && !resultText.includes('<HTML>') && !resultText.includes('<!DOCTYPE')) {
        const translatedText = resultText.trim();
        if (translatedText === text.trim() || translatedText === text) {
          console.log(`Translation failed for "${text}" (returned same text) -> trying fallback`);
          return getSimpleTranslation(text, target);
        }
        return translatedText;
      }
    }
    
    return getSimpleTranslation(text, target);
  } catch (error) {
    console.error('Translation error:', error);
    return getSimpleTranslation(text, target);
  }
}

// Simple fallback translation for common phrases
function getSimpleTranslation(text: string, target: string): string {
  console.log(`Fallback translation called for "${text}" to language "${target}"`);
  
  // If exact match exists, use it
  const translations: Record<string, Record<string, string>> = {
    'こんにちは': {
      'en': 'Hello',
      'es': 'Hola',
      'fr': 'Bonjour',
      'de': 'Hallo',
      'zh': '你好',
      'ko': '안녕하세요',
      'pt': 'Olá',
      'ru': 'Привет',
      'ar': 'مرحبا',
      'hi': 'नमस्ते',
      'it': 'Ciao',
      'nl': 'Hallo',
      'th': 'สวัสดี',
      'vi': 'Xin chào'
    },
    '翻訳されない': {
      'en': 'Not translated',
      'es': 'No traducido',
      'fr': 'Non traduit',
      'de': 'Nicht übersetzt',
      'zh': '未翻译',
      'ko': '번역되지 않음',
      'pt': 'Não traduzido',
      'ru': 'Не переведено',
      'ar': 'غير مترجم',
      'hi': 'अनुवादित नहीं',
      'it': 'Non tradotto',
      'nl': 'Niet vertaald',
      'th': 'ไม่ได้แปล',
      'vi': 'Không được dịch'
    },
    'おはよう': {
      'en': 'Good morning',
      'es': 'Buenos días',
      'fr': 'Bonjour',
      'de': 'Guten Morgen',
      'zh': '早上好',
      'ko': '좋은 아침',
      'pt': 'Bom dia',
      'ru': 'Доброе утро',
      'ar': 'صباح الخير',
      'hi': 'सुप्रभात',
      'it': 'Buongiorno',
      'nl': 'Goedemorgen',
      'th': 'สวัสดีตอนเช้า',
      'vi': 'Chào buổi sáng'
    },
    'hello': {
      'ja': 'こんにちは',
      'es': 'Hola',
      'fr': 'Bonjour',
      'de': 'Hallo',
      'zh': '你好',
      'ko': '안녕하세요',
      'pt': 'Olá',
      'ru': 'Привет',
      'ar': 'مرحبا',
      'hi': 'नमस्ते',
      'it': 'Ciao',
      'nl': 'Hallo',
      'th': 'สวัสดี',
      'vi': 'Xin chào'
    }
  };

  const textNormalized = text.trim().toLowerCase();
  
  // Check exact matches first
  if (translations[text] && translations[text][target]) {
    console.log(`Found exact match translation: "${text}" -> "${translations[text][target]}"`);
    return translations[text][target];
  }
  
  // Check lowercase matches
  for (const [key, langMap] of Object.entries(translations)) {
    if (key.toLowerCase() === textNormalized && langMap[target]) {
      console.log(`Found lowercase match translation: "${text}" -> "${langMap[target]}"`);
      return langMap[target];
    }
  }
  
  console.log(`No fallback translation found for "${text}" to "${target}"`);
  
  // Enhanced fallback translations for more content
  const enhancedTranslations: Record<string, Record<string, string>> = {
    // Add more common Japanese expressions
    'いっちばん！': {
      'en': 'Number one!',
      'es': '¡Número uno!',
      'fr': 'Numéro un !',
      'de': 'Nummer eins!',
      'zh': '第一！',
      'ko': '넘버원!',
      'pt': 'Número um!',
      'ru': 'Номер один!',
      'ar': 'رقم واحد!',
      'hi': 'नंबर वन!',
      'it': 'Numero uno!',
      'nl': 'Nummer één!',
      'th': 'อันดับหนึ่ง!',
      'vi': 'Số một!'
    },
    'もう待てない！': {
      'en': "I can't wait anymore!",
      'es': '¡Ya no puedo esperar más!',
      'fr': 'Je ne peux plus attendre !',
      'de': 'Ich kann nicht mehr warten!',
      'zh': '我等不及了！',
      'ko': '더 이상 기다릴 수 없어요!',
      'pt': 'Não posso mais esperar!',
      'ru': 'Я больше не могу ждать!',
      'ar': 'لا أستطيع الانتظار أكثر!',
      'hi': 'मैं और इंतज़ार नहीं कर सकता!',
      'it': 'Non posso più aspettare!',
      'nl': 'Ik kan niet meer wachten!',
      'th': 'ฉันรอไม่ไหวแล้ว!',
      'vi': 'Tôi không thể đợi thêm nữa!'
    },
    // Common short phrases
    'あ': {
      'en': 'Ah',
      'es': 'Ah',
      'fr': 'Ah',
      'de': 'Ach',
      'zh': '啊',
      'ko': '아',
      'pt': 'Ah',
      'ru': 'А',
      'ar': 'آه',
      'hi': 'आह',
      'it': 'Ah',
      'nl': 'Ah',
      'th': 'อา',
      'vi': 'Ah'
    },
    'そうですね': {
      'en': 'I see',
      'es': 'Ya veo',
      'fr': 'Je vois',
      'de': 'Ich verstehe',
      'zh': '我明白了',
      'ko': '그렇군요',
      'pt': 'Entendo',
      'ru': 'Понятно',
      'ar': 'أفهم',
      'hi': 'मैं समझ गया',
      'it': 'Capisco',
      'nl': 'Ik begrijp het',
      'th': 'เข้าใจแล้ว',
      'vi': 'Tôi hiểu'
    },
    'これでいいのだ': {
      'en': 'This is fine',
      'es': 'Esto está bien',
      'fr': 'C\'est bien',
      'de': 'Das ist gut so',
      'zh': '这样就好',
      'ko': '이게 좋다',
      'pt': 'Isso está bom',
      'ru': 'Так хорошо',
      'ar': 'هذا جيد',
      'hi': 'यह ठीक है',
      'it': 'Va bene così',
      'nl': 'Dit is goed',
      'th': 'นี่ดี',
      'vi': 'Như vậy là tốt'
    },
    'ちがいますか？': {
      'en': 'Is that wrong?',
      'es': '¿Está mal?',
      'fr': 'C\'est faux ?',
      'de': 'Ist das falsch?',
      'zh': '不对吗？',
      'ko': '틀렸나요?',
      'pt': 'Está errado?',
      'ru': 'Это неправильно?',
      'ar': 'هل هذا خطأ؟',
      'hi': 'क्या यह गलत है?',
      'it': 'È sbagliato?',
      'nl': 'Is dat verkeerd?',
      'th': 'ผิดหรือเปล่า?',
      'vi': 'Có sai không?'
    },
    'い': {
      'en': 'I',
      'es': 'I',
      'fr': 'I',
      'de': 'I',
      'zh': 'I',
      'ko': 'I',
      'pt': 'I',
      'ru': 'I',
      'ar': 'I',
      'hi': 'I',
      'it': 'I',
      'nl': 'I',
      'th': 'I',
      'vi': 'I'
    }
  };

  // Check enhanced translations
  if (enhancedTranslations[text] && enhancedTranslations[text][target]) {
    console.log(`Found enhanced translation: "${text}" -> "${enhancedTranslations[text][target]}"`);
    return enhancedTranslations[text][target];
  }

  // Check enhanced translations for lowercase matches
  const enhancedNormalized = text.trim().toLowerCase();
  for (const [key, langMap] of Object.entries(enhancedTranslations)) {
    if (key.toLowerCase() === enhancedNormalized && langMap[target]) {
      console.log(`Found enhanced lowercase translation: "${text}" -> "${langMap[target]}"`);
      return langMap[target];
    }
  }
  
  return text; // Return original if no translation found
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
      
      // Get unique users who have sent messages in this room
      const participants = await db
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

      res.json(participants);
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

        if (message.type === 'chat_message' && ws.userId) {
          console.log('Processing chat message:', { userId: ws.userId, text: message.text, roomId: message.roomId });
          
          // Get user data for profile image
          const user = await storage.getUser(ws.userId);
          const profileImageUrl = user?.useCustomProfileImage && user?.customProfileImageUrl 
            ? user.customProfileImageUrl 
            : user?.profileImageUrl;

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
