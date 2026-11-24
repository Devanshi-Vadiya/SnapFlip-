import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { API_URL } from "../api/api";
import { getAuthToken } from "../api/authStorage";
import BottomNavBar from "../components/BottomNavBar";

type Conversation = {
  userId: string;
  username: string;
  avatarUrl?: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
};

type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  isMe: boolean;
  text: string;
  isSnap: boolean;
  opened: boolean;
  createdAt: string;
};

export default function ChatScreen() {
  const params = useLocalSearchParams<{ recipientId?: string; username?: string }>();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Active dialogue state
  const [activeRecipient, setActiveRecipient] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);

  // If navigated with recipient params
  useEffect(() => {
    if (params.recipientId && params.username) {
      setActiveRecipient({
        id: params.recipientId,
        username: params.username,
      });
      loadMessages(params.recipientId);
    }
  }, [params.recipientId, params.username]);

  // Load conversations list
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setConversations(data);
      }
    } catch (err) {
      console.error("Conversations error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/chat/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err) {
      console.error("Load messages error:", err);
    }
  };

  const sendMessage = async () => {
    if (!activeRecipient || !inputMessage.trim() || sending) return;

    const token = await getAuthToken();
    if (!token) return;

    const textToSend = inputMessage.trim();
    setInputMessage("");

    // Optimistic message
    const tempId = Date.now().toString();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      senderId: "me",
      recipientId: activeRecipient.id,
      isMe: true,
      text: textToSend,
      isSnap: false,
      opened: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      setSending(true);
      const res = await fetch(`${API_URL}/api/chat/${activeRecipient.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: textToSend }),
      });

      const data = await res.json();
      if (res.ok && data.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.data : m))
        );
        fetchConversations();
      }
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity
          style={styles.newChatBtn}
          onPress={() => router.push("/discover" as any)}
        >
          <Text style={styles.newChatText}>+ New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* CONVERSATIONS LIST */}
      {loading ? (
        <ActivityIndicator size="large" color="#FFFC00" style={{ marginTop: 40 }} />
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptySubtext}>
            Connect with creators on SnapFlip to start exchanging snaps and chats.
          </Text>
          <TouchableOpacity
            style={styles.discoverBtn}
            onPress={() => router.push("/discover" as any)}
          >
            <Text style={styles.discoverBtnText}>Find Creators 🔍</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.userId}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item: c }) => (
            <TouchableOpacity
              style={styles.conversationRow}
              activeOpacity={0.8}
              onPress={() => {
                setActiveRecipient({ id: c.userId, username: c.username });
                loadMessages(c.userId);
              }}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {c.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.conversationInfo}>
                <Text style={styles.usernameText}>@{c.username}</Text>
                <Text
                  style={[
                    styles.lastMessageText,
                    c.unread && { color: "#FFFC00", fontWeight: "bold" },
                  ]}
                  numberOfLines={1}
                >
                  {c.lastMessage}
                </Text>
              </View>
              {c.unread && <View style={styles.unreadBadge} />}
            </TouchableOpacity>
          )}
        />
      )}

      {/* 1-ON-1 ACTIVE CHAT MODAL */}
      <Modal
        visible={Boolean(activeRecipient)}
        animationType="slide"
        onRequestClose={() => setActiveRecipient(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.chatModalContainer}
        >
          {/* DIALOGUE HEADER */}
          <View style={styles.chatHeader}>
            <TouchableOpacity
              onPress={() => {
                setActiveRecipient(null);
                fetchConversations();
              }}
              style={styles.backBtn}
            >
              <Text style={styles.backBtnText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.chatRecipientTitle}>
              @{activeRecipient?.username}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* MESSAGES LIST */}
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id || (m as any)._id}
            contentContainerStyle={styles.messagesContent}
            renderItem={({ item: m }) => (
              <View
                style={[
                  styles.messageBubble,
                  m.isMe ? styles.myBubble : styles.theirBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    m.isMe ? styles.myMessageText : styles.theirMessageText,
                  ]}
                >
                  {m.text}
                </Text>
              </View>
            )}
          />

          {/* MESSAGE INPUT BAR */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.messageInput}
              placeholder={`Message @${activeRecipient?.username}...`}
              placeholderTextColor="#888"
              value={inputMessage}
              onChangeText={setInputMessage}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !inputMessage.trim() && { opacity: 0.5 },
              ]}
              onPress={sendMessage}
              disabled={!inputMessage.trim() || sending}
            >
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <BottomNavBar activeRoute="chat" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B10",
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#11131A",
    borderBottomWidth: 1,
    borderBottomColor: "#1D202A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  newChatBtn: {
    backgroundColor: "#1F2332",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#30374E",
  },
  newChatText: {
    color: "#FFFC00",
    fontWeight: "bold",
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  emptySubtext: {
    color: "#888888",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  discoverBtn: {
    backgroundColor: "#FFFC00",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 25,
  },
  discoverBtnText: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 15,
  },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141722",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFC00",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 20,
  },
  conversationInfo: {
    flex: 1,
  },
  usernameText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  lastMessageText: {
    color: "#888888",
    fontSize: 14,
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFC00",
  },
  chatModalContainer: {
    flex: 1,
    backgroundColor: "#0A0B10",
  },
  chatHeader: {
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 14,
    backgroundColor: "#11131A",
    borderBottomWidth: 1,
    borderBottomColor: "#1D202A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    padding: 6,
  },
  backBtnText: {
    color: "#FFFC00",
    fontSize: 17,
    fontWeight: "bold",
  },
  chatRecipientTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 8,
  },
  myBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFC00",
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#1E2230",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
  },
  myMessageText: {
    color: "#000000",
    fontWeight: "500",
  },
  theirMessageText: {
    color: "#FFFFFF",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#11131A",
    borderTopWidth: 1,
    borderTopColor: "#1D202A",
    gap: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: "#1A1D27",
    color: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: "#FFFC00",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendBtnText: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 14,
  },
});
