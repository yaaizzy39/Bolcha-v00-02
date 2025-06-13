import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, AtSign } from 'lucide-react';
import { getCurrentProfileImage, getDisplayName } from '@/lib/profileUtils';
import { useQuery } from '@tanstack/react-query';
import type { Message } from '@shared/schema';

interface Participant {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl: string | null;
  useCustomProfileImage: boolean | null;
  customProfileImageUrl: string | null;
}

interface MentionInputProps {
  onSendMessage: (text: string, mentions?: string[]) => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  roomId: number;
}

export interface MentionInputRef {
  focus: () => void;
}

export const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(
  function MentionInput({ onSendMessage, replyingTo, onCancelReply, roomId }, ref) {
  const [message, setMessage] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose focus method to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }));

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // Fetch room participants
  const { data: participants = [] } = useQuery({
    queryKey: ['/api/rooms', roomId, 'participants'],
    queryFn: () => fetch(`/api/rooms/${roomId}/participants`, { credentials: 'include' }).then(res => res.json()),
    enabled: !!roomId,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    
    setMessage(value);
    setCursorPosition(position);

    // Check if user is typing @mention
    const beforeCursor = value.substring(0, position);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.substring(lastAtIndex + 1);
      // Show participants if @ is at word boundary and no space after @
      if ((lastAtIndex === 0 || /\s/.test(beforeCursor[lastAtIndex - 1])) && !afterAt.includes(' ')) {
        setMentionStart(lastAtIndex);
        setShowParticipants(true);
      } else {
        setShowParticipants(false);
        setMentionStart(-1);
      }
    } else {
      setShowParticipants(false);
      setMentionStart(-1);
    }
  };

  const handleParticipantSelect = (participant: Participant) => {
    if (mentionStart === -1) return;

    const displayName = getDisplayName(participant);
    const beforeMention = message.substring(0, mentionStart);
    const afterCursor = message.substring(cursorPosition);
    const newMessage = `${beforeMention}@${displayName} ${afterCursor}`;
    
    setMessage(newMessage);
    setShowParticipants(false);
    setMentionStart(-1);
    
    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPosition = mentionStart + displayName.length + 2; // +2 for @ and space
      textareaRef.current?.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const extractMentions = (text: string): string[] => {
    const mentionPattern = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionPattern.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      const mentions = extractMentions(message);
      onSendMessage(message.trim(), mentions);
      setMessage('');
      setShowParticipants(false);
      setMentionStart(-1);
      // Reset textarea height
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setShowParticipants(false);
      setMentionStart(-1);
    }
  };

  // Filter participants based on what user is typing after @
  const filterQuery = mentionStart !== -1 ? message.substring(mentionStart + 1, cursorPosition).toLowerCase() : '';
  const filteredParticipants = participants.filter((p: Participant) => {
    const displayName = getDisplayName(p).toLowerCase();
    return displayName.includes(filterQuery);
  });

  return (
    <div className="relative">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-muted border-l-4 border-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">返信先:</span>
              <span className="font-medium">{replyingTo.senderName}</span>
              <span className="text-muted-foreground truncate max-w-xs">
                {replyingTo.originalText}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Participants dropdown */}
      {showParticipants && filteredParticipants.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <AtSign className="w-3 h-3" />
              参加者をメンション
            </div>
            {filteredParticipants.map((participant: Participant) => (
              <button
                key={participant.id}
                onClick={() => handleParticipantSelect(participant)}
                className="w-full flex items-center gap-2 p-2 hover:bg-muted rounded text-left"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage 
                    src={getCurrentProfileImage(participant)} 
                    alt={getDisplayName(participant)}
                  />
                  <AvatarFallback className="text-xs">
                    {getDisplayName(participant).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{getDisplayName(participant)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message input form */}
      <form onSubmit={handleSubmit} className="flex gap-2 p-3 sm:p-4 border-t bg-background">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力... (@でメンション)"
          className="flex-1 min-h-[44px] sm:min-h-[40px] max-h-48 resize-none overflow-hidden text-base sm:text-sm"
          rows={1}
        />
        <Button 
          type="submit" 
          disabled={!message.trim()} 
          size="sm"
          className="min-w-[44px] h-[44px] sm:min-w-[36px] sm:h-[36px] flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
  }
);