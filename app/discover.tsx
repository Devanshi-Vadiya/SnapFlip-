import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { API_URL } from "../api/api";
import { getAuthToken } from "../api/authStorage";
import BottomNavBar from "../components/BottomNavBar";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = (width - 36) / 2;

type SearchUser = {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
};

type DiscoverPhoto = {
  id: string;
  imageUrl: string;
  username: string;
  caption: string;
  likes: number;
};

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [trendingPhotos, setTrendingPhotos] = useState<DiscoverPhoto[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Fetch discover/trending feed
  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      setLoadingFeed(true);
      const res = await fetch(`${API_URL}/api/photos`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        // Sort by likes count for discover trending
        const sorted = [...data].sort((a, b) => (b.likes || 0) - (a.likes || 0));
        setTrendingPhotos(
          sorted.map((p) => ({
            id: p.id || p._id,
            imageUrl: p.imageUrl,
            username: p.username,
            caption: p.caption || "",
            likes: typeof p.likes === "number" ? p.likes : 0,
          }))
        );
      }
    } catch (err) {
      console.error("Trending fetch error:", err);
    } finally {
      setLoadingFeed(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const token = await getAuthToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
          `${API_URL}/api/users/search?q=${encodeURIComponent(query)}`,
          { headers }
        );
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <View style={styles.container}>
      {/* SEARCH HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search creators & friends..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SEARCH RESULTS OR TRENDING GRID */}
      {searchQuery.trim().length > 0 ? (
        <View style={styles.resultsContainer}>
          {searching ? (
            <ActivityIndicator size="small" color="#FFFC00" style={{ marginTop: 20 }} />
          ) : searchResults.length === 0 ? (
            <Text style={styles.emptyText}>No creators found matching "{searchQuery}"</Text>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(u) => u.id}
              renderItem={({ item: u }) => (
                <View style={styles.userRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {u.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.usernameText}>@{u.username}</Text>
                    {u.bio ? <Text style={styles.bioText}>{u.bio}</Text> : null}
                  </View>
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => router.push(`/chat?recipientId=${u.id}&username=${u.username}` as any)}
                  >
                    <Text style={styles.chatBtnText}>Chat 💬</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={trendingPhotos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>🔥 Trending Snaps</Text>
          }
          refreshing={loadingFeed}
          onRefresh={fetchTrending}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => router.push("/feed")}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.cardOverlay}>
                <Text style={styles.cardUsername} numberOfLines={1}>
                  @{item.username}
                </Text>
                <Text style={styles.cardLikes}>❤️ {item.likes}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      <BottomNavBar activeRoute="discover" />
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
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1D27",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },
  clearIcon: {
    color: "#888",
    fontSize: 16,
    padding: 4,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141722",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFC00",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
  },
  usernameText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  bioText: {
    color: "#888888",
    fontSize: 13,
    marginTop: 2,
  },
  chatBtn: {
    backgroundColor: "#222738",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333A52",
  },
  chatBtnText: {
    color: "#FFFC00",
    fontWeight: "bold",
    fontSize: 13,
  },
  emptyText: {
    color: "#777",
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 14,
    paddingHorizontal: 4,
  },
  gridContent: {
    padding: 12,
  },
  card: {
    width: COLUMN_WIDTH,
    height: 220,
    margin: 6,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#161924",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardUsername: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
    flex: 1,
    marginRight: 4,
  },
  cardLikes: {
    color: "#FFFC00",
    fontSize: 12,
    fontWeight: "bold",
  },
});
