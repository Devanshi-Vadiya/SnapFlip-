import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";

import {
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  const [photo, setPhoto] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  const [filter, setFilter] = useState("normal");

  const [location, setLocation] = useState<string | null>(null);

  const [text, setText] = useState("");

  const cameraRef = useRef<CameraView>(null);

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
      const result =
        await cameraRef.current.takePictureAsync();

      if (result) {
        setPhoto(result.uri);
      }
    }
  };

  // =========================
  // PHOTO PREVIEW
  // =========================

  if (photo) {
    return (
      <View style={styles.container}>
        <Image
          source={{ uri: photo }}
          style={styles.preview}
        />

        <View style={styles.retakeButton}>
          <Button
            title="📷 Retake"
            onPress={() => setPhoto(null)}
          />
        </View>
      </View>
    );
  }

  // =========================
  // CAMERA SCREEN
  // =========================

  return (
    <View style={styles.container}>

      {/* LOGOUT BUTTON */}

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => router.replace("/login")}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* CAMERA */}

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      />

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

      {/* TIME FILTER */}

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

      {/* LOCATION FILTER */}

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
          FILTER BAR
          ========================= */}

      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >

          <TouchableOpacity
            onPress={() => setFilter("normal")}
          >
            <Text style={styles.filterText}>
              Normal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter("warm")}
          >
            <Text style={styles.filterText}>
              Warm
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter("cool")}
          >
            <Text style={styles.filterText}>
              Cool
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter("bw")}
          >
            <Text style={styles.filterText}>
              B&W
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter("vintage")}
          >
            <Text style={styles.filterText}>
              Vintage
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter("time")}
          >
            <Text style={styles.filterText}>
              Time
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setFilter("location");
              getLocation();
            }}
          >

            <Text style={styles.filterText}>
              Location
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter("text")}
          >
            <Text style={styles.filterText}>
              Text
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </View>

      {/* =========================
          CAMERA BUTTON
          ========================= */}

      <View style={styles.captureButton}>
        <Button
          title="📷 TAKE PICTURE"
          onPress={takePicture}
        />
      </View>

    </View>
  );
}

// =========================
// STYLES
// =========================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "black",
  },

  camera: {
    flex: 1,
  },

  preview: {
    flex: 1,
    width: "100%",
  },

  // =========================
  // FILTERS
  // =========================

  warmFilter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 180, 80, 0.25)",
  },

  coolFilter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(80, 150, 255, 0.20)",
  },

  bwFilter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },

  vintageFilter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(180, 120, 60, 0.25)",
  },

  // =========================
  // TIME
  // =========================

  timeFilter: {
    position: "absolute",
    bottom: 190,
    alignSelf: "center",
    alignItems: "center",
  },

  timeText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
  },

  dateText: {
    color: "white",
    fontSize: 18,
  },

  // =========================
  // LOCATION
  // =========================

  locationFilter: {
    position: "absolute",
    bottom: 190,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },

  locationText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },

  // =========================
  // FILTER BAR
  // =========================

  filtersContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
  },

  filters: {
    paddingHorizontal: 20,
    gap: 30,
    alignItems: "center",
  },

  filterText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },

  // =========================
  // CAMERA BUTTON
  // =========================

  captureButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
  },

  // =========================
  // LOGOUT
  // =========================

  logoutButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },

  logoutText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },

  // =========================
  // RETAKE
  // =========================

  retakeButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
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

  textFilterContainer: {
  position: "absolute",
  bottom: 190,
  left: 20,
  right: 20,
  alignItems: "center",
},

textInput: {
  color: "white",
  fontSize: 28,
  fontWeight: "bold",
  textAlign: "center",
  minWidth: 200,
  padding: 10,
},

textOverlay: {
  marginTop: 15,
  color: "white",
  fontSize: 28,
  fontWeight: "bold",
  textAlign: "center",
},

});