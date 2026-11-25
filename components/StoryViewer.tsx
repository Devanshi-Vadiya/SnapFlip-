import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Alert,
} from "react-native";
import { UserStoryGroup } from "./StoryTray";
import { API_URL } from "../api/api";
import { getAuthToken } from "../api/authStorage";

const { width, height } = Dimensions.get("window");
const STORY_DURATION = 5000; // 5 seconds per story

type Props = {
  visible: boolean;
  group: UserStoryGroup | null;
  currentUsername?: string;
  onClose: () => void;
  onStoryDeleted?: (storyId: string) => void;
};

export default function StoryViewer({
  visible,
  group,
  currentUsername,
  onClose,
  onStoryDeleted,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const stories = group ? group.stories : [];
  const currentStory = stories[currentIndex];
  const isMyStory =
    group &&
    currentUsername &&
    group.username.toLowerCase() === currentUsername.toLowerCase();

  // Reset index when group changes
  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
    }
  }, [visible, group]);

  // Track story view on backend
  useEffect(() => {
    if (!visible || !currentStory) return;

    const recordView = async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;

        await fetch(`${API_URL}/api/stories/${currentStory.id}/view`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("Story view error:", err);
      }
    };

    recordView();
  }, [visible, currentIndex, currentStory]);

  // Progress animation and auto-advance
  useEffect(() => {
    if (!visible || !currentStory) return;

    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });

    anim.start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    return () => anim.stop();
  }, [visible, currentIndex, currentStory]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleDeleteStory = () => {
    if (!currentStory) return;

    Alert.alert("Delete Story", "Are you sure you want to delete this story?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const token = await getAuthToken();
          if (!token) return;

          try {
            const res = await fetch(
              `${API_URL}/api/stories/${currentStory.id}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            if (res.ok) {
              if (onStoryDeleted) onStoryDeleted(currentStory.id);
              if (stories.length <= 1) {
                onClose();
              } else {
                handleNext();
              }
            } else {
              alert("Failed to delete story");
            }
          } catch (err) {
            console.error("Delete story error:", err);
            alert("Error deleting story");
          }
        },
      },
    ]);
  };

  if (!visible || !group || !currentStory) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* BACKGROUND IMAGE */}
        <Image
          source={{ uri: currentStory.imageUrl }}
          style={styles.storyImage}
          resizeMode="cover"
        />

        {/* PROGRESS BARS */}
        <View style={styles.progressContainer}>
          {stories.map((story, i) => {
            let barWidth: any = "0%";
            if (i < currentIndex) {
              barWidth = "100%";
            } else if (i === currentIndex) {
              barWidth = progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              });
            }

            return (
              <View key={story.id || i} style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: barWidth,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* TOP HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>
                {group.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.username}>{group.username}</Text>
          </View>

          <View style={styles.headerRight}>
            {isMyStory && (
              <TouchableOpacity
                onPress={handleDeleteStory}
                style={styles.deleteBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TOUCH ZONES */}
        <View style={styles.touchContainer}>
          <TouchableOpacity
            style={styles.touchLeft}
            onPress={handlePrev}
            activeOpacity={1}
          />
          <TouchableOpacity
            style={styles.touchRight}
            onPress={handleNext}
            activeOpacity={1}
          />
        </View>

        {/* BOTTOM CAPTION & STATS */}
        <View style={styles.footer}>
          {currentStory.caption ? (
            <View style={styles.captionBox}>
              <Text style={styles.captionText}>{currentStory.caption}</Text>
            </View>
          ) : null}

          {isMyStory && (
            <View style={styles.viewsContainer}>
              <Text style={styles.viewsText}>
                👁️ {currentStory.viewsCount || 0} views
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  storyImage: {
    width,
    height,
    position: "absolute",
  },
  progressContainer: {
    position: "absolute",
    top: 14,
    left: 8,
    right: 8,
    flexDirection: "row",
    gap: 4,
    zIndex: 10,
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
  },
  header: {
    position: "absolute",
    top: 30,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  username: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deleteBtn: {
    padding: 6,
  },
  deleteIcon: {
    fontSize: 18,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  touchContainer: {
    flex: 1,
    flexDirection: "row",
  },
  touchLeft: {
    width: "35%",
    height: "100%",
  },
  touchRight: {
    width: "65%",
    height: "100%",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    alignItems: "center",
    gap: 10,
  },
  captionBox: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    maxWidth: "90%",
  },
  captionText: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  viewsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  viewsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
});
