import * as SecureStore from "expo-secure-store";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
};

const TOKEN_KEY = "token";
const USER_KEY = "user_profile";

export async function saveAuthSession(token: string, user: AuthUser) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error("Failed to save auth session:", error);
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}

export async function getStoredUser(): Promise<AuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to get stored user:", error);
    return null;
  }
}

export async function clearAuthSession() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (error) {
    console.error("Failed to clear auth session:", error);
  }
}
