import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Platform,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  G,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

const API_BASE = "http://10.219.49.127:5500";

type WasteType =
  | "recyclable_paper"
  | "recyclable_plastic"
  | "recyclable_glass"
  | "recyclable_metal"
  | "organic_food"
  | "organic_yard"
  | "landfill_general"
  | "hazardous"
  | "e_waste";

interface AdvancedWasteResult {
  waste_type: WasteType;
  category_name: string;
  confidence: number;
  subcategories: string[];
  disposal_instructions: string;
  recycling_code: string;
  tips: string[];
  contamination_warnings: string[];
  mode: "advanced";
}

interface SimpleWasteResult {
  waste_type: "recyclable" | "organic" | "landfill";
  confidence: number;
  tips: string[];
  mode: "simple";
}

interface ProductResult {
  sustainability_score: number;
  confidence: number;
  barcode_detected: boolean;
  found_keywords: string[];
  extracted_text: string;
  recommendations: string[];
  analysis_method: "barcode" | "ocr";
  product_details?: {
    name: string;
    brand: string;
    categories: string;
    nutriscore: string;
    ecoscore: string;
    packaging: string;
    labels: string;
  };
  packaging_analysis?: {
    materials: string[];
    packaging_score: number;
  };
}

type ApiResult =
  | AdvancedWasteResult
  | SimpleWasteResult
  | ProductResult
  | { error: string };

const LogoIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 40 40">
    <Defs>
      <LinearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#0F766E" stopOpacity="1" />
        <Stop offset="0.5" stopColor="#10B981" stopOpacity="1" />
        <Stop offset="1" stopColor="#134E4A" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Circle cx="20" cy="20" r="17" fill="url(#logoGradient)" />
    <Path
      d="M20 12C20 12 14 16 14 21C14 25.418 17.582 29 22 29C26.418 29 30 25.418 30 21C30 16 20 12 20 12Z"
      fill="#FFFFFF"
      opacity="0.9"
    />
    <Circle cx="20" cy="20" r="5" fill="#FFFFFF" opacity="0.95" />
  </Svg>
);

const CameraIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="cameraGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#0F766E" stopOpacity="1" />
        <Stop offset="1" stopColor="#10B981" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Rect
      x="3"
      y="6"
      width="18"
      height="14"
      rx="3"
      stroke="url(#cameraGradient)"
      strokeWidth="1.8"
    />
    <Circle
      cx="12"
      cy="13"
      r="3.5"
      stroke="url(#cameraGradient)"
      strokeWidth="1.8"
    />
    <Circle cx="17" cy="10" r="1" fill="url(#cameraGradient)" />
  </Svg>
);

const GalleryIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="galleryGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#0F766E" stopOpacity="1" />
        <Stop offset="1" stopColor="#10B981" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Rect
      x="4"
      y="4"
      width="16"
      height="16"
      rx="2"
      stroke="url(#galleryGradient)"
      strokeWidth="1.8"
    />
    <Circle cx="9" cy="10" r="2" fill="url(#galleryGradient)" />
    <Path
      d="M15 15L19 19"
      stroke="url(#galleryGradient)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </Svg>
);

const RecycleIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
    <Defs>
      <LinearGradient id="recycleGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#10B981" stopOpacity="1" />
        <Stop offset="1" stopColor="#059669" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Path
      d="M11 8L16 13L11 18M21 26L16 21L21 16M27 11H16C14.343 11 12.686 11.686 11.757 12.757C10.828 13.686 10 15.343 10 17V21M16 21H27C28.657 21 30.314 20.314 31.243 19.243C32.172 18.314 33 16.657 33 15V11"
      stroke="url(#recycleGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const WarningIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Defs>
      <LinearGradient id="warningGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#F59E0B" stopOpacity="1" />
        <Stop offset="1" stopColor="#D97706" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Path
      d="M10 2L18 16H2L10 2Z"
      fill="url(#warningGradient)"
      stroke="url(#warningGradient)"
      strokeWidth="1.2"
    />
    <Circle cx="10" cy="14" r="1" fill="#FFFFFF" />
    <Line
      x1="10"
      y1="7"
      x2="10"
      y2="11"
      stroke="#FFFFFF"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </Svg>
);

const AnalyzeIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="analyzeGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#8B5CF6" stopOpacity="1" />
        <Stop offset="1" stopColor="#7C3AED" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Circle
      cx="12"
      cy="12"
      r="9"
      stroke="url(#analyzeGradient)"
      strokeWidth="1.8"
    />
    <Path
      d="M12 8V12L15 15"
      stroke="url(#analyzeGradient)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="12" r="2" fill="url(#analyzeGradient)" />
  </Svg>
);

const ProfileIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="profileGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#0F766E" stopOpacity="1" />
        <Stop offset="1" stopColor="#10B981" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Circle
      cx="12"
      cy="12"
      r="9"
      stroke="url(#profileGradient)"
      strokeWidth="1.8"
    />
    <Circle cx="12" cy="9" r="3" fill="url(#profileGradient)" />
    <Path
      d="M6 18C6 15.791 8.791 13 12 13C15.209 13 18 15.791 18 18"
      stroke="url(#profileGradient)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </Svg>
);

const HistoryIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="historyGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#0F766E" stopOpacity="1" />
        <Stop offset="1" stopColor="#10B981" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Circle
      cx="12"
      cy="12"
      r="9"
      stroke="url(#historyGradient)"
      strokeWidth="1.8"
    />
    <Path
      d="M12 8V12L14 14"
      stroke="url(#historyGradient)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 16L20 20"
      stroke="url(#historyGradient)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </Svg>
);

const SettingsIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="settingsGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#0F766E" stopOpacity="1" />
        <Stop offset="1" stopColor="#10B981" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Circle
      cx="12"
      cy="12"
      r="3"
      stroke="url(#settingsGradient)"
      strokeWidth="1.8"
    />
    <Path
      d="M19.4 15C19.5325 14.3597 19.6 13.6844 19.6 13C19.6 12.3156 19.5325 11.6403 19.4 11M4.6 11C4.46745 11.6403 4.4 12.3156 4.4 13C4.4 13.6844 4.46745 14.3597 4.6 15M16.2 16.4C16.8727 16.9172 17.6154 17.3246 18.4 17.6M5.6 17.6C6.38458 17.3246 7.12728 16.9172 7.8 16.4M7.8 9.6C7.12728 9.08279 6.38458 8.67541 5.6 8.4M18.4 8.4C17.6154 8.67541 16.8727 9.08279 16.2 9.6"
      stroke="url(#settingsGradient)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default function HomeScreen({ navigation }: any) {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"simple" | "advanced">("advanced");
  const [showModeModal, setShowModeModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 640;
  const isMediumScreen = width >= 640 && width < 1024;
  const isLargeScreen = width >= 1024;

  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        alert("Camera permission is required!");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setSelectedImage(result.assets[0].uri);
        await classifyWaste(result.assets[0].base64);
      }
    } catch (error) {
      setResult({ error: "Camera error occurred" });
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setSelectedImage(result.assets[0].uri);
        await classifyWaste(result.assets[0].base64);
      }
    } catch (error) {
      setResult({ error: "Image selection failed" });
    }
  };

  const getScoreColor = (score: number | string): string => {
    if (typeof score === "string") {
      const grade = score.toUpperCase();
      const colorMap: Record<string, string> = {
        A: "#059669",
        B: "#84CC16",
        C: "#EAB308",
        D: "#F59E0B",
        E: "#DC2626",
      };
      return colorMap[grade] || "#6B7280";
    }
    if (score >= 8) return "#059669";
    if (score >= 6) return "#84CC16";
    if (score >= 4) return "#EAB308";
    if (score >= 2) return "#F59E0B";
    return "#DC2626";
  };

  const classifyWaste = async (base64Image: string) => {
    setLoading(true);
    setResult(null);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setResult({
          error: "Please login first. No authentication token found.",
        });
        setLoading(false);
        return;
      }
      const endpoint =
        mode === "advanced"
          ? "/classify-waste/advanced"
          : "/classify-waste/simple";
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: base64Image,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Classification failed");
      }
      setResult(data);
    } catch (error: any) {
      console.error("Classification error:", error);
      setResult({
        error:
          error.message || "Connection failed. Check if backend is running.",
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeProduct = async (base64Image?: string) => {
    setLoading(true);
    setResult(null);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setResult({
          error: "Please login first. No authentication token found.",
        });
        setLoading(false);
        return;
      }
      let imageToSend = base64Image;
      if (!imageToSend) {
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          base64: true,
        });
        if (result.canceled || !result.assets[0]?.base64) {
          setLoading(false);
          return;
        }
        imageToSend = result.assets[0].base64;
        setSelectedImage(result.assets[0].uri);
      }
      const response = await fetch(`${API_BASE}/analyze-product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: imageToSend,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Product analysis failed");
      }
      setResult(data);
    } catch (error: any) {
      console.error("Product analysis error:", error);
      setResult({
        error:
          error.message ||
          "Product analysis failed. Ensure backend is running.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWasteColor = (type: string): string => {
    if (type.includes("recyclable")) return "#059669";
    if (type.includes("organic")) return "#D97706";
    if (type === "hazardous") return "#DC2626";
    if (type === "e_waste") return "#7C3AED";
    return "#4B5563";
  };

  const formatWasteType = (type: string): string => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const isAdvancedResult = (res: ApiResult): res is AdvancedWasteResult => {
    return "mode" in res && res.mode === "advanced";
  };

  const isSimpleResult = (res: ApiResult): res is SimpleWasteResult => {
    return "mode" in res && res.mode === "simple";
  };

  const isProductResult = (res: ApiResult): res is ProductResult => {
    return "sustainability_score" in res && "analysis_method" in res;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0F766E" barStyle="light-content" />
      <View style={[styles.header, isSmallScreen && styles.headerSmall]}>
        <View
          style={[
            styles.headerContent,
            isLargeScreen && styles.headerContentLarge,
          ]}
        >
          <View style={styles.logoContainer}>
            <LogoIcon />
            <View style={styles.titleContainer}>
              <Text
                style={[styles.appName, isSmallScreen && styles.appNameSmall]}
              >
                EcoVision
              </Text>
              <Text
                style={[
                  styles.appTagline,
                  isSmallScreen && styles.appTaglineSmall,
                ]}
              >
                Waste Intelligence
              </Text>
            </View>
          </View>
          {!isSmallScreen && (
            <View style={styles.navDesktop}>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => router.push("/profile")}
              >
                <ProfileIcon />
                <Text style={styles.navText}>Profile</Text>
              </TouchableOpacity>
              {/* <TouchableOpacity style={styles.navItem}>
                <HistoryIcon />
                <Text style={styles.navText}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem}>
                <SettingsIcon />
                <Text style={styles.navText}>Settings</Text>
              </TouchableOpacity> */}
            </View>
          )}
          {isSmallScreen && (
            <View style={styles.navMobile}>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => router.push("/profile")}
              >
                <ProfileIcon />
                {/* <Text style={styles.navText}>Profile</Text> */}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isSmallScreen && styles.scrollContentSmall,
          isMediumScreen && styles.scrollContentMedium,
          isLargeScreen && styles.scrollContentLarge,
        ]}
      >
        <View
          style={[styles.heroSection, isSmallScreen && styles.heroSectionSmall]}
        >
          <Text
            style={[styles.heroTitle, isSmallScreen && styles.heroTitleSmall]}
          >
            Intelligent Waste Analysis
          </Text>
          <Text
            style={[
              styles.heroSubtitle,
              isSmallScreen && styles.heroSubtitleSmall,
            ]}
          >
            Advanced AI-powered classification and sustainability insights
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.modeSelector,
            isSmallScreen && styles.modeSelectorSmall,
          ]}
          onPress={() => setShowModeModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.modeSelectorHeader}>
            <View style={styles.modeIcon}>
              {mode === "advanced" ? <RecycleIcon /> : <AnalyzeIcon />}
            </View>
            <View style={styles.modeInfo}>
              <Text
                style={[
                  styles.modeTitle,
                  isSmallScreen && styles.modeTitleSmall,
                ]}
              >
                {mode === "advanced" ? "Advanced Analysis" : "Simple Mode"}
              </Text>
              <Text
                style={[
                  styles.modeDescription,
                  isSmallScreen && styles.modeDescriptionSmall,
                ]}
              >
                {mode === "advanced"
                  ? "Detailed classification with 9 waste categories"
                  : "Quick three-category classification"}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.modeChangeText,
              isSmallScreen && styles.modeChangeTextSmall,
            ]}
          >
            Tap to change mode
          </Text>
        </TouchableOpacity>
        <View
          style={[
            styles.featuresGrid,
            isSmallScreen && styles.featuresGridSmall,
            isMediumScreen && styles.featuresGridMedium,
          ]}
        >
          <View
            style={[
              styles.featureCard,
              isSmallScreen && styles.featureCardSmall,
              isLargeScreen && styles.featureCardLarge,
            ]}
          >
            <View style={styles.featureIconContainer}>
              <CameraIcon />
            </View>
            <Text
              style={[
                styles.featureTitle,
                isSmallScreen && styles.featureTitleSmall,
              ]}
            >
              Waste Classification
            </Text>
            <Text
              style={[
                styles.featureDescription,
                isSmallScreen && styles.featureDescriptionSmall,
              ]}
            >
              Identify and categorize waste with precision
            </Text>
            <View
              style={[
                styles.featureActions,
                isSmallScreen && styles.featureActionsSmall,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.featureButton,
                  isSmallScreen && styles.featureButtonSmall,
                ]}
                onPress={takePicture}
              >
                <CameraIcon />
                <Text style={styles.featureButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.featureButton,
                  isSmallScreen && styles.featureButtonSmall,
                ]}
                onPress={pickImage}
              >
                <GalleryIcon />
                <Text style={styles.featureButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View
            style={[
              styles.featureCard,
              isSmallScreen && styles.featureCardSmall,
              isLargeScreen && styles.featureCardLarge,
            ]}
          >
            <View style={styles.featureIconContainer}>
              <AnalyzeIcon />
            </View>
            <Text
              style={[
                styles.featureTitle,
                isSmallScreen && styles.featureTitleSmall,
              ]}
            >
              Product Analysis
            </Text>
            <Text
              style={[
                styles.featureDescription,
                isSmallScreen && styles.featureDescriptionSmall,
              ]}
            >
              Assess product sustainability and environmental impact
            </Text>
            <TouchableOpacity
              style={[
                styles.productAnalysisButton,
                isSmallScreen && styles.productAnalysisButtonSmall,
              ]}
              onPress={() => analyzeProduct()}
            >
              <AnalyzeIcon />
              <Text style={styles.productAnalysisButtonText}>Scan Product</Text>
            </TouchableOpacity>
          </View>
        </View>
        {selectedImage && (
          <View
            style={[
              styles.imagePreviewCard,
              isSmallScreen && styles.imagePreviewCardSmall,
            ]}
          >
            <Text
              style={[
                styles.previewTitle,
                isSmallScreen && styles.previewTitleSmall,
              ]}
            >
              Selected Image
            </Text>
            <Image
              source={{ uri: selectedImage }}
              style={[
                styles.previewImage,
                isSmallScreen && styles.previewImageSmall,
              ]}
              resizeMode="cover"
            />
          </View>
        )}
        {loading && (
          <View
            style={[
              styles.loadingCard,
              isSmallScreen && styles.loadingCardSmall,
            ]}
          >
            <ActivityIndicator size="large" color="#0F766E" />
            <Text
              style={[
                styles.loadingText,
                isSmallScreen && styles.loadingTextSmall,
              ]}
            >
              {mode === "advanced"
                ? "Running advanced analysis..."
                : "Processing image..."}
            </Text>
            <Text
              style={[
                styles.loadingSubtext,
                isSmallScreen && styles.loadingSubtextSmall,
              ]}
            >
              This may take a moment
            </Text>
          </View>
        )}
        {result && !loading && (
          <View
            style={[styles.resultCard, isSmallScreen && styles.resultCardSmall]}
          >
            {"error" in result ? (
              <View style={styles.errorContainer}>
                <Text
                  style={[
                    styles.errorTitle,
                    isSmallScreen && styles.errorTitleSmall,
                  ]}
                >
                  Analysis Error
                </Text>
                <Text
                  style={[
                    styles.errorDetail,
                    isSmallScreen && styles.errorDetailSmall,
                  ]}
                >
                  {result.error}
                </Text>
                <Text
                  style={[
                    styles.errorHint,
                    isSmallScreen && styles.errorHintSmall,
                  ]}
                >
                  Ensure your backend server is running
                </Text>
              </View>
            ) : (
              <>
                {isAdvancedResult(result) && (
                  <>
                    <View style={styles.resultHeader}>
                      <RecycleIcon />
                      <View style={styles.resultHeaderText}>
                        <Text
                          style={[
                            styles.resultTitle,
                            isSmallScreen && styles.resultTitleSmall,
                          ]}
                        >
                          {result.category_name}
                        </Text>
                        <Text
                          style={[
                            styles.resultType,
                            isSmallScreen && styles.resultTypeSmall,
                            { color: getWasteColor(result.waste_type) },
                          ]}
                        >
                          {formatWasteType(result.waste_type)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.confidenceBar}>
                      <Text
                        style={[
                          styles.confidenceLabel,
                          isSmallScreen && styles.confidenceLabelSmall,
                        ]}
                      >
                        Confidence Level
                      </Text>
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${result.confidence * 100}%`,
                                backgroundColor: getWasteColor(
                                  result.waste_type
                                ),
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.confidenceValue,
                            isSmallScreen && styles.confidenceValueSmall,
                          ]}
                        >
                          {Math.round(result.confidence * 100)}%
                        </Text>
                      </View>
                    </View>
                    <View style={styles.section}>
                      <Text
                        style={[
                          styles.sectionTitle,
                          isSmallScreen && styles.sectionTitleSmall,
                        ]}
                      >
                        Recycling Code
                      </Text>
                      <View style={styles.badge}>
                        <Text
                          style={[
                            styles.badgeText,
                            isSmallScreen && styles.badgeTextSmall,
                          ]}
                        >
                          {result.recycling_code}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.section}>
                      <Text
                        style={[
                          styles.sectionTitle,
                          isSmallScreen && styles.sectionTitleSmall,
                        ]}
                      >
                        Disposal Instructions
                      </Text>
                      <Text
                        style={[
                          styles.sectionContent,
                          isSmallScreen && styles.sectionContentSmall,
                        ]}
                      >
                        {result.disposal_instructions}
                      </Text>
                    </View>
                    {result.subcategories.length > 0 && (
                      <View style={styles.section}>
                        <Text
                          style={[
                            styles.sectionTitle,
                            isSmallScreen && styles.sectionTitleSmall,
                          ]}
                        >
                          Subcategories
                        </Text>
                        <View style={styles.chipContainer}>
                          {result.subcategories.map((sub, idx) => (
                            <View key={idx} style={styles.chip}>
                              <Text
                                style={[
                                  styles.chipText,
                                  isSmallScreen && styles.chipTextSmall,
                                ]}
                              >
                                {formatWasteType(sub)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    {result.contamination_warnings.length > 0 && (
                      <View style={[styles.section, styles.warningSection]}>
                        <View style={styles.warningSectionHeader}>
                          <WarningIcon />
                          <Text
                            style={[
                              styles.sectionTitle,
                              isSmallScreen && styles.sectionTitleSmall,
                            ]}
                          >
                            Contamination Warnings
                          </Text>
                        </View>
                        {result.contamination_warnings.map((warning, idx) => (
                          <Text
                            key={idx}
                            style={[
                              styles.warningText,
                              isSmallScreen && styles.warningTextSmall,
                            ]}
                          >
                            • {warning}
                          </Text>
                        ))}
                      </View>
                    )}
                    {result.tips?.length > 0 && (
                      <View style={styles.section}>
                        <Text
                          style={[
                            styles.sectionTitle,
                            isSmallScreen && styles.sectionTitleSmall,
                          ]}
                        >
                          Environmental Tips
                        </Text>
                        {result.tips.slice(0, 3).map((tip, idx) => (
                          <Text
                            key={idx}
                            style={[
                              styles.tipText,
                              isSmallScreen && styles.tipTextSmall,
                            ]}
                          >
                            • {tip}
                          </Text>
                        ))}
                      </View>
                    )}
                  </>
                )}
                {isSimpleResult(result) && (
                  <>
                    <View style={styles.resultHeader}>
                      <Text
                        style={[
                          styles.resultTitle,
                          isSmallScreen && styles.resultTitleSmall,
                        ]}
                      >
                        Classification Result
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.simpleResult,
                        isSmallScreen && styles.simpleResultSmall,
                        { borderColor: getWasteColor(result.waste_type) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.simpleResultText,
                          isSmallScreen && styles.simpleResultTextSmall,
                          { color: getWasteColor(result.waste_type) },
                        ]}
                      >
                        {formatWasteType(result.waste_type)}
                      </Text>
                      <Text
                        style={[
                          styles.confidenceText,
                          isSmallScreen && styles.confidenceTextSmall,
                        ]}
                      >
                        {Math.round(result.confidence * 100)}% confidence
                      </Text>
                    </View>
                    {result.tips?.length > 0 && (
                      <View style={styles.section}>
                        <Text
                          style={[
                            styles.sectionTitle,
                            isSmallScreen && styles.sectionTitleSmall,
                          ]}
                        >
                          Guidance
                        </Text>
                        {result.tips.map((tip, idx) => (
                          <Text
                            key={idx}
                            style={[
                              styles.tipText,
                              isSmallScreen && styles.tipTextSmall,
                            ]}
                          >
                            • {tip}
                          </Text>
                        ))}
                      </View>
                    )}
                  </>
                )}
                {isProductResult(result) && (
                  <>
                    <View style={styles.resultHeader}>
                      <AnalyzeIcon />
                      <View style={styles.resultHeaderText}>
                        <Text
                          style={[
                            styles.resultTitle,
                            isSmallScreen && styles.resultTitleSmall,
                          ]}
                        >
                          Product Sustainability Analysis
                        </Text>
                        <Text
                          style={[
                            styles.analysisMethod,
                            isSmallScreen && styles.analysisMethodSmall,
                          ]}
                        >
                          {result.barcode_detected
                            ? "Barcode Detected"
                            : "OCR Analysis"}
                        </Text>
                      </View>
                    </View>
                    {result.product_details && (
                      <View style={styles.productDetailsSection}>
                        <Text
                          style={[
                            styles.sectionTitle,
                            isSmallScreen && styles.sectionTitleSmall,
                          ]}
                        >
                          Product Information
                        </Text>
                        <View style={styles.productInfo}>
                          <Text
                            style={[
                              styles.productName,
                              isSmallScreen && styles.productNameSmall,
                            ]}
                          >
                            {result.product_details.name}
                          </Text>
                          <Text
                            style={[
                              styles.productBrand,
                              isSmallScreen && styles.productBrandSmall,
                            ]}
                          >
                            {result.product_details.brand}
                          </Text>
                          {result.product_details.categories && (
                            <Text
                              style={[
                                styles.productCategories,
                                isSmallScreen && styles.productCategoriesSmall,
                              ]}
                            >
                              {result.product_details.categories}
                            </Text>
                          )}
                        </View>
                        <View style={styles.scoresRow}>
                          {result.product_details.nutriscore !== "N/A" && (
                            <View style={styles.scoreChip}>
                              <Text
                                style={[
                                  styles.scoreLabel,
                                  isSmallScreen && styles.scoreLabelSmall,
                                ]}
                              >
                                Nutri-Score
                              </Text>
                              <Text
                                style={[
                                  styles.scoreGrade,
                                  isSmallScreen && styles.scoreGradeSmall,
                                  {
                                    color: getScoreColor(
                                      result.product_details.nutriscore
                                    ),
                                  },
                                ]}
                              >
                                {result.product_details.nutriscore.toUpperCase()}
                              </Text>
                            </View>
                          )}
                          {result.product_details.ecoscore !== "N/A" && (
                            <View style={styles.scoreChip}>
                              <Text
                                style={[
                                  styles.scoreLabel,
                                  isSmallScreen && styles.scoreLabelSmall,
                                ]}
                              >
                                Eco-Score
                              </Text>
                              <Text
                                style={[
                                  styles.scoreGrade,
                                  isSmallScreen && styles.scoreGradeSmall,
                                  {
                                    color: getScoreColor(
                                      result.product_details.ecoscore
                                    ),
                                  },
                                ]}
                              >
                                {result.product_details.ecoscore.toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                    <View style={styles.scoreSection}>
                      <Text
                        style={[
                          styles.scoreLabel,
                          isSmallScreen && styles.scoreLabelSmall,
                        ]}
                      >
                        Environmental Impact Score
                      </Text>
                      <View style={styles.scoreDisplay}>
                        <Text
                          style={[
                            styles.scoreValue,
                            isSmallScreen && styles.scoreValueSmall,
                          ]}
                        >
                          {result.sustainability_score.toFixed(1)}
                        </Text>
                        <Text
                          style={[
                            styles.scoreMax,
                            isSmallScreen && styles.scoreMaxSmall,
                          ]}
                        >
                          /10
                        </Text>
                      </View>
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${
                                  (result.sustainability_score / 10) * 100
                                }%`,
                                backgroundColor: getScoreColor(
                                  result.sustainability_score
                                ),
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.confidenceText,
                          isSmallScreen && styles.confidenceTextSmall,
                        ]}
                      >
                        {Math.round(result.confidence * 100)}% confidence
                      </Text>
                    </View>
                    {result.packaging_analysis && (
                      <View style={styles.section}>
                        <Text
                          style={[
                            styles.sectionTitle,
                            isSmallScreen && styles.sectionTitleSmall,
                          ]}
                        >
                          Packaging Analysis
                        </Text>
                        <View style={styles.chipContainer}>
                          {result.packaging_analysis.materials.map(
                            (material, idx) => (
                              <View key={idx} style={styles.chip}>
                                <Text
                                  style={[
                                    styles.chipText,
                                    isSmallScreen && styles.chipTextSmall,
                                  ]}
                                >
                                  {material}
                                </Text>
                              </View>
                            )
                          )}
                        </View>
                        <Text
                          style={[
                            styles.packagingScore,
                            isSmallScreen && styles.packagingScoreSmall,
                          ]}
                        >
                          Packaging Score:{" "}
                          {result.packaging_analysis.packaging_score.toFixed(1)}
                          /10
                        </Text>
                      </View>
                    )}
                    {result.found_keywords.length > 0 && (
                      <View style={styles.section}>
                        <Text
                          style={[
                            styles.sectionTitle,
                            isSmallScreen && styles.sectionTitleSmall,
                          ]}
                        >
                          Sustainability Keywords
                        </Text>
                        <View style={styles.chipContainer}>
                          {result.found_keywords.map((kw, idx) => (
                            <View key={idx} style={styles.keywordChip}>
                              <Text
                                style={[
                                  styles.chipText,
                                  isSmallScreen && styles.chipTextSmall,
                                ]}
                              >
                                {kw}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                    {result.recommendations.length > 0 && (
                      <View style={styles.section}>
                        <Text
                          style={[
                            styles.sectionTitle,
                            isSmallScreen && styles.sectionTitleSmall,
                          ]}
                        >
                          Recommendations
                        </Text>
                        {result.recommendations.map((rec, idx) => (
                          <View key={idx} style={styles.recommendationItem}>
                            <Text
                              style={[
                                styles.recommendationText,
                                isSmallScreen && styles.recommendationTextSmall,
                              ]}
                            >
                              • {rec}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </>
            )}
          </View>
        )}
        <Modal
          visible={showModeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModeModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModeModal(false)}
          >
            <View
              style={[
                styles.modalContent,
                isSmallScreen && styles.modalContentSmall,
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,
                  isSmallScreen && styles.modalTitleSmall,
                ]}
              >
                Select Analysis Mode
              </Text>
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  isSmallScreen && styles.modeOptionSmall,
                  mode === "advanced" && styles.modeOptionSelected,
                ]}
                onPress={() => {
                  setMode("advanced");
                  setShowModeModal(false);
                }}
              >
                <View style={styles.modeOptionIcon}>
                  <RecycleIcon />
                </View>
                <View style={styles.modeOptionContent}>
                  <Text
                    style={[
                      styles.modeOptionTitle,
                      isSmallScreen && styles.modeOptionTitleSmall,
                    ]}
                  >
                    Advanced Analysis
                  </Text>
                  <Text
                    style={[
                      styles.modeOptionDesc,
                      isSmallScreen && styles.modeOptionDescSmall,
                    ]}
                  >
                    Detailed classification with 9 waste categories, disposal
                    instructions, and environmental guidance
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  isSmallScreen && styles.modeOptionSmall,
                  mode === "simple" && styles.modeOptionSelected,
                ]}
                onPress={() => {
                  setMode("simple");
                  setShowModeModal(false);
                }}
              >
                <View style={styles.modeOptionIcon}>
                  <AnalyzeIcon />
                </View>
                <View style={styles.modeOptionContent}>
                  <Text
                    style={[
                      styles.modeOptionTitle,
                      isSmallScreen && styles.modeOptionTitleSmall,
                    ]}
                  >
                    Simple Mode
                  </Text>
                  <Text
                    style={[
                      styles.modeOptionDesc,
                      isSmallScreen && styles.modeOptionDescSmall,
                    ]}
                  >
                    Quick three-category classification: recyclable, organic, or
                    landfill waste
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  header: {
    backgroundColor: "#0F766E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    paddingTop: Platform.OS === "ios" ? 40 : 20,
    paddingBottom: 20,
  },
  headerSmall: {
    paddingTop: Platform.OS === "ios" ? 30 : 15,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  headerContentLarge: {
    paddingHorizontal: 32,
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleContainer: {
    flexDirection: "column",
  },
  appName: {
    fontWeight: "700",
    color: "#FFFFFF",
    fontSize: 24,
  },
  appNameSmall: {
    fontSize: 20,
  },
  appTagline: {
    color: "#D1FAE5",
    fontWeight: "400",
    fontSize: 14,
  },
  appTaglineSmall: {
    fontSize: 12,
  },
  navDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  navMobile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  navIconButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentSmall: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  scrollContentMedium: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  scrollContentLarge: {
    paddingHorizontal: 32,
    paddingVertical: 32,
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  heroSection: {
    marginBottom: 32,
  },
  heroSectionSmall: {
    marginBottom: 24,
  },
  heroTitle: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 40,
    marginBottom: 12,
  },
  heroTitleSmall: {
    fontSize: 28,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "#64748B",
    fontSize: 18,
    lineHeight: 24,
  },
  heroSubtitleSmall: {
    fontSize: 16,
    lineHeight: 22,
  },
  modeSelector: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 24,
  },
  modeSelectorSmall: {
    padding: 20,
    marginBottom: 24,
  },
  modeSelectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  modeIcon: {
    marginRight: 16,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    fontWeight: "600",
    color: "#0F172A",
    fontSize: 20,
    marginBottom: 4,
  },
  modeTitleSmall: {
    fontSize: 18,
  },
  modeDescription: {
    color: "#64748B",
    fontSize: 15,
  },
  modeDescriptionSmall: {
    fontSize: 14,
  },
  modeChangeText: {
    color: "#0F766E",
    fontWeight: "500",
    textAlign: "center",
    fontSize: 14,
  },
  modeChangeTextSmall: {
    fontSize: 13,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 32,
  },
  featuresGridSmall: {
    flexDirection: "column",
    gap: 20,
  },
  featuresGridMedium: {
    flexDirection: "row",
    gap: 24,
  },
  featureCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 24,
  },
  featureCardSmall: {
    width: "100%",
    padding: 20,
  },
  featureCardLarge: {
    flex: 1,
    minWidth: 300,
  },
  featureIconContainer: {
    marginBottom: 16,
  },
  featureTitle: {
    fontWeight: "600",
    color: "#0F172A",
    fontSize: 20,
    marginBottom: 8,
  },
  featureTitleSmall: {
    fontSize: 18,
  },
  featureDescription: {
    color: "#64748B",
    fontSize: 15,
    marginBottom: 20,
    lineHeight: 22,
  },
  featureDescriptionSmall: {
    fontSize: 14,
    lineHeight: 20,
  },
  featureActions: {
    flexDirection: "row",
    gap: 16,
  },
  featureActionsSmall: {
    gap: 12,
  },
  featureButton: {
    flex: 1,
    backgroundColor: "#0F766E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 16,
  },
  featureButtonSmall: {
    paddingVertical: 14,
  },
  featureButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  productAnalysisButton: {
    backgroundColor: "#8B5CF6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 16,
  },
  productAnalysisButtonSmall: {
    paddingVertical: 14,
  },
  productAnalysisButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  imagePreviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 24,
  },
  imagePreviewCardSmall: {
    padding: 20,
    marginBottom: 24,
  },
  previewTitle: {
    fontWeight: "600",
    color: "#0F172A",
    fontSize: 18,
    marginBottom: 12,
  },
  previewTitleSmall: {
    fontSize: 16,
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
  },
  previewImageSmall: {
    height: 200,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 32,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 48,
  },
  loadingCardSmall: {
    padding: 40,
    marginBottom: 24,
  },
  loadingText: {
    fontWeight: "600",
    color: "#0F172A",
    fontSize: 18,
    marginTop: 24,
    marginBottom: 4,
  },
  loadingTextSmall: {
    fontSize: 16,
    marginTop: 20,
  },
  loadingSubtext: {
    color: "#64748B",
    fontSize: 15,
  },
  loadingSubtextSmall: {
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 40,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 32,
  },
  resultCardSmall: {
    padding: 20,
    marginBottom: 32,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  resultHeaderText: {
    flex: 1,
    marginLeft: 16,
  },
  resultTitle: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 28,
    marginBottom: 4,
  },
  resultTitleSmall: {
    fontSize: 20,
  },
  resultType: {
    fontWeight: "600",
    fontSize: 18,
  },
  resultTypeSmall: {
    fontSize: 16,
  },
  confidenceBar: {
    marginBottom: 24,
  },
  confidenceLabel: {
    fontWeight: "600",
    color: "#64748B",
    fontSize: 15,
    marginBottom: 12,
  },
  confidenceLabelSmall: {
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginRight: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  confidenceValue: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 18,
    width: 70,
    textAlign: "right",
  },
  confidenceValueSmall: {
    fontSize: 16,
    width: 60,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 18,
    marginBottom: 12,
  },
  sectionTitleSmall: {
    fontSize: 16,
  },
  sectionContent: {
    color: "#374151",
    fontSize: 16,
    lineHeight: 22,
  },
  sectionContentSmall: {
    fontSize: 15,
    lineHeight: 20,
  },
  badge: {
    backgroundColor: "#0F766E",
    borderRadius: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 18,
  },
  badgeTextSmall: {
    fontSize: 16,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: {
    color: "#065F46",
    fontWeight: "500",
    fontSize: 14,
  },
  chipTextSmall: {
    fontSize: 13,
  },
  warningSection: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#D97706",
    padding: 20,
  },
  warningSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  warningText: {
    color: "#92400E",
    fontSize: 15,
    lineHeight: 20,
    marginTop: 6,
  },
  warningTextSmall: {
    fontSize: 14,
    marginTop: 4,
  },
  tipText: {
    color: "#374151",
    fontSize: 15,
    lineHeight: 20,
    marginTop: 8,
  },
  tipTextSmall: {
    fontSize: 14,
    marginTop: 6,
  },
  simpleResult: {
    borderRadius: 12,
    borderWidth: 3,
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#F8FAFC",
    padding: 40,
  },
  simpleResultSmall: {
    padding: 24,
  },
  simpleResultText: {
    fontWeight: "700",
    fontSize: 40,
    marginBottom: 12,
  },
  simpleResultTextSmall: {
    fontSize: 28,
  },
  confidenceText: {
    color: "#64748B",
    fontWeight: "500",
    fontSize: 18,
  },
  confidenceTextSmall: {
    fontSize: 16,
  },
  scoreSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  scoreLabel: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 15,
    marginBottom: 16,
  },
  scoreLabelSmall: {
    fontSize: 14,
  },
  scoreDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 20,
  },
  scoreValue: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 64,
  },
  scoreValueSmall: {
    fontSize: 48,
  },
  scoreMax: {
    color: "#64748B",
    fontSize: 32,
    marginLeft: 8,
  },
  scoreMaxSmall: {
    fontSize: 24,
    marginLeft: 4,
  },
  analysisMethod: {
    color: "#8B5CF6",
    fontWeight: "600",
    fontSize: 14,
    marginTop: 4,
  },
  analysisMethodSmall: {
    fontSize: 13,
  },
  productDetailsSection: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 24,
  },
  productInfo: {
    marginBottom: 16,
  },
  productName: {
    fontWeight: "700",
    color: "#064E3B",
    fontSize: 22,
    marginBottom: 4,
  },
  productNameSmall: {
    fontSize: 18,
  },
  productBrand: {
    fontWeight: "600",
    color: "#047857",
    fontSize: 16,
    marginBottom: 8,
  },
  productBrandSmall: {
    fontSize: 14,
  },
  productCategories: {
    color: "#6B7280",
    fontStyle: "italic",
    fontSize: 14,
  },
  productCategoriesSmall: {
    fontSize: 12,
  },
  scoresRow: {
    flexDirection: "row",
    gap: 12,
  },
  scoreChip: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  scoreGrade: {
    fontWeight: "700",
    fontSize: 28,
  },
  scoreGradeSmall: {
    fontSize: 24,
  },
  packagingScore: {
    color: "#047857",
    fontWeight: "600",
    fontSize: 15,
    marginTop: 12,
  },
  packagingScoreSmall: {
    fontSize: 14,
  },
  keywordChip: {
    backgroundColor: "#DBEAFE",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#93C5FD",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recommendationItem: {
    marginBottom: 8,
  },
  recommendationText: {
    color: "#374151",
    fontSize: 15,
    lineHeight: 20,
  },
  recommendationTextSmall: {
    fontSize: 14,
  },
  errorContainer: {
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontWeight: "700",
    color: "#DC2626",
    fontSize: 24,
    marginBottom: 12,
  },
  errorTitleSmall: {
    fontSize: 20,
  },
  errorDetail: {
    color: "#6B7280",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 22,
  },
  errorDetailSmall: {
    fontSize: 16,
  },
  errorHint: {
    color: "#9CA3AF",
    fontSize: 15,
    textAlign: "center",
  },
  errorHintSmall: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    padding: 32,
    width: 500,
  },
  modalContentSmall: {
    padding: 24,
    width: "90%",
    margin: 20,
  },
  modalTitle: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 24,
    textAlign: "center",
    marginBottom: 32,
  },
  modalTitleSmall: {
    fontSize: 20,
    marginBottom: 24,
  },
  modeOption: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#F1F5F9",
    padding: 24,
  },
  modeOptionSmall: {
    padding: 20,
  },
  modeOptionSelected: {
    backgroundColor: "#F0FDF4",
    borderColor: "#0F766E",
  },
  modeOptionIcon: {
    marginRight: 16,
  },
  modeOptionContent: {
    flex: 1,
  },
  modeOptionTitle: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 20,
    marginBottom: 8,
  },
  modeOptionTitleSmall: {
    fontSize: 18,
  },
  modeOptionDesc: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 20,
  },
  modeOptionDescSmall: {
    fontSize: 14,
  },
});
