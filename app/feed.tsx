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
} from "react-native";

import { router } from "expo-router";
import { API_URL } from "./api";

type Post = {
  id: string;
  username: string;
  image: string;
  caption: string;
  likes: number;
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

  // =========================
  // FETCH REAL PHOTOS
  // =========================

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/photos`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load feed"
        );
      }

      const formattedPosts: Post[] = data.map(
        (photo: any) => ({
          id: photo._id,
          username: photo.username,
          image: photo.imageUrl,
          caption: photo.caption || "",
          likes: photo.likes || 0,
        })
      );

      setPosts(formattedPosts);

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
  // LIKE POST
  // =========================

  const likePost = (postId: string) => {
    if (likedPosts.includes(postId)) {
      return;
    }

    setLikedPosts((prev) => [
      ...prev,
      postId,
    ]);

    setLikeCounts((prev) => ({
      ...prev,
      [postId]:
        (prev[postId] || 0) + 1,
    }));
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
            style={styles.postImage}
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
            onPress={() =>
              likePost(item.id)
            }
            activeOpacity={0.7}
          >
            <Text style={styles.heart}>
              {isLiked ? "❤️" : "🤍"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.likes}>
            {likeCounts[item.id] || 0} likes
          </Text>
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
    height: 420,
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
  },

  heart: {
    fontSize: 28,
  },

  likes: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
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