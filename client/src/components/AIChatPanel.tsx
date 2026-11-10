import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ApiRequestError,
  AIChatMessage,
  sendAIMessage,
} from '../services/api';
import { useRouter } from 'expo-router';

export type AIChatItem = AIChatMessage & {
  id: string;
  requiresSignIn?: boolean;
};

export type AIChatSession = {
  messages: AIChatItem[];
  setMessages: React.Dispatch<React.SetStateAction<AIChatItem[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const createMessageId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
export const initialAIChatMessage: AIChatItem = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Xin chào! Tôi là SKYHAVEN AI ✈️\n\nTôi có thể giúp bạn tìm chuyến bay, so sánh giá vé, tư vấn hành trình và giải đáp thắc mắc về đặt vé.',
};

const suggestions = [
  'Tìm chuyến bay từ SGN đến HAN',
  'Tư vấn chuyến du lịch 3 ngày',
  'Làm sao để chọn chuyến bay giá rẻ?',
];

type AIChatPanelProps = {
  onMinimize?: () => void;
  onClose?: () => void;
  onResetSession?: () => void;
  session?: AIChatSession;
};

export default function AIChatPanel({
  onMinimize,
  onClose,
  onResetSession,
  session,
}: AIChatPanelProps) {
  const router = useRouter();
  const [localMessages, setLocalMessages] = useState<AIChatItem[]>([
    initialAIChatMessage,
  ]);
  const [localInput, setLocalInput] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const messages = session?.messages ?? localMessages;
  const setMessages = session?.setMessages ?? setLocalMessages;
  const input = session?.input ?? localInput;
  const setInput = session?.setInput ?? setLocalInput;
  const loading = session?.loading ?? localLoading;
  const setLoading = session?.setLoading ?? setLocalLoading;

  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);


const sendMessage = async (text?: string) => {
  const message = (text ?? input).trim();

  if (!message || loading) return;

  if (message.length > 2000) return;

  const userMessage: AIChatItem = {
    id: createMessageId(),
    role: 'user',
    content: message,
  };

  const previousHistory: AIChatMessage[] = messages
    .filter((item) => item.id !== 'welcome')
    .slice(-10)
    .map(({ role, content }) => ({ role, content }));

  setMessages((current) => [...current, userMessage]);
  setInput('');
  setLoading(true);

  try {
    const result = await sendAIMessage(
      message,
      previousHistory,
    );

    if (!result || typeof result.reply !== 'string') {
      throw new Error('Phản hồi từ AI không hợp lệ.');
    }

    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: 'assistant',
        content: result.reply,
      },
    ]);
  } catch (error) {
    const requiresSignIn =
      (error instanceof ApiRequestError && error.status === 401) ||
      (error instanceof Error &&
        error.message === 'Bạn cần đăng nhập để tiếp tục.');

    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: 'assistant',
        content:
          requiresSignIn
            ? 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để tiếp tục trò chuyện.'
            : 'Xin lỗi, hiện tại SKYHAVEN AI chưa thể xử lý yêu cầu. Vui lòng kiểm tra kết nối và thử lại sau.',
        ...(requiresSignIn ? { requiresSignIn: true } : {}),
      },
    ]);
  } finally {
    setLoading(false);
  }
};


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={
        onMinimize ? 0 : Platform.OS === 'ios' ? 90 : 0
      }
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarIcon}>✦</Text>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            SKYHAVEN AI
          </Text>
          <Text style={styles.headerSubtitle}>
            Trợ lý đặt vé máy bay thông minh
          </Text>
        </View>

        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>AI</Text>
        </View>

        {(onMinimize || onClose) && (
          <View style={styles.headerActions}>
            {onMinimize && (
              <Pressable
                onPress={onMinimize}
                accessibilityRole="button"
                accessibilityLabel="Thu nhỏ cửa sổ chat"
                hitSlop={8}
                style={styles.headerAction}
              >
                <Text style={styles.headerActionText}>−</Text>
              </Pressable>
            )}
            {onClose && (
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Đóng cửa sổ chat"
                hitSlop={8}
                style={styles.headerAction}
              >
                <Text style={styles.headerActionText}>×</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        <View style={styles.dateLabel}>
          <Text style={styles.dateText}>
            SKYHAVEN VIRTUAL ASSISTANT
          </Text>
        </View>

        {messages.map((item) => {
          const isUser = item.role === 'user';

          return (
            <View
              key={item.id}
              style={[
                styles.messageRow,
                isUser && styles.userMessageRow,
              ]}
            >
              {!isUser && (
                <View style={styles.smallAvatar}>
                  <Text style={styles.smallAvatarText}>✦</Text>
                </View>
              )}

              <View
                style={[
                  styles.messageBubble,
                  isUser
                    ? styles.userBubble
                    : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    isUser && styles.userMessageText,
                  ]}
                >
                  {item.content}
                </Text>
                {item.requiresSignIn && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Đăng nhập lại"
                    style={styles.signInButton}
                    onPress={() => {
                      onResetSession?.();
                      if (!onResetSession) {
                        onClose?.();
                      }
                      router.push('/login');
                    }}
                  >
                    <Text style={styles.signInButtonText}>Đăng nhập lại</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={styles.loadingRow}>
            <View style={styles.smallAvatar}>
              <Text style={styles.smallAvatarText}>✦</Text>
            </View>

            <View style={styles.loadingBubble}>
              <ActivityIndicator
                size="small"
                color="#2878B9"
              />
              <Text style={styles.loadingText}>
                SKYHAVEN AI đang trả lời...
              </Text>
            </View>
          </View>
        )}

        {messages.length === 1 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionTitle}>
              Bạn có thể hỏi tôi:
            </Text>

            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                style={styles.suggestionButton}
                onPress={() => sendMessage(suggestion)}
              >
                <Text style={styles.suggestionText}>
                  {suggestion}
                </Text>
                <Text style={styles.suggestionArrow}>→</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Nhập câu hỏi của bạn..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
          multiline
          maxLength={2000}
          editable={!loading}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
blurOnSubmit={false}
        />

        <Pressable
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={[
            styles.sendButton,
            (!input.trim() || loading) &&
              styles.sendButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Gửi tin nhắn"
        >
          <Text style={styles.sendIcon}>➤</Text>
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>
        AI có thể mắc lỗi. Vui lòng kiểm tra thông tin chuyến bay
        trước khi đặt vé.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#123B5D',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2878B9',
    borderWidth: 1,
    borderColor: '#D6A84F',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarIcon: {
    color: '#FFFFFF',
    fontSize: 25,
  },

  headerText: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 1,
  },

  headerSubtitle: {
    color: '#D7E6F2',
    fontSize: 11,
    marginTop: 4,
  },

  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 5,
  },

  onlineText: {
    color: '#123B5D',
    fontWeight: '800',
    fontSize: 10,
  },

  headerActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },

  headerAction: {
    width: 30,
    height: 30,
    marginLeft: 4,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  headerActionText: {
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },

  chatArea: {
    flex: 1,
  },

  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },

  dateLabel: {
    alignItems: 'center',
    marginBottom: 22,
  },

  dateText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 15,
  },

  userMessageRow: {
    justifyContent: 'flex-end',
  },

  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#123B5D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  smallAvatarText: {
    color: '#D6A84F',
    fontSize: 17,
  },

  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },

  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  userBubble: {
    backgroundColor: '#123B5D',
    borderBottomRightRadius: 4,
  },

  messageText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
  },

  signInButton: {
    alignSelf: 'flex-start',
    marginTop: 9,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#123B5D',
  },

  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  userMessageText: {
    color: '#FFFFFF',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
  },

  loadingText: {
    color: '#64748B',
    fontSize: 12,
    marginLeft: 8,
  },

  suggestions: {
    marginTop: 10,
    marginLeft: 36,
  },

  suggestionTitle: {
    color: '#123B5D',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 10,
  },

  suggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7F0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },

  suggestionText: {
    color: '#2878B9',
    fontSize: 12,
    flex: 1,
  },

  suggestionArrow: {
    color: '#D6A84F',
    fontWeight: '800',
    marginLeft: 8,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#1E293B',
    fontSize: 14,
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#123B5D',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 9,
  },

  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },

  sendIcon: {
    color: '#FFFFFF',
    fontSize: 21,
  },

  disclaimer: {
    backgroundColor: '#FFFFFF',
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
    paddingBottom: 8,
    paddingHorizontal: 10,
  },
});