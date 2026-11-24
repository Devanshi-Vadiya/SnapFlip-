import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";

export type SingleStory = {
  id: string;
  _id?: string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
  viewsCount?: number;
  hasViewed?: boolean;
};

export type UserStoryGroup = {
  userId: string;
  username: string;
  avatarUrl?: string;
  hasUnseen: boolean;
  stories: SingleStory[];
};

type Props = {
  storyGroups: UserStoryGroup[];
  currentUsername?: string;
  onSelectGroup: (group: UserStoryGroup) => void;
  onAddStory: () => void;
};

export default function StoryTray({
  storyGroups,
  currentUsername,
  onSelectGroup,
  onAddStory,
}: Props) {
  // Find if current user already has active stories
  const myGroup = storyGroups.find(
    (g) => g.username.toLowerCase() === (currentUsername || "").toLowerCase()
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ADD TO STORY ITEM */}
        <TouchableOpacity
          style={styles.storyItem}
          onPress={() => (myGroup ? onSelectGroup(myGroup) : onAddStory())}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.avatarRing,
              myGroup && (myGroup.hasUnseen ? styles.unseenRing : styles.seenRing),
            ]}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarLetter}>
                {currentUsername ? currentUsername.charAt(0).toUpperCase() : "+"}
              </Text>
            </View>
            <View style={styles.addBadge}>
              <Text style={styles.addBadgeText}>+</Text>
            </View>
          </View>
          <Text style={styles.usernameText} numberOfLines={1}>
            Your Story
          </Text>
        </TouchableOpacity>

        {/* OTHER USERS' STORIES */}
        {storyGroups
          .filter(
            (g) =>
              g.username.toLowerCase() !== (currentUsername || "").toLowerCase()
          )
          .map((group) => (
            <TouchableOpacity
              key={group.userId}
              style={styles.storyItem}
              onPress={() => onSelectGroup(group)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.avatarRing,
                  group.hasUnseen ? styles.unseenRing : styles.seenRing,
                ]}
              >
                <View style={styles.avatarInner}>
                  {group.avatarUrl ? (
                    <Image
                      source={{ uri: group.avatarUrl }}
                      style={styles.avatarImg}
                    />
                  ) : (
                    <Text style={styles.avatarLetter}>
                      {group.username.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.usernameText} numberOfLines={1}>
                {group.username}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  scrollContent: {
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 14,
  },
  storyItem: {
    alignItems: "center",
    width: 68,
  },
  avatarRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 3,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  unseenRing: {
    borderColor: "#FFFC00",
    borderWidth: 2.5,
  },
  seenRing: {
    borderColor: "#CCCCCC",
  },
  avatarInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 20,
  },
  addBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#007AFF",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  addBadgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
    lineHeight: 14,
  },
  usernameText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333333",
    marginTop: 5,
    textAlign: "center",
  },
});
