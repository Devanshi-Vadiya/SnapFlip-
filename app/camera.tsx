import { CameraView, useCameraPermissions } from "expo-camera";
import { captureRef } from "react-native-view-shot";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { API_URL } from "../api/api";

import {
  ActivityIndicator,
  Button,
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as SecureStore from "expo-secure-store";
import { clearAuthSession } from "../api/authStorage";
import BottomNavBar from "../components/BottomNavBar";

export default function CameraScreen() {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMode, setCameraMode] = useState<"feed" | "story">("feed");

  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [caption, setCaption] = useState("");

  const [currentTime, setCurrentTime] = useState(new Date());

  const [filter, setFilter] = useState("normal");

  const [location, setLocation] = useState<string | null>(null);

  const [text, setText] = useState("");

  const cameraRef = useRef<CameraView>(null);
  const previewRef = useRef<View>(null);

  // =========================
  // SWIPE NAVIGATION
  // =========================

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },

      onPanResponderRelease: (_, gestureState) => {
        // Swipe LEFT → Feed
        if (gestureState.dx < -80) {
          router.push("/feed");
        }
      },
    })
  ).current;

  // =========================
  // CLOCK
  // =========================

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // =========================
  // GET LOCATION
  // =========================

  const getLocation = async () => {
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("Location permission is required");
        return;
      }

      const currentLocation =
        await Location.getCurrentPositionAsync({});

      const places = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (places.length > 0) {
        const place = places[0];

        const city =
          place.city ||
          place.subregion ||
          place.region ||
          "Unknown location";

        setLocation(city);
      }
    } catch (error) {
      console.log("Location error:", error);
      alert("Could not get location");
    }
  };

  // =========================
  // CAMERA PERMISSION
  // =========================

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission is required
        </Text>

        <Button
          title="Allow Camera"
          onPress={requestPermission}
        />
      </View>
    );
  }

  // =========================
  // TAKE PICTURE
  // =========================

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const result =
          await cameraRef.current.takePictureAsync();

        if (result) {
          setPhoto(result.uri);
        }
      } catch (error) {
        console.log("Camera error:", error);
        alert("Could not take picture");
      }
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    await clearAuthSession();
    router.replace("/login");
  };

  // =========================
  // NATIVE MULTIPART UPLOADER
  // (Uses XMLHttpRequest to bypass Expo fetch FormDataPart issue)
  // =========================
  const uploadMultipart = (
    url: string,
    token: string,
    fileUri: string,
    fileName: string,
    fields: Record<string, string>
  ): Promise<{ ok: boolean; status: number; data: any }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
      xhr.setRequestHeader("Accept", "application/json");

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            data,
          });
        } catch {
          resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            data: {
              message:
                xhr.responseText || `Upload finished with status ${xhr.status}`,
            },
          });
        }
      };

      xhr.onerror = (err) => {
        console.error("XHR network error:", err);
        reject(
          new Error("Network connection error during upload. Please try again.")
        );
      };

      const formData = new FormData();
      formData.append("image", {
        uri: fileUri,
        name: fileName,
        type: "image/jpeg",
      } as any);

      for (const [key, val] of Object.entries(fields)) {
        formData.append(key, val);
      }

      xhr.send(formData);
    });
  };

  // =========================
  // UPLOAD PHOTO
  // =========================
  const uploadPhoto = async () => {
    if (!photo || uploading) {
      return;
    }

    try {
      setUploading(true);

      let uploadUri = photo;

      // Bake text into the uploaded image
      if (
        (filter === "text" && text.trim() !== "") ||
        filter === "time" ||
        (filter === "location" && location)
      ) {
        if (!previewRef.current) {
          alert("Could not prepare photo");
          return;
        }

        uploadUri = await captureRef(previewRef, {
          format: "jpg",
          quality: 1,
          result: "tmpfile",
        });

        console.log("CAPTURED IMAGE:", uploadUri);
      }

      const token = await SecureStore.getItemAsync("token");

      const res = await uploadMultipart(
        `${API_URL}/api/photos/upload`,
        token || "",
        uploadUri,
        "snapfilter-photo.jpg",
        {
          caption: caption.trim() || "My SnapFlip snap",
          filter,
        }
      );

      if (res.ok) {
        alert("Photo uploaded successfully ☁️");
        console.log("Uploaded photo:", res.data);
        setPhoto(null);
        setCaption("");
        router.push("/feed");
      } else {
        alert(res.data?.message || "Upload failed");
      }
    } catch (error: any) {
      console.log("Upload error:", error);
      alert(error?.message || `Upload error: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  // =========================
  // UPLOAD STORY (24H EXPIRY)
  // =========================
  const uploadAsStory = async () => {
    if (!photo || uploading) return;

    try {
      setUploading(true);

      let uploadUri = photo;
      if (
        (filter === "text" && text.trim() !== "") ||
        filter === "time" ||
        (filter === "location" && location)
      ) {
        if (previewRef.current) {
          uploadUri = await captureRef(previewRef, {
            format: "jpg",
            quality: 1,
            result: "tmpfile",
          });
        }
      }

      const token = await SecureStore.getItemAsync("token");

      const res = await uploadMultipart(
        `${API_URL}/api/stories/upload`,
        token || "",
        uploadUri,
        "snapflip-story.jpg",
        {
          caption: caption.trim() || "",
          filter,
        }
      );

      if (res.ok) {
        alert("Posted to Story! 🌟 Active for 24 hours.");
        setPhoto(null);
        setCaption("");
        router.push("/feed");
      } else {
        alert(res.data?.message || "Failed to post story");
      }
    } catch (error: any) {
      console.error("Story upload error:", error);
      alert(error?.message || `Story error: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  // =========================
  // PHOTO PREVIEW
  // =========================

  if (photo) {
    return (
      <View style={styles.container}>

        {/* =========================
            CAPTURED PHOTO + TEXT
            ========================= */}

        <View
          ref={previewRef}
          collapsable={false}
          style={styles.previewContainer}
        >
          <Image
            source={{ uri: photo }}
            style={styles.preview}
          />

          {/* FILTER OVERLAYS */}
          {filter === "warm" && (
            <View
              pointerEvents="none"
              style={styles.warmFilter}
            />
          )}

          {filter === "cool" && (
            <View
              pointerEvents="none"
              style={styles.coolFilter}
            />
          )}

          {filter === "bw" && (
            <View
              pointerEvents="none"
              style={styles.bwFilter}
            />
          )}

          {filter === "vintage" && (
            <View
              pointerEvents="none"
              style={styles.vintageFilter}
            />
          )}

          {/* TEXT OVERLAY */}
          {filter === "text" && text.trim() !== "" && (
            <View style={styles.previewTextContainer}>
              <Text style={styles.previewText}>
                {text}
              </Text>
            </View>
          )}

          {/* TIME OVERLAY */}
          {filter === "time" && (
            <View
              pointerEvents="none"
              style={styles.timeFilter}
            >
              <Text style={styles.timeText}>
                {currentTime.toLocaleTimeString()}
              </Text>

              <Text style={styles.dateText}>
                {currentTime.toLocaleDateString()}
              </Text>
            </View>
          )}
          {/* LOCATION OVERLAY */}
          {filter === "location" && location && (
            <View
              pointerEvents="none"
              style={styles.locationFilter}
            >
              <Text style={styles.locationText}>
                📍 {location}
              </Text>
            </View>
          )}
        </View>

        {/* =========================
            CAPTION INPUT
            ========================= */}
        <View style={styles.captionInputContainer}>
          <TextInput
            style={styles.captionInput}
            placeholder="Add a snap caption..."
            placeholderTextColor="#8E92A4"
            value={caption}
            onChangeText={setCaption}
            maxLength={140}
          />
        </View>

        {/* =========================
            PREVIEW ACTIONS
            ========================= */}
        <View style={styles.previewActionsContainer}>
          <TouchableOpacity
            style={styles.actionRetakeBtn}
            onPress={() => {
              setPhoto(null);
              setCaption("");
            }}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <Text style={styles.actionRetakeText}>↺ Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionStoryBtn, uploading && styles.actionDisabled]}
            onPress={uploadAsStory}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFC00" size="small" />
            ) : (
              <Text style={styles.actionStoryText}>🌟 My Story</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionFeedBtn, uploading && styles.actionDisabled]}
            onPress={uploadPhoto}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator color="#0A0B10" size="small" />
            ) : (
              <Text style={styles.actionFeedText}>Send Snap ⚡</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // =========================
  // CAMERA SCREEN
  // =========================

  return (
    <View
      style={styles.container}
      {...panResponder.panHandlers}
    >

      {/* =========================
          CAMERA VIEW
          ========================= */}

      {isFocused ? (
        <CameraView
          key={facing}
          ref={cameraRef}
          style={styles.cameraView}
          facing={facing}
          enableTorch={flash === "on"}
          onCameraReady={() => setCameraReady(true)}
        />
      ) : (
        <View style={styles.cameraView} />
      )}

      {/* TOP CONTROLS: FLIP, FLASH & STORIES TRAY */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.controlPill}
          onPress={() => setFacing(facing === "back" ? "front" : "back")}
          activeOpacity={0.8}
        >
          <Text style={styles.controlPillText}>
            🔄 {facing === "back" ? "Front" : "Back"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlPill}
          onPress={() => setFlash(flash === "off" ? "on" : "off")}
          activeOpacity={0.8}
        >
          <Text style={styles.controlPillText}>
            ⚡ {flash === "on" ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlPill, styles.storyPill]}
          onPress={() => router.push("/feed")}
          activeOpacity={0.8}
        >
          <Text style={styles.storyPillText}>
            🌟 Stories Tray
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================
          FILTER OVERLAYS
          ========================= */}

      {filter === "warm" && (
        <View
          pointerEvents="none"
          style={styles.warmFilter}
        />
      )}

      {filter === "cool" && (
        <View
          pointerEvents="none"
          style={styles.coolFilter}
        />
      )}

      {filter === "bw" && (
        <View
          pointerEvents="none"
          style={styles.bwFilter}
        />
      )}

      {filter === "vintage" && (
        <View
          pointerEvents="none"
          style={styles.vintageFilter}
        />
      )}

      {/* =========================
          TIME FILTER
          ========================= */}

      {filter === "time" && (
        <View
          pointerEvents="none"
          style={styles.timeFilter}
        >
          <Text style={styles.timeText}>
            {currentTime.toLocaleTimeString()}
          </Text>

          <Text style={styles.dateText}>
            {currentTime.toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* =========================
          LOCATION FILTER
          ========================= */}

      {filter === "location" && location && (
        <View
          pointerEvents="none"
          style={styles.locationFilter}
        >
          <Text style={styles.locationText}>
            📍 {location}
          </Text>
        </View>
      )}

      {/* =========================
          TEXT FILTER
          ========================= */}

      {filter === "text" && (
        <View style={styles.textFilterContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type something..."
            placeholderTextColor="white"
            value={text}
            onChangeText={setText}
          />
        </View>
      )}

      {/* =========================
          LOGOUT
          ========================= */}

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>
          Logout
        </Text>
      </TouchableOpacity>

      {/* =========================
          BOTTOM CONTROLS
          ========================= */}

      <View style={styles.bottomControls}>

        {/* FILTER PANEL */}

        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >

            {/* NORMAL */}

            <TouchableOpacity
              style={[
                styles.filterItem,
                filter === "normal" &&
                styles.activeFilter,
              ]}
              onPress={() => setFilter("normal")}
            >
              <Text style={styles.filterText}>
                Normal
              </Text>
            </TouchableOpacity>

            {/* WARM */}

            <TouchableOpacity
              style={[
                styles.filterItem,
                filter === "warm" &&
                styles.activeFilter,
              ]}
              onPress={() => setFilter("warm")}
            >
              <Text style={styles.filterText}>
                Warm
              </Text>
            </TouchableOpacity>

            {/* COOL */}

            <TouchableOpacity
              style={[
                styles.filterItem,
                filter === "cool" &&
                styles.activeFilter,
              ]}
              onPress={() => setFilter("cool")}
            >
              <Text style={styles.filterText}>
                Cool
              </Text>
            </TouchableOpacity>

            {/* B&W */}

            <TouchableOpacity
              style={[
                styles.filterItem,
                filter === "bw" &&
                styles.activeFilter,
              ]}
              onPress={() => setFilter("bw")}
            >
              <Text style={styles.filterText}>
                B&W
              </Text>
            </TouchableOpacity>

            {/* VINTAGE */}

            <TouchableOpacity
              style={[
                styles.filterItem,
                filter === "vintage" &&
                styles.activeFilter,
              ]}
              onPress={() => setFilter("vintage")}
            >
              <Text style={styles.filterText}>
                Vintage
              </Text>
            </TouchableOpacity>

            {/* TIME */}

            <TouchableOpacity
              style={[
                styles.filterItem,
                filter === "time" &&
                styles.activeFilter,
              ]}
              onPress={() => setFilter("time")}
            >
              <Text style={styles.filterText}>
                Time
              </Text>
            </TouchableOpacity>

            {/* LOCATION */}

            <TouchableOpacity
              style={[
                styles.filterItem,
                filter === "location" &&
                styles.activeFilter,
              ]}
              onPress={() => {
                setFilter("location");
                getLocation();
              }}
            >
              <Text style={styles.filterText}>
                Location
              </Text>
            </TouchableOpacity>

            {/* TEXT */}

            <TouchableOpacity
              style={[
                styles.filterItem,
                filter === "text" &&
                styles.activeFilter,
              ]}
              onPress={() => setFilter("text")}
            >
              <Text style={styles.filterText}>
                Text
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </View>

        {/* =========================
            DESTINATION MODE SELECTOR
            ========================= */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              cameraMode === "feed" && styles.modeTabActive,
            ]}
            onPress={() => setCameraMode("feed")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.modeTabText,
                cameraMode === "feed" && styles.modeTabTextActive,
              ]}
            >
              ⚡ Snap Feed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              cameraMode === "story" && styles.modeTabActiveStory,
            ]}
            onPress={() => setCameraMode("story")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.modeTabText,
                cameraMode === "story" && styles.modeTabTextActiveStory,
              ]}
            >
              🌟 24h Story
            </Text>
          </TouchableOpacity>
        </View>

        {/* =========================
            SWIPE HINT
            ========================= */}

        <Text style={styles.swipeHint}>
          Swipe left for Feed & Stories →
        </Text>

        {/* =========================
            CAMERA BUTTON
            ========================= */}

        <TouchableOpacity
          style={[
            styles.cameraButton,
            cameraMode === "story" && styles.cameraButtonStory,
          ]}
          onPress={takePicture}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.cameraButtonInner,
              cameraMode === "story" && styles.cameraButtonInnerStory,
            ]}
          >
            <Text style={styles.cameraIcon}>
              {cameraMode === "story" ? "🌟" : "📷"}
            </Text>
          </View>
        </TouchableOpacity>

      </View>
      <BottomNavBar activeRoute="camera" />
    </View>
  );
}

// =========================
// STYLES
// =========================

const styles = StyleSheet.create({

  // =========================
  // MAIN
  // =========================

  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  camera: {
    flex: 1,
  },

  // =========================
  // PHOTO PREVIEW
  // =========================

  previewContainer: {
    flex: 1,
    width: "100%",
    position: "relative",
    backgroundColor: "#000",
  },

  preview: {
    flex: 1,
    width: "100%",
  },

  // =========================
  // TEXT ON CAPTURED PHOTO
  // =========================

  previewTextContainer: {
    position: "absolute",
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 10,
  },

  previewText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",

    textShadowColor: "rgba(0, 0, 0, 0.8)",

    textShadowOffset: {
      width: 2,
      height: 2,
    },

    textShadowRadius: 4,
  },

  // =========================
  // LOGOUT
  // =========================

  logoutButton: {
    position: "absolute",

    top: 48,
    right: 16,

    zIndex: 20,

    backgroundColor:
      "rgba(0, 0, 0, 0.55)",

    paddingVertical: 8,
    paddingHorizontal: 16,

    borderRadius: 20,

    borderWidth: 1,

    borderColor:
      "rgba(255, 255, 255, 0.35)",
  },

  logoutText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // =========================
  // BOTTOM CONTROLS
  // =========================

  bottomControls: {
    position: "absolute",

    left: 0,
    right: 0,
    bottom: 20,

    alignItems: "center",

    paddingHorizontal: 14,
  },

  // =========================
  // FILTER CONTAINER
  // =========================

  filtersContainer: {
    width: "100%",

    backgroundColor:
      "rgba(0, 0, 0, 0.55)",

    borderRadius: 24,

    borderWidth: 1,

    borderColor:
      "rgba(255, 255, 255, 0.25)",

    paddingVertical: 8,

    marginBottom: 12,

    overflow: "hidden",
  },

  filters: {
    paddingHorizontal: 10,

    alignItems: "center",

    gap: 8,
  },

  filterItem: {
    paddingVertical: 8,
    paddingHorizontal: 14,

    borderRadius: 18,
  },

  activeFilter: {
    backgroundColor:
      "rgba(255, 255, 255, 0.20)",

    borderWidth: 1,

    borderColor:
      "rgba(255, 255, 255, 0.6)",
  },

  filterText: {
    color: "#fff",

    fontSize: 15,

    fontWeight: "700",
  },

  // =========================
  // SWIPE HINT
  // =========================

  swipeHint: {
    color: "#fff",

    fontSize: 14,

    fontWeight: "600",

    marginBottom: 10,

    opacity: 0.85,

    textAlign: "center",
  },

  // =========================
  // CAMERA BUTTON
  // =========================

  cameraButton: {
    width: 82,
    height: 82,

    borderRadius: 41,

    borderWidth: 3,
    borderColor: "#fff",
     
    backgroundColor:
      "rgba(255, 255, 255, 0.16)",

    justifyContent: "center",
    alignItems: "center",
  },

  cameraButtonInner: {
    width: 68,
    height: 68,

    borderRadius: 34,

    backgroundColor:
      "rgba(255, 255, 255, 0.32)",

    justifyContent: "center",
    alignItems: "center",
  },

  cameraIcon: {
    fontSize: 30,
  },

  // =========================
  // FILTER OVERLAYS
  // =========================

  warmFilter: {
    ...StyleSheet.absoluteFill,

    backgroundColor:
      "rgba(255, 180, 80, 0.25)",
  },
  
  coolFilter: {
    ...StyleSheet.absoluteFill,

    backgroundColor:
      "rgba(80, 150, 255, 0.20)",
  },

  bwFilter: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },

  vintageFilter: {
    ...StyleSheet.absoluteFill,

    backgroundColor:
      "rgba(180, 120, 60, 0.25)",
  },

  // =========================
  // TIME FILTER
  // =========================

  timeFilter: {
    position: "absolute",

    bottom: 220,

    alignSelf: "center",

    alignItems: "center",

    zIndex: 5,
  },

  timeText: {
    color: "#fff",

    fontSize: 32,

    fontWeight: "bold",
  },

  dateText: {
    color: "#fff",

    fontSize: 18,
  },

  // =========================
  // LOCATION FILTER
  // =========================

  locationFilter: {
    position: "absolute",

    bottom: 220,

    alignSelf: "center",

    backgroundColor:
      "rgba(0, 0, 0, 0.45)",

    paddingVertical: 8,
    paddingHorizontal: 15,

    borderRadius: 20,

    zIndex: 5,
  },

  locationText: {
    color: "#fff",

    fontSize: 20,

    fontWeight: "bold",
  },

  // =========================
  // TEXT FILTER
  // =========================

  textFilterContainer: {
    position: "absolute",

    bottom: 220,

    left: 20,
    right: 20,

    alignItems: "center",

    zIndex: 5,
  },

  textInput: {
    color: "#fff",

    fontSize: 28,

    fontWeight: "bold",

    textAlign: "center",

    minWidth: 200,

    padding: 10,
  },

  // =========================
  // RETAKE / UPLOAD ACTIONS
  // =========================

  previewActionsContainer: {
    position: "absolute",
    bottom: 36,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  actionRetakeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: "rgba(20, 22, 32, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  actionRetakeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  actionStoryBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: "#1E202B",
    borderWidth: 1,
    borderColor: "rgba(255, 252, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },

  actionStoryText: {
    color: "#FFFC00",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  actionFeedBtn: {
    flex: 1.2,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: "#FFFC00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFFC00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },

  actionFeedText: {
    color: "#0A0B10",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  actionDisabled: {
    opacity: 0.6,
  },

  // =========================
  // PERMISSION
  // =========================

  permissionContainer: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",

    gap: 20,
  },

  permissionText: {
    fontSize: 18,
  },

  captionInputContainer: {
    position: "absolute",
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },

  captionInput: {
    color: "#FFFFFF",
    fontSize: 16,
  },

  topControls: {
    position: "absolute",
    top: 48,
    left: 16,
    flexDirection: "row",
    gap: 10,
    zIndex: 20,
  },

  controlPill: {
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },

  controlPillText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },

  cameraView: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },

  storyPill: {
    backgroundColor: "rgba(255, 252, 0, 0.15)",
    borderColor: "#FFFC00",
  },

  storyPillText: {
    color: "#FFFC00",
    fontWeight: "bold",
    fontSize: 13,
  },

  modeSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 22,
    padding: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },

  modeTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
  },

  modeTabActive: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },

  modeTabActiveStory: {
    backgroundColor: "#FFFC00",
  },

  modeTabText: {
    color: "#9EA2B4",
    fontSize: 13,
    fontWeight: "700",
  },

  modeTabTextActive: {
    color: "#FFFFFF",
  },

  modeTabTextActiveStory: {
    color: "#0A0B10",
  },

  cameraButtonStory: {
    borderColor: "#FFFC00",
    backgroundColor: "rgba(255, 252, 0, 0.22)",
  },

  cameraButtonInnerStory: {
    backgroundColor: "rgba(255, 252, 0, 0.45)",
  },

  actionStoryBtnActive: {
    backgroundColor: "#FFFC00",
    borderColor: "#FFFC00",
  },

  actionFeedBtnActive: {
    shadowColor: "#FFFC00",
    shadowOpacity: 0.5,
  },
});