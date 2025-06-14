import {
  users,
  messages,
  chatRooms,
  messageLikes,
  type User,
  type UpsertUser,
  type Message,
  type InsertMessage,
  type ChatRoom,
  type InsertChatRoom,
  type MessageLike,
  type InsertMessageLike,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lt, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSettings(id: string, settings: Partial<User>): Promise<User>;
  updateUserProfileImage(id: string, customImageUrl: string, useCustom: boolean): Promise<User>;
  
  // Chat room operations
  getChatRooms(): Promise<ChatRoom[]>;
  getChatRoom(id: number): Promise<ChatRoom | undefined>;
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  deleteChatRoom(id: number, userId: string): Promise<boolean>;
  updateRoomActivity(id: number): Promise<void>;
  cleanupInactiveRooms(): Promise<number>;
  
  // Message operations
  getMessages(roomId: number, limit?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(messageId: number, userId: string): Promise<boolean>;
  
  // Like operations
  toggleMessageLike(messageId: number, userId: string): Promise<{ liked: boolean; totalLikes: number }>;
  getMessageLikes(messageId: number): Promise<MessageLike[]>;
  getUserLikes(userId: string): Promise<number[]>; // Returns array of liked message IDs
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserSettings(id: string, settings: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Chat room operations
  async getChatRooms(): Promise<ChatRoom[]> {
    return await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.isActive, true))
      .orderBy(desc(chatRooms.lastActivity));
  }

  async getChatRoom(id: number): Promise<ChatRoom | undefined> {
    const [room] = await db
      .select()
      .from(chatRooms)
      .where(and(eq(chatRooms.id, id), eq(chatRooms.isActive, true)));
    return room;
  }

  async createChatRoom(roomData: InsertChatRoom): Promise<ChatRoom> {
    const [room] = await db.insert(chatRooms).values(roomData).returning();
    return room;
  }

  async deleteChatRoom(id: number, userId: string): Promise<boolean> {
    const [room] = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.id, id));

    if (!room || room.createdBy !== userId) {
      return false;
    }

    await db
      .update(chatRooms)
      .set({ isActive: false })
      .where(eq(chatRooms.id, id));

    return true;
  }

  async updateRoomActivity(id: number): Promise<void> {
    await db
      .update(chatRooms)
      .set({ lastActivity: new Date() })
      .where(eq(chatRooms.id, id));
  }

  async cleanupInactiveRooms(): Promise<number> {
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    
    const result = await db
      .update(chatRooms)
      .set({ isActive: false })
      .where(and(
        eq(chatRooms.isActive, true),
        lt(chatRooms.lastActivity, cutoffTime)
      ))
      .returning({ id: chatRooms.id });

    return result.length;
  }

  async getMessages(roomId: number, limit: number = 200): Promise<Message[]> {
    const result = await db
      .select({
        id: messages.id,
        roomId: messages.roomId,
        senderId: messages.senderId,
        originalText: messages.originalText,
        timestamp: messages.timestamp,
        mentions: messages.mentions,
        // Include sender information
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
        senderEmail: users.email,
        senderProfileImageUrl: users.profileImageUrl,
        senderUseCustomProfileImage: users.useCustomProfileImage,
        senderCustomProfileImageUrl: users.customProfileImageUrl,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.timestamp))
      .limit(limit);

    return result as any[];
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    
    // Update room activity
    if (messageData.roomId) {
      await this.updateRoomActivity(messageData.roomId);
    }
    
    return message;
  }

  async deleteMessage(messageId: number, userId: string): Promise<boolean> {
    // Check if user is admin
    const user = await this.getUser(userId);
    const isAdmin = user?.isAdmin || false;
    
    let result;
    if (isAdmin) {
      // Admin can delete any message
      result = await db
        .delete(messages)
        .where(eq(messages.id, messageId));
    } else {
      // Regular users can only delete their own messages
      result = await db
        .delete(messages)
        .where(and(
          eq(messages.id, messageId),
          eq(messages.senderId, userId)
        ));
    }
    
    return result.rowCount > 0;
  }

  async updateUserProfileImage(id: string, customImageUrl: string, useCustom: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        customProfileImageUrl: customImageUrl,
        useCustomProfileImage: useCustom,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async toggleMessageLike(messageId: number, userId: string): Promise<{ liked: boolean; totalLikes: number }> {
    try {
      // Check if user has already liked this message
      const existingLike = await db
        .select()
        .from(messageLikes)
        .where(and(eq(messageLikes.messageId, messageId), eq(messageLikes.userId, userId)));

      let liked: boolean;

      if (existingLike.length > 0) {
        // Unlike: remove the like
        await db
          .delete(messageLikes)
          .where(and(eq(messageLikes.messageId, messageId), eq(messageLikes.userId, userId)));
        liked = false;
      } else {
        // Like: add the like
        try {
          await db
            .insert(messageLikes)
            .values({ messageId, userId });
          liked = true;
        } catch (error: any) {
          // Handle duplicate key error - user might have already liked
          if (error.code === '23505') {
            // Like already exists, treat as already liked
            liked = true;
          } else {
            throw error;
          }
        }
      }

      // Get total likes count for this message
      const totalLikesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(messageLikes)
        .where(eq(messageLikes.messageId, messageId));
      
      const totalLikes = totalLikesResult[0]?.count ?? 0;

      return { liked, totalLikes };
    } catch (error) {
      console.error('Error in toggleMessageLike:', error);
      throw error;
    }
  }

  async getMessageLikes(messageId: number): Promise<MessageLike[]> {
    return await db
      .select()
      .from(messageLikes)
      .where(eq(messageLikes.messageId, messageId));
  }

  async getUserLikes(userId: string): Promise<number[]> {
    const likes = await db
      .select({ messageId: messageLikes.messageId })
      .from(messageLikes)
      .where(eq(messageLikes.userId, userId));
    
    return likes.map(like => like.messageId);
  }
}

export const storage = new DatabaseStorage();
