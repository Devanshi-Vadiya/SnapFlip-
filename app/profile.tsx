import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { API_URL } from "../api/api";
import { getAuthToken, getStoredUser, clearAuthSession, AuthUser } from "../api/authStorage";
import BottomNavBar from "../components/BottomNavBar";

const { width } = Dimensions.get("window");
const GRID_ITEM_SIZE = (width - 36) / 3;

type UserProfile = {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt?: string;
};

type UserPhoto = {
  id: string;
  imageUrl: string;
  caption?: string;
  likes: number;
  createdAt: string;
};

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [stats, setStats] = useState({ snapsCount: 0, likesCount: 0 });
  const [loading, setLoading] = useState(true);

  // Edit Bio state
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  // Selected photo modal
  const [selectedPhoto, setSelectedPhoto] = useState<UserPhoto | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const stored = await getStoredUser();
      const token = await getAuthToken();

      if (!stored || !token) {
        router.replace("/login");
        return;
      }

      setUser(stored);
      setBioInput(stored.bio || "");

      const res = await fetch(`${API_URL}/api/users/${stored.username}`);
      const data = await res.json();

      if (res.ok) {
        if (data.user) setUser(data.user);
        if (data.stats) setStats(data.stats);
        if (Array.isArray(data.photos)) setPhotos(data.photos);
      }
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveBio = async () => {
    try {
      setSavingBio(true);
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: bioInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        setUser((prev) => (prev ? { ...prev, bio: data.user.bio } : null));
        setEditingBio(false);
      } else {
        alert("Failed to update bio");
      }
    } catch (err) {
      console.error("Bio update error:", err);
    } finally {
      setSavingBio(false);
    }
  };

  const deletePhoto = (photoId: string) => {
    Alert.alert(
      "Delete Snap",
      "Are you sure you want to permanently delete this snap?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const token = await getAuthToken();
            if (!token) return;

            try {
              const res = await fetch(`${API_URL}/api/photos/${photoId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });

              if (res.ok) {
                setPhotos((prev) => prev.filter((p) => p.id !== photoId));
                setStats((prev) => ({
                  ...prev,
                  snapsCount: Math.max(0, prev.snapsCount - 1),
                }));
                setSelectedPhoto(null);
                alert("Snap deleted successfully");
              } else {
                alert("Failed to delete snap");
              }
            } catch (err) {
              console.error("Delete error:", err);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out of SnapFlip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await clearAuthSession();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* HEADER BAR */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profile</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out 🚪</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FFFC00" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          numColumns={3}
          contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
          ListHeaderComponent={
            <View style={styles.profileHeader}>
              {/* AVATAR */}
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarLetter}>
                    {user?.username ? user.username.charAt(0).toUpperCase() : "?"}
                  </Text>
                </View>
              </View>

              {/* USERNAME & HANDLE */}
              <Text style={styles.usernameText}>@{user?.username || "user"}</Text>

              {/* BIO SECTION */}
              {editingBio ? (
                <View style={styles.editBioRow}>
                  <TextInput
                    style={styles.bioTextInput}
                    placeholder="Tell your story..."
                    placeholderTextColor="#777"
                    value={bioInput}
                    onChangeText={setBioInput}
                    maxLength={150}
                  />
                  <TouchableOpacity
                    style={styles.saveBioBtn}
                    onPress={saveBio}
                    disabled={savingBio}
                  >
                    <Text style={styles.saveBioBtnText}>
                      {savingBio ? "..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelBioBtn}
                    onPress={() => setEditingBio(false)}
                  >
                    <Text style={styles.cancelBioText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.bioContainer}
                  onPress={() => setEditingBio(true)}
                >
                  <Text style={styles.bioText}>
                    {user?.bio ? user.bio : "Add bio ✏️"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* STATS ROW */}
              <View style={styles.statsCard}>
                <View style={styles.statCol}>
                  <Text style={styles.statNumber}>{stats.snapsCount}</Text>
                  <Text style={styles.statLabel}>Snaps</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statNumber}>{stats.likesCount}</Text>
                  <Text style={styles.statLabel}>Likes</Text>
                </View>
              </View>

              <Text style={styles.mySnapsTitle}>📸 My Snaps</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyGrid}>
              <Text style={styles.emptyGridText}>No snaps uploaded yet.</Text>
              <TouchableOpacity
                style={styles.takeSnapBtn}
                onPress={() => router.push("/camera")}
              >
                <Text style={styles.takeSnapBtnText}>Take a Snap 📷</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridItem}
              activeOpacity={0.85}
              onPress={() => setSelectedPhoto(item)}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.gridImage}
                resizeMode="cover"
              />
              <View style={styles.gridOverlay}>
                <Text style={styles.gridLikesText}>❤️ {item.likes}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* SELECTED SNAP DETAIL MODAL */}
      <Modal
        visible={Boolean(selectedPhoto)}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalCard}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Snap Details</Text>
              <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
                <Text style={styles.photoModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedPhoto && (
              <Image
                source={{ uri: selectedPhoto.imageUrl }}
                style={styles.photoModalImg}
                resizeMode="cover"
              />
            )}

            {selectedPhoto?.caption ? (
              <Text style={styles.photoModalCaption}>{selectedPhoto.caption}</Text>
            ) : null}

            <View style={styles.photoModalActions}>
              <Text style={styles.photoModalLikes}>
                ❤️ {selectedPhoto?.likes || 0} Likes
              </Text>

              <TouchableOpacity
                style={styles.photoModalDeleteBtn}
                onPress={() => selectedPhoto && deletePhoto(selectedPhoto.id)}
              >
                <Text style={styles.photoModalDeleteText}>Delete 🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BOTTOM NAVIGATION */}
      <BottomNavBar activeRoute="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B10",
  },
  topBar: {
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
  topBarTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 68, 68, 0.15)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 68, 68, 0.4)",
  },
  logoutText: {
    color: "#FF6666",
    fontSize: 13,
    fontWeight: "bold",
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 16,
  },
  avatarContainer: {
    marginBottom: 10,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#FFFC00",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  avatarLetter: {
    color: "#000000",
    fontSize: 36,
    fontWeight: "bold",
  },
  usernameText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 6,
  },
  bioContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 14,
  },
  bioText: {
    color: "#AAAAAA",
    fontSize: 14,
    textAlign: "center",
  },
  editBioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 8,
  },
  bioTextInput: {
    flex: 1,
    backgroundColor: "#1A1D27",
    color: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  saveBioBtn: {
    backgroundColor: "#FFFC00",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveBioBtnText: {
    color: "#000000",
    fontWeight: "bold",
  },
  cancelBioBtn: {
    padding: 6,
  },
  cancelBioText: {
    color: "#888",
    fontSize: 18,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#141722",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 30,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#1E2232",
    width: "80%",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statCol: {
    alignItems: "center",
  },
  statNumber: {
    color: "#FFFC00",
    fontSize: 22,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#888888",
    fontSize: 13,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#222738",
  },
  mySnapsTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginTop: 16,
    marginBottom: 8,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE * 1.3,
    margin: 4,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#161924",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridOverlay: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gridLikesText: {
    color: "#FFFC00",
    fontSize: 11,
    fontWeight: "bold",
  },
  emptyGrid: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyGridText: {
    color: "#777777",
    fontSize: 15,
    marginBottom: 14,
  },
  takeSnapBtn: {
    backgroundColor: "#FFFC00",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  takeSnapBtnText: {
    color: "#000000",
    fontWeight: "bold",
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  photoModalCard: {
    width: "100%",
    backgroundColor: "#141722",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222738",
  },
  photoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  photoModalTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 17,
  },
  photoModalClose: {
    color: "#888888",
    fontSize: 18,
    padding: 4,
  },
  photoModalImg: {
    width: "100%",
    height: 320,
    borderRadius: 14,
    backgroundColor: "#000",
  },
  photoModalCaption: {
    color: "#DDDDDD",
    fontSize: 15,
    marginTop: 10,
  },
  photoModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#222738",
  },
  photoModalLikes: {
    color: "#FFFC00",
    fontWeight: "bold",
    fontSize: 15,
  },
  photoModalDeleteBtn: {
    backgroundColor: "rgba(255, 68, 68, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  photoModalDeleteText: {
    color: "#FF6666",
    fontWeight: "bold",
  },
});
