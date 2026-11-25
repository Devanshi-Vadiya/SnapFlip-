import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { API_URL } from "../api/api";
import { saveAuthSession } from "../api/authStorage";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      alert("Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.token && data.user) {
        await saveAuthSession(data.token, data.user);
        router.replace("/camera");
      } else {
        alert(data.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("LOGIN FETCH ERROR:", error);
      alert("Could not connect to server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* LOGO & BRANDING */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>📸</Text>
          </View>
          <Text style={styles.brandTitle}>SnapFlip</Text>
          <Text style={styles.brandTagline}>Capture. Filter. Share the moment.</Text>
        </View>

        {/* LOGIN FORM CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>

          {/* EMAIL INPUT */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor="#666874"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* PASSWORD INPUT WITH TOGGLE */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#666874"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeText}>{showPassword ? "👁️" : "🔒"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* PRIMARY BUTTON */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* REGISTER FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to SnapFlip?</Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={styles.footerLink}> Sign Up Free</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B10",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#FFFC00",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#FFFC00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 34,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 14,
    color: "#8E92A4",
    marginTop: 6,
  },
  card: {
    backgroundColor: "#131622",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1E2234",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8E92A4",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1C2030",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#262C42",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C2030",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262C42",
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  eyeText: {
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#FFFC00",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#FFFC00",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  footerText: {
    color: "#8E92A4",
    fontSize: 14,
  },
  footerLink: {
    color: "#FFFC00",
    fontSize: 14,
    fontWeight: "bold",
  },
});
