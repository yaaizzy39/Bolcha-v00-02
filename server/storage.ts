import {
  users,
  messages,
  chatRooms,
  type User,
  type UpsertUser,
  type Message,
  type InsertMessage,
  type ChatRoom,
  type InsertChatRoom,
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

  async getMessages(roomId: number, limit: number = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.timestamp))
      .limit(limit);
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
}

export const storage = new DatabaseStorage();
