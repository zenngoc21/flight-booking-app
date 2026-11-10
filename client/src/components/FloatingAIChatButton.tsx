import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { usePathname } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import AIChatPanel, {
  AIChatItem,
  AIChatSession,
  initialAIChatMessage,
} from './AIChatPanel';

export default function FloatingAIChatButton() {
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(true);
  const [messages, setMessages] = useState<AIChatItem[]>([
    initialAIChatMessage,
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pathname !== '/') {
      return;
    }

    const timeout = setTimeout(() => setIsTooltipVisible(false), 10_000);
    return () => clearTimeout(timeout);
  }, [pathname]);

  const isHidden =
    pathname === '/ai-assistant' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/booking/payment';

  const closeChat = () => setIsOpen(false);
  const resetChatSession = () => {
    setMessages([initialAIChatMessage]);
    setInput('');
    setLoading(false);
    setIsOpen(false);
  };
  const chatWidth = Math.max(0, Math.min(width - 28, 430));
  const chatHeight = Math.max(0, Math.min(height * 0.78, 700));
  const chatSession: AIChatSession = {
    messages,
    setMessages,
    input,
    setInput,
    loading,
    setLoading,
  };

  return (
    <>
      {!isHidden && (
        <View pointerEvents="box-none" style={styles.container}>
          <Pressable
            onPress={() => {
              setIsTooltipVisible(false);
              setIsOpen((open) => !open);
            }}
            accessibilityRole="button"
            accessibilityLabel={isOpen ? 'Thu nhỏ trợ lý AI' : 'Mở trợ lý AI'}
            accessibilityState={{ expanded: isOpen }}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
          >
            <View pointerEvents="none" style={styles.buttonFace}>
              <Svg width={27} height={27} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.5A7.5 7.5 0 1 1 20 11.5Z"
                  stroke="#FFFFFF"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M8 11.5h.01M12 11.5h.01M16 11.5h.01"
                  stroke="#FFFFFF"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
              </Svg>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>AI</Text>
              </View>
            </View>
          </Pressable>

          {pathname === '/' && isTooltipVisible && !isOpen && (
            <View pointerEvents="none" style={styles.tooltip}>
              <Text style={styles.tooltipTitle}>SKYHAVEN AI</Text>
              <Text style={styles.tooltipSubtitle}>
                Tôi có thể giúp gì cho bạn?
              </Text>
            </View>
          )}
        </View>
      )}

      <Modal
        visible={isOpen && !isHidden}
        transparent
        animationType="fade"
        onRequestClose={closeChat}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng cửa sổ chat"
            style={styles.scrim}
            onPress={closeChat}
          />
          <View
            style={[
              styles.chatWindow,
              { width: chatWidth, height: chatHeight },
            ]}
          >
            <AIChatPanel
              onMinimize={closeChat}
              onClose={closeChat}
              onResetSession={resetChatSession}
              session={chatSession}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    alignItems: 'flex-end',
    zIndex: 9999,
    elevation: 9999,
  },

  button: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#123B5D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D6A84F',
    overflow: 'visible',
    elevation: 12,
    shadowColor: '#123B5D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },

  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },

  buttonFace: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#123B5D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: '#D6A84F',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    fontSize: 9,
    color: '#123B5D',
    fontWeight: '900',
  },

  tooltip: {
    position: 'absolute',
    right: 0,
    bottom: 74,
    width: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 13,
    elevation: 5,
    shadowColor: '#123B5D',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  tooltipTitle: {
    color: '#123B5D',
    fontWeight: '800',
    fontSize: 12,
  },

  tooltipSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
  },

  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 24,
  },

  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(9, 28, 44, 0.35)',
  },

  chatWindow: {
    maxWidth: '100%',
    borderRadius: 22,
    backgroundColor: '#F7FAFC',
    overflow: 'hidden',
    elevation: 18,
    shadowColor: '#102F4A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
  },
});
