import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";

type RouteName = "feed" | "discover" | "camera" | "chat" | "profile";

type Props = {
  activeRoute: RouteName;
};

export default function BottomNavBar({ activeRoute }: Props) {
  const navigate = (target: RouteName, path: string) => {
    if (activeRoute !== target) {
      router.replace(path as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. FEED */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigate("feed", "/feed")}
        activeOpacity={0.7}
      >
        <Text style={[styles.navIcon, activeRoute === "feed" && styles.activeIcon]}>
          🔥
        </Text>
        <Text style={[styles.navLabel, activeRoute === "feed" && styles.activeLabel]}>
          Feed
        </Text>
      </TouchableOpacity>

      {/* 2. DISCOVER */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigate("discover", "/discover")}
        activeOpacity={0.7}
      >
        <Text style={[styles.navIcon, activeRoute === "discover" && styles.activeIcon]}>
          🔍
        </Text>
        <Text style={[styles.navLabel, activeRoute === "discover" && styles.activeLabel]}>
          Discover
        </Text>
      </TouchableOpacity>

      {/* 3. CAMERA (CENTER SHUTTER) */}
      <TouchableOpacity
        style={styles.cameraShutterItem}
        onPress={() => navigate("camera", "/camera")}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.shutterRing,
            activeRoute === "camera" && styles.shutterRingActive,
          ]}
        >
          <View style={styles.shutterInner}>
            <Text style={styles.cameraIcon}>📸</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 4. CHAT */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigate("chat", "/chat")}
        activeOpacity={0.7}
      >
        <Text style={[styles.navIcon, activeRoute === "chat" && styles.activeIcon]}>
          💬
        </Text>
        <Text style={[styles.navLabel, activeRoute === "chat" && styles.activeLabel]}>
          Chat
        </Text>
      </TouchableOpacity>

      {/* 5. PROFILE */}
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => navigate("profile", "/profile")}
        activeOpacity={0.7}
      >
        <Text style={[styles.navIcon, activeRoute === "profile" && styles.activeIcon]}>
          👤
        </Text>
        <Text style={[styles.navLabel, activeRoute === "profile" && styles.activeLabel]}>
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: Platform.OS === "ios" ? 84 : 64,
    paddingBottom: Platform.OS === "ios" ? 22 : 8,
    backgroundColor: "rgba(10, 11, 16, 0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
  },
  navIcon: {
    fontSize: 20,
    opacity: 0.5,
    marginBottom: 2,
  },
  activeIcon: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888888",
  },
  activeLabel: {
    color: "#FFFC00",
    fontWeight: "bold",
  },
  cameraShutterItem: {
    top: -12,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255, 252, 0, 0.2)",
    borderWidth: 2,
    borderColor: "#FFFC00",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FFFC00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  shutterRingActive: {
    backgroundColor: "#FFFC00",
  },
  shutterInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#161924",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraIcon: {
    fontSize: 22,
  },
});
