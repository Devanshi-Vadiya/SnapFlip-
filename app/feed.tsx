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
  Alert,
  StatusBar,
} from "react-native";

import { router } from "expo-router";
import { API_URL } from "../api/api";
import { getAuthToken, getStoredUser, AuthUser } from "../api/authStorage";
import { formatRelativeTime } from "../utils/formatTime";
import StoryTray, { UserStoryGroup } from "../components/StoryTray";
import StoryViewer from "../components/StoryViewer";
import BottomNavBar from "../components/BottomNavBar";

type Post = {
  id: string;
  userId?: string;
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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // Stories state
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<UserStoryGroup | null>(null);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);

  const deletePost = (postId: string) => {
    Alert.alert(
      "Delete Snap",
      "Are you sure you want to delete this snap? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const token = await getAuthToken();
            if (!token) return;

            try {
              const res = await fetch(`${API_URL}/api/photos/${postId}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (res.ok) {
                setPosts((prev) => prev.filter((p) => p.id !== postId));
                alert("Snap deleted successfully");
              } else {
                const data = await res.json();
                alert(data.message || "Failed to delete snap");
              }
            } catch (err) {
              console.error("Delete error:", err);
              alert("Network error deleting snap");
            }
          },
        },
      ]
    );
  };

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
        userId: photo.userId,
        username: photo.username,
        image: photo.imageUrl,
        caption: photo.caption || "",
        likes: typeof photo.likes === "number" ? photo.likes : 0,
        isLikedByMe: Boolean(photo.isLikedByMe),
        avatarUrl: photo.avatarUrl || "",
        createdAt: photo.createdAt,
      }));

      setPosts(formattedPosts);

      // Fetch active 24h stories
      try {
        const storiesRes = await fetch(`${API_URL}/api/stories/feed`, { headers });
        const contentType = storiesRes.headers.get("content-type");
        if (storiesRes.ok && contentType && contentType.includes("application/json")) {
          const storiesData = await storiesRes.json();
          if (Array.isArray(storiesData)) {
            setStoryGroups(storiesData);
          }
        }
      } catch (sErr) {
        // Silently handle if backend is spinning up or route not yet deployed
      }

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
    getStoredUser().then((user) => setCurrentUser(user));
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
          <View style={styles.userInfoLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.username
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View>
              <Text style={styles.username}>
                @{item.username}
              </Text>
              {item.createdAt ? (
                <Text style={styles.timestampText}>
                  {formatRelativeTime(item.createdAt)}
                </Text>
              ) : null}
            </View>
          </View>

          {currentUser &&
            (currentUser.username === item.username ||
              currentUser.id === item.userId) && (
              <TouchableOpacity
                onPress={() => deletePost(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.deleteBtn}
              >
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            )}
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
      <View style={styles.container}>
        <View style={styles.feedHeader}>
          <View style={styles.feedHeaderLeft}>
            <View style={styles.logoBadgeSmall}>
              <Text style={styles.logoIconSmall}>📸</Text>
            </View>
            <Text style={styles.title}>SnapFlip</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFC00" />
          <Text style={styles.loadingText}>Loading feed & stories...</Text>
        </View>
        <BottomNavBar activeRoute="feed" />
      </View>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.feedHeader}>
          <View style={styles.feedHeaderLeft}>
            <View style={styles.logoBadgeSmall}>
              <Text style={styles.logoIconSmall}>📸</Text>
            </View>
            <Text style={styles.title}>SnapFlip</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPosts}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar activeRoute="feed" />
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
        <View style={styles.feedHeaderLeft}>
          <View style={styles.logoBadgeSmall}>
            <Text style={styles.logoIconSmall}>📸</Text>
          </View>
          <Text style={styles.title}>SnapFlip</Text>
        </View>

        <TouchableOpacity
          style={styles.headerCameraBtn}
          onPress={() => router.push("/camera")}
        >
          <Text style={styles.headerCameraText}>+ Snap</Text>
        </TouchableOpacity>
      </View>

      {/* FEED */}

      {posts.length === 0 ? (
        <View style={{ flex: 1 }}>
          <StoryTray
            storyGroups={storyGroups}
            currentUsername={currentUser?.username}
            onSelectGroup={(group) => {
              setSelectedStoryGroup(group);
              setStoryViewerVisible(true);
            }}
            onAddStory={() => router.push("/camera")}
          />
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No photos yet 📸
            </Text>

            <Text style={styles.emptySubtext}>
              Upload a photo from the camera
              to see it here.
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) =>
            item.id
          }
          ListHeaderComponent={
            <StoryTray
              storyGroups={storyGroups}
              currentUsername={currentUser?.username}
              onSelectGroup={(group) => {
                setSelectedStoryGroup(group);
                setStoryViewerVisible(true);
              }}
              onAddStory={() => router.push("/camera")}
            />
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

      {/* STORY VIEWER MODAL */}
      <StoryViewer
        visible={storyViewerVisible}
        group={selectedStoryGroup}
        currentUsername={currentUser?.username}
        onClose={() => {
          setStoryViewerVisible(false);
          setSelectedStoryGroup(null);
        }}
        onStoryDeleted={() => {
          fetchPosts();
        }}
      />
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
      <BottomNavBar activeRoute="feed" />
    </View>
  );
}

const styles = StyleSheet.create({
  // =========================
  // MAIN
  // =========================

  container: {
    flex: 1,
    backgroundColor: "#0A0B10",
  },

  // =========================
  // LOADING
  // =========================

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0B10",
    padding: 20,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#8E92A4",
  },

  errorText: {
    fontSize: 16,
    color: "#8E92A4",
    textAlign: "center",
    marginBottom: 20,
  },

  retryButton: {
    backgroundColor: "#FFFC00",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },

  retryText: {
    color: "#000000",
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
    marginTop: 60,
  },

  emptyText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  emptySubtext: {
    marginTop: 8,
    fontSize: 15,
    color: "#8E92A4",
    textAlign: "center",
  },

  // =========================
  // HEADER
  // =========================

  feedHeader: {
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#11131A",
    borderBottomWidth: 1,
    borderBottomColor: "#1D202A",
  },

  feedHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  logoBadgeSmall: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFFC00",
    justifyContent: "center",
    alignItems: "center",
  },

  logoIconSmall: {
    fontSize: 18,
  },

  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  headerCameraBtn: {
    backgroundColor: "#1F2332",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#30374E",
  },

  headerCameraText: {
    color: "#FFFC00",
    fontWeight: "bold",
    fontSize: 13,
  },

  subtitle: {
    fontSize: 16,
    color: "#8E92A4",
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
    paddingTop: 8,
    paddingBottom: 30,
  },

  // =========================
  // POST
  // =========================

  postCard: {
    backgroundColor: "#131622",
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1E2234",
  },

  // =========================
  // USER
  // =========================

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#131622",
  },

  userInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  timestampText: {
    fontSize: 11,
    color: "#7E8398",
    marginTop: 1,
  },

  deleteBtn: {
    padding: 6,
  },

  deleteIcon: {
    fontSize: 18,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFC00",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#000000",
    fontSize: 17,
    fontWeight: "800",
  },

  username: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
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
    color: "#8E92A4",
    marginLeft: 6,
  },

  likes: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 6,
  },

  // =========================
  // COMMENTS MODAL
  // =========================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "#131622",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    minHeight: 350,
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: "#1E2234",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2234",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  closeBtn: {
    fontSize: 20,
    color: "#8E92A4",
    fontWeight: "bold",
    padding: 4,
  },

  noCommentsText: {
    textAlign: "center",
    color: "#8E92A4",
    marginVertical: 40,
    fontSize: 15,
  },

  commentsList: {
    flex: 1,
    marginVertical: 10,
  },

  commentRow: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2234",
  },

  commentAuthor: {
    fontWeight: "bold",
    fontSize: 13,
    color: "#FFFC00",
    marginBottom: 3,
  },

  commentBody: {
    fontSize: 14,
    color: "#FFFFFF",
  },

  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1E2234",
    gap: 8,
  },

  commentTextInput: {
    flex: 1,
    backgroundColor: "#1C2030",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#262C42",
  },

  sendCommentBtn: {
    backgroundColor: "#FFFC00",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  sendCommentText: {
    color: "#000000",
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
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  caption: {
    fontSize: 14,
    color: "#D0D3E0",
  },
});