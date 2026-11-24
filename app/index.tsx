import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { API_URL } from "../api/api";
import { getAuthToken, saveAuthSession, clearAuthSession } from "../api/authStorage";

export default function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const token = await getAuthToken();

        if (!token) {
          if (isMounted) router.replace("/login");
          return;
        }

        // Verify token with backend
        const response = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            await saveAuthSession(token, data.user);
          }
          if (isMounted) router.replace("/camera");
        } else {
          // Token is expired or invalid
          console.log("Token verification failed, clearing session");
          await clearAuthSession();
          if (isMounted) router.replace("/login");
        }
      } catch (error) {
        console.log("Network error checking session, falling back:", error);
        // In case of network delay/offline, if token exists allow entry to camera
        const token = await getAuthToken();
        if (token && isMounted) {
          router.replace("/camera");
        } else if (isMounted) {
          router.replace("/login");
        }
      } finally {
        if (isMounted) setChecking(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFC00" />
        <Text style={styles.loadingText}>SnapFlip</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0B10",
  },
  loadingText: {
    marginTop: 16,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
