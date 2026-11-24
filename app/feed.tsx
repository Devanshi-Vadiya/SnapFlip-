import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { router } from "expo-router";
import { API_URL } from "../api/api";
import { getAuthToken } from "../api/authStorage";

type Post = {
  id: string;
  username: string;
  image: string;
  caption: string;
  likes: number;
  isLikedByMe?: boolean;
  avatarUrl?: string;
  createdAt?: string;
};

type CommentItem = {
  id: string;
  username: string;
  text: string;
  createdAt: string;
  userId?: string;
};

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [likedPosts, setLikedPosts] = useState<string[]>([]);

  const [likeCounts, setLikeCounts] = useState<
    Record<string, number>
  >({});

  const lastTap = useRef<Record<string, number>>({});

  const [showHeart, setShowHeart] = useState<string | null>(null);

  const heartScale = useRef(
    new Animated.Value(0)
  ).current;

  const heartOpacity = useRef(
    new Animated.Value(0)
  ).current;

  const [imageRatios, setImageRatios] = useState<
    Record<string, number>
  >({});

  // Comments state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const openComments = async (post: Post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
    setLoadingComments(true);
    try {
      const response = await fetch(`${API_URL}/api/comments/${post.id}`);
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setComments(data);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!selectedPost || !newCommentText.trim() || submittingComment) return;

    const token = await getAuthToken();
    if (!token) {
      alert("Please log in to comment");
      return;
    }

    try {
      setSubmittingComment(true);
      const response = await fetch(`${API_URL}/api/comments/${selectedPost.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: newCommentText.trim() }),
      });

      const data = await response.json();
      if (response.ok && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setNewCommentText("");
      } else {
        alert(data.message || "Failed to post comment");
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
      alert("Network error posting comment");
    } finally {
      setSubmittingComment(false);
    }
  };
  // =========================
  // FETCH REAL PHOTOS
  // =========================

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError("");

      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/photos`, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load feed"
        );
      }

      const formattedPosts: Post[] = data.map((photo: any) => ({
        id: photo._id || photo.id,
        username: photo.username,
        image: photo.imageUrl,
        caption: photo.caption || "",
        likes: typeof photo.likes === "number" ? photo.likes : 0,
        isLikedByMe: Boolean(photo.isLikedByMe),
        avatarUrl: photo.avatarUrl || "",
        createdAt: photo.createdAt,
      }));

      setPosts(formattedPosts);

      const initialLiked = formattedPosts
        .filter((p) => p.isLikedByMe)
        .map((p) => p.id);
      setLikedPosts(initialLiked);

      formattedPosts.forEach((post) => {
        Image.getSize(
          post.image,
          (width, height) => {
            setImageRatios((prev) => ({
              ...prev,
              [post.id]: height / width,
            }));
          },
          (error) => {
            console.log("Image size error:", error);
          }
        );
      });
      const initialLikes: Record<string, number> = {};

      formattedPosts.forEach((post) => {
        initialLikes[post.id] = post.likes;
      });

      setLikeCounts(initialLikes);
    } catch (error) {
      console.log("Feed error:", error);

      setError(
        "Could not load feed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // =========================
  // SWIPE RIGHT → CAMERA
  // =========================

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) >
          Math.abs(gestureState.dy)
        );
      },

      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 80) {
          router.push("/camera");
        }
      },
    })
  ).current;

  // =========================
  // LIKE / UNLIKE POST
  // =========================
  const likePost = async (postId: string) => {
    const token = await getAuthToken();
    if (!token) {
      alert("Please log in to like snaps");
      router.push("/login");
      return;
    }

    const wasLiked = likedPosts.includes(postId);
    const currentCount = likeCounts[postId] || 0;

    // Optimistic toggle
    setLikedPosts((prev) =>
      wasLiked ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
    setLikeCounts((prev) => ({
      ...prev,
      [postId]: wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));

    try {
      const response = await fetch(
        `${API_URL}/api/photos/${postId}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update like");
      }

      // Synchronize with server truth
      setLikeCounts((prev) => ({
        ...prev,
        [postId]: typeof data.likes === "number" ? data.likes : currentCount,
      }));

      if (data.isLiked) {
        setLikedPosts((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
      } else {
        setLikedPosts((prev) => prev.filter((id) => id !== postId));
      }
    } catch (error) {
      console.error("LIKE ERROR:", error);
      // Revert optimistic update on failure
      setLikedPosts((prev) =>
        wasLiked ? (prev.includes(postId) ? prev : [...prev, postId]) : prev.filter((id) => id !== postId)
      );
      setLikeCounts((prev) => ({
        ...prev,
        [postId]: currentCount,
      }));
    }
  };

  // =========================
  // DOUBLE TAP
  // =========================

  const handleDoubleTap = (
    postId: string
  ) => {
    const now = Date.now();

    const previousTap =
      lastTap.current[postId] || 0;

    if (now - previousTap < 300) {
      likePost(postId);

      setShowHeart(postId);

      // Reset animation
      heartScale.setValue(0);
      heartOpacity.setValue(1);

      // Heart pops in
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();

      // Fade out
      setTimeout(() => {
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowHeart(null);
        });
      }, 450);
    }

    lastTap.current[postId] = now;
  };

  // =========================
  // POST
  // =========================

  const renderPost = ({
    item,
  }: {
    item: Post;
  }) => {
    const isLiked =
      likedPosts.includes(item.id);

    return (
      <View style={styles.postCard}>

        {/* USER HEADER */}

        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.username
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <Text style={styles.username}>
            {item.username}
          </Text>
        </View>

        {/* PHOTO */}

        <TouchableOpacity
          activeOpacity={1}
          onPress={() =>
            handleDoubleTap(item.id)
          }
        >
          <Image
            source={{ uri: item.image }}
            style={[
              styles.postImage,
              imageRatios[item.id]
                ? { aspectRatio: 1 / imageRatios[item.id] }
                : null,
            ]}
            resizeMode="contain"
          />

          {/* DOUBLE TAP HEART */}

          {showHeart === item.id && (
            <View
              pointerEvents="none"
              style={styles.heartOverlay}
            >
              <Animated.Text
                style={[
                  styles.bigHeart,
                  {
                    transform: [
                      {
                        scale: heartScale,
                      },
                    ],
                    opacity: heartOpacity,
                  },
                ]}
              >
                ❤️
              </Animated.Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ACTIONS */}

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => likePost(item.id)}
            activeOpacity={0.7}
            style={styles.actionBtn}
          >
            <Text style={styles.heart}>
              {isLiked ? "❤️" : "🤍"}
            </Text>
            <Text style={styles.likes}>
              {likeCounts[item.id] || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openComments(item)}
            activeOpacity={0.7}
            style={styles.actionBtn}
          >
            <Text style={styles.commentIcon}>💬</Text>
            <Text style={styles.commentBtnText}>Comments</Text>
          </TouchableOpacity>
        </View>

        {/* CAPTION */}

        <View style={styles.captionContainer}>
          <Text
            style={styles.captionUsername}
          >
            {item.username}
          </Text>

          <Text style={styles.caption}>
            {" "}
            {item.caption}
          </Text>
        </View>
      </View>
    );
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
        />

        <Text style={styles.loadingText}>
          Loading feed...
        </Text>
      </View>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchPosts}
        >
          <Text style={styles.retryText}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // =========================
  // MAIN FEED
  // =========================

  return (
    <View
      style={styles.container}
      {...panResponder.panHandlers}
    >
      {/* HEADER */}

      <View style={styles.feedHeader}>
        <Text style={styles.title}>
          SnapFilter
        </Text>

        <Text style={styles.subtitle}>
          Your Feed
        </Text>

        <Text style={styles.swipeHint}>
          ← Swipe right for Camera
        </Text>
      </View>

      {/* FEED */}

      {posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No photos yet 📸
          </Text>

          <Text style={styles.emptySubtext}>
            Upload a photo from the camera
            to see it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) =>
            item.id
          }
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.feed
          }
          onRefresh={fetchPosts}
          refreshing={loading}
        />
      )}
      {/* COMMENTS MODAL */}
      <Modal
        visible={commentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator size="small" color="#FFFC00" style={{ marginVertical: 20 }} />
            ) : comments.length === 0 ? (
              <Text style={styles.noCommentsText}>No comments yet. Say something nice!</Text>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id || (c as any)._id}
                renderItem={({ item: c }) => (
                  <View style={styles.commentRow}>
                    <Text style={styles.commentAuthor}>{c.username}</Text>
                    <Text style={styles.commentBody}>{c.text}</Text>
                  </View>
                )}
                style={styles.commentsList}
              />
            )}

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Add a comment..."
                placeholderTextColor="#888"
                value={newCommentText}
                onChangeText={setNewCommentText}
                maxLength={300}
              />
              <TouchableOpacity
                style={[
                  styles.sendCommentBtn,
                  !newCommentText.trim() && { opacity: 0.5 },
                ]}
                onPress={submitComment}
                disabled={!newCommentText.trim() || submittingComment}
              >
                <Text style={styles.sendCommentText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // =========================
  // MAIN
  // =========================

  container: {
    flex: 1,
    backgroundColor: "#f4f4f4",
  },

  // =========================
  // LOADING
  // =========================

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
    padding: 20,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#777",
  },

  errorText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },

  retryButton: {
    backgroundColor: "#222",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },

  retryText: {
    color: "#fff",
    fontWeight: "700",
  },

  // =========================
  // EMPTY FEED
  // =========================

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  emptyText: {
    fontSize: 22,
    fontWeight: "700",
  },

  emptySubtext: {
    marginTop: 8,
    fontSize: 15,
    color: "#777",
    textAlign: "center",
  },

  // =========================
  // HEADER
  // =========================

  feedHeader: {
    paddingTop: 55,
    paddingBottom: 15,
    alignItems: "center",
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    fontSize: 16,
    color: "#777",
    marginTop: 2,
  },

  swipeHint: {
    fontSize: 13,
    color: "#888",
    marginTop: 8,
  },

  // =========================
  // FEED
  // =========================

  feed: {
    paddingTop: 12,
    paddingBottom: 30,
  },

  // =========================
  // POST
  // =========================

  postCard: {
    backgroundColor: "#fff",
    marginBottom: 18,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  // =========================
  // USER
  // =========================

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  avatarText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },

  username: {
    fontSize: 16,
    fontWeight: "700",
  },

  // =========================
  // PHOTO
  // =========================

  postImage: {
    width: "100%",
    backgroundColor: "#000",
  },

  // =========================
  // HEART OVERLAY
  // =========================

  heartOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  bigHeart: {
    fontSize: 95,
  },

  // =========================
  // ACTIONS
  // =========================

  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 16,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
  },

  heart: {
    fontSize: 24,
  },

  commentIcon: {
    fontSize: 22,
  },

  commentBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginLeft: 6,
  },

  likes: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 6,
  },

  // =========================
  // COMMENTS MODAL
  // =========================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    minHeight: 350,
    padding: 16,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111111",
  },

  closeBtn: {
    fontSize: 20,
    color: "#777777",
    fontWeight: "bold",
    padding: 4,
  },

  noCommentsText: {
    textAlign: "center",
    color: "#888888",
    marginVertical: 40,
    fontSize: 15,
  },

  commentsList: {
    flex: 1,
    marginVertical: 10,
  },

  commentRow: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },

  commentAuthor: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#111111",
    marginBottom: 2,
  },

  commentBody: {
    fontSize: 14,
    color: "#333333",
  },

  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    gap: 8,
  },

  commentTextInput: {
    flex: 1,
    backgroundColor: "#F4F4F4",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },

  sendCommentBtn: {
    backgroundColor: "#111111",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  sendCommentText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  // =========================
  // CAPTION
  // =========================

  captionContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 14,
  },

  captionUsername: {
    fontSize: 15,
    fontWeight: "800",
  },

  caption: {
    fontSize: 15,
  },
});