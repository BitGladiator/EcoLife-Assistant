import React, { useState } from "react";
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";

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

interface ProductResult {
  sustainability_score: number;
  found_keywords: string[];
  extracted_text: string;
}

type ApiResult =
  | AdvancedWasteResult
  | SimpleWasteResult
  | ProductResult
  | { error: string };

const MenuIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 12H21M3 6H21M3 18H21"
      stroke="#065F46"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CameraIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="13" r="4" stroke="#FFFFFF" strokeWidth="2" />
  </Svg>
);

const GalleryIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 16L8.586 11.414C8.96106 11.0391 9.46967 10.8284 10 10.8284C10.5303 10.8284 11.0389 11.0391 11.414 11.414L16 16"
      stroke="#FFFFFF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      stroke="#FFFFFF"
      strokeWidth="2"
    />
  </Svg>
);

const RecycleIcon = () => (
  <Svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <Path
      d="M16 2L20 6L16 10M8 22L4 18L8 14M20 6H10C8.93913 6 7.92172 6.42143 7.17157 7.17157C6.42143 7.92172 6 8.93913 6 10V18M4 18H14C15.0609 18 16.0783 17.5786 16.8284 16.8284C17.5786 16.0783 18 15.0609 18 14V6"
      stroke="#059669"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const WarningIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3437 1.64149 19.6871 1.81442 19.9905C1.98735 20.2939 2.23673 20.5467 2.53771 20.7239C2.8387 20.901 3.18067 20.9962 3.53 21H20.47C20.8193 20.9962 21.1613 20.901 21.4623 20.7239C21.7633 20.5467 22.0127 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z"
      stroke="#D97706"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line
      x1="12"
      y1="9"
      x2="12"
      y2="13"
      stroke="#D97706"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Circle cx="12" cy="17" r="1" fill="#D97706" />
  </Svg>
);

const StarIcon = ({ filled }: { filled: boolean }) => (
  <Svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill={filled ? "#059669" : "none"}
  >
    <Path
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
      stroke="#059669"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LeafIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C12 2 3 7 3 14C3 17.866 6.582 21 12 21C17.418 21 21 17.866 21 14C21 7 12 2 12 2Z"
      stroke="#FFFFFF"
      strokeWidth="2"
    />
    <Path d="M12 2V21" stroke="#FFFFFF" strokeWidth="2" />
    <Path
      d="M12 13C15.866 13 19 10.866 19 7"
      stroke="#FFFFFF"
      strokeWidth="2"
    />
  </Svg>
);

const AnalyzeIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z"
      stroke="#059669"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CloseIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke="#065F46"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default function HomeScreen() {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"simple" | "advanced">("advanced");
  const [showModeModal, setShowModeModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

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
  const getScoreColor = (score: number | string): any => {
    if (typeof score === "string") {
      const grade = score.toUpperCase();
      const colorMap: Record<string, string> = {
        A: "#059669",
        B: "#84CC16",
        C: "#EAB308",
        D: "#F59E0B",
        E: "#DC2626",
      };
      return { color: colorMap[grade] || "#6B7280" };
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
      const endpoint =
        mode === "advanced"
          ? "/classify-waste/advanced"
          : "/classify-waste/simple";

      const response = await axios.post(
        `${API_BASE}${endpoint}`,
        {
          image: base64Image,
        },
        {
          timeout: 15000,
          headers: { "Content-Type": "application/json" },
        }
      );

      setResult(response.data);
    } catch (error: any) {
      console.error("Classification error:", error);
      setResult({
        error:
          error.response?.data?.error ||
          "Connection failed. Check if backend is running.",
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeProduct = async (base64Image?: string) => {
    setLoading(true);
    setResult(null);

    try {
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

      const response = await axios.post(
        `${API_BASE}/analyze-product`,
        {
          image: imageToSend,
        },
        {
          timeout: 20000,
          headers: { "Content-Type": "application/json" },
        }
      );

      setResult(response.data);
    } catch (error: any) {
      console.error("Product analysis error:", error);
      setResult({
        error:
          error.response?.data?.error ||
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
    <View style={styles.container}>
      <StatusBar backgroundColor="#065F46" barStyle="light-content" />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowSidebar(true)}
        >
          <MenuIcon />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <LeafIcon />
          <Text style={styles.topBarTitle}>EcoLife</Text>
        </View>

        <View style={styles.placeholder} />
      </View>

      <Modal
        visible={showSidebar}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSidebar(false)}
      >
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebarContent}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setShowSidebar(false)}>
                <CloseIcon />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.sidebarItem}>
              <Text style={styles.sidebarItemText}>Waste Classification</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => analyzeProduct()}
            >
              <Text style={styles.secondaryButtonText}>Scan Product</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem}>
              <Text style={styles.sidebarItemText}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem}>
              <Text style={styles.sidebarItemText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem}>
              <Text style={styles.sidebarItemText}>About</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>Advanced Waste Intelligence</Text>

          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => setShowModeModal(true)}
          >
            <Text style={styles.modeButtonText}>
              {mode === "advanced"
                ? "Advanced Analysis"
                : "Simple Classification"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <RecycleIcon />
            <Text style={styles.cardTitle}>Waste Classification</Text>
          </View>
          <Text style={styles.cardDescription}>
            {mode === "advanced"
              ? "Get detailed analysis with 9 waste categories, disposal instructions, and environmental guidance"
              : "Quick classification into recyclable, organic, or landfill categories"}
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={takePicture}
            >
              <CameraIcon />
              <Text style={styles.buttonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={pickImage}>
              <GalleryIcon />
              <Text style={styles.buttonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AnalyzeIcon />
            <Text style={styles.cardTitle}>Product Analysis</Text>
          </View>
          <Text style={styles.cardDescription}>
            Analyze product sustainability and environmental impact metrics
          </Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => analyzeProduct()}
          >
            <Text style={styles.secondaryButtonText}>Scan Product</Text>
          </TouchableOpacity>
        </View>

        {selectedImage && (
          <View style={styles.imagePreview}>
            <Text style={styles.previewTitle}>Selected Image</Text>
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
            />
          </View>
        )}

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>
              {mode === "advanced"
                ? "Running advanced analysis..."
                : "Processing image..."}
            </Text>
          </View>
        )}

        {result && !loading && (
          <View style={styles.resultCard}>
            {"error" in result ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Analysis Error</Text>
                <Text style={styles.errorDetail}>{result.error}</Text>
                <Text style={styles.errorHint}>
                  Ensure your backend server is running on {API_BASE}
                </Text>
              </View>
            ) : (
              <>
                {isAdvancedResult(result) && (
                  <>
                    <View style={styles.resultHeader}>
                      <RecycleIcon />
                      <View style={styles.resultHeaderText}>
                        <Text style={styles.resultTitle}>
                          {result.category_name}
                        </Text>
                        <Text
                          style={[
                            styles.resultType,
                            { color: getWasteColor(result.waste_type) },
                          ]}
                        >
                          {formatWasteType(result.waste_type)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.confidenceBar}>
                      <Text style={styles.confidenceLabel}>
                        Confidence Level
                      </Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${result.confidence * 100}%`,
                              backgroundColor: getWasteColor(result.waste_type),
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.confidenceValue}>
                        {Math.round(result.confidence * 100)}%
                      </Text>
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Recycling Code</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {result.recycling_code}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        Disposal Instructions
                      </Text>
                      <Text style={styles.sectionContent}>
                        {result.disposal_instructions}
                      </Text>
                    </View>

                    {result.subcategories.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Subcategories</Text>
                        <View style={styles.chipContainer}>
                          {result.subcategories.map((sub, idx) => (
                            <View key={idx} style={styles.chip}>
                              <Text style={styles.chipText}>
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
                          <Text style={styles.sectionTitle}>
                            Contamination Warnings
                          </Text>
                        </View>
                        {result.contamination_warnings.map((warning, idx) => (
                          <Text key={idx} style={styles.warningText}>
                            • {formatWasteType(warning)}
                          </Text>
                        ))}
                      </View>
                    )}

                    {result.tips.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          Environmental Tips
                        </Text>
                        {result.tips.slice(0, 3).map((tip, idx) => (
                          <Text key={idx} style={styles.tipText}>
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
                      <Text style={styles.resultTitle}>
                        Classification Result
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.simpleResult,
                        { borderColor: getWasteColor(result.waste_type) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.simpleResultText,
                          { color: getWasteColor(result.waste_type) },
                        ]}
                      >
                        {formatWasteType(result.waste_type)}
                      </Text>
                      <Text style={styles.confidenceText}>
                        {Math.round(result.confidence * 100)}% confidence
                      </Text>
                    </View>

                    {result.tips.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Guidance</Text>
                        {result.tips.map((tip, idx) => (
                          <Text key={idx} style={styles.tipText}>
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
                        <Text style={styles.resultTitle}>
                          Product Sustainability Analysis
                        </Text>
                        <Text style={styles.analysisMethod}>
                          {result.barcode_detected
                            ? "✓ Barcode Detected"
                            : "OCR Analysis"}
                        </Text>
                      </View>
                    </View>

                    {/* Product Details (if barcode detected) */}
                    {result.product_details && (
                      <View style={styles.productDetailsSection}>
                        <Text style={styles.sectionTitle}>
                          Product Information
                        </Text>
                        <View style={styles.productInfo}>
                          <Text style={styles.productName}>
                            {result.product_details.name}
                          </Text>
                          <Text style={styles.productBrand}>
                            {result.product_details.brand}
                          </Text>

                          {result.product_details.categories && (
                            <Text style={styles.productCategories}>
                              {result.product_details.categories}
                            </Text>
                          )}
                        </View>

                        {/* Scores */}
                        <View style={styles.scoresRow}>
                          {result.product_details.nutriscore !== "N/A" && (
                            <View style={styles.scoreChip}>
                              <Text style={styles.scoreLabel}>Nutri-Score</Text>
                              <Text
                                style={[
                                  styles.scoreGrade,
                                  getScoreColor(
                                    result.product_details.nutriscore
                                  ),
                                ]}
                              >
                                {result.product_details.nutriscore.toUpperCase()}
                              </Text>
                            </View>
                          )}

                          {result.product_details.ecoscore !== "N/A" && (
                            <View style={styles.scoreChip}>
                              <Text style={styles.scoreLabel}>Eco-Score</Text>
                              <Text
                                style={[
                                  styles.scoreGrade,
                                  getScoreColor(
                                    result.product_details.ecoscore
                                  ),
                                ]}
                              >
                                {result.product_details.ecoscore.toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Sustainability Score */}
                    <View style={styles.scoreSection}>
                      <Text style={styles.scoreLabel}>
                        Environmental Impact Score
                      </Text>
                      <View style={styles.scoreDisplay}>
                        <Text style={styles.scoreValue}>
                          {result.sustainability_score.toFixed(1)}
                        </Text>
                        <Text style={styles.scoreMax}>/10</Text>
                      </View>

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

                      <Text style={styles.confidenceText}>
                        {Math.round(result.confidence * 100)}% confidence
                      </Text>
                    </View>

                    {/* Packaging Analysis */}
                    {result.packaging_analysis && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          Packaging Analysis
                        </Text>
                        <View style={styles.chipContainer}>
                          {result.packaging_analysis.materials.map(
                            (material, idx) => (
                              <View key={idx} style={styles.chip}>
                                <Text style={styles.chipText}>{material}</Text>
                              </View>
                            )
                          )}
                        </View>
                        <Text style={styles.packagingScore}>
                          Packaging Score:{" "}
                          {result.packaging_analysis.packaging_score.toFixed(1)}
                          /10
                        </Text>
                      </View>
                    )}

                    {/* Keywords Found */}
                    {result.found_keywords.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          Sustainability Keywords
                        </Text>
                        <View style={styles.chipContainer}>
                          {result.found_keywords.map((kw, idx) => (
                            <View key={idx} style={styles.keywordChip}>
                              <Text style={styles.chipText}>{kw}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {result.recommendations.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recommendations</Text>
                        {result.recommendations.map((rec, idx) => (
                          <View key={idx} style={styles.recommendationItem}>
                            <Text style={styles.recommendationText}>
                              • {rec}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {result.extracted_text &&
                      result.extracted_text !== "No text detected" && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>Detected Text</Text>
                          <Text style={styles.extractedText}>
                            {result.extracted_text}
                          </Text>
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
          animationType="slide"
          onRequestClose={() => setShowModeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Analysis Mode</Text>

              <TouchableOpacity
                style={[
                  styles.modeOption,
                  mode === "advanced" && styles.modeOptionSelected,
                ]}
                onPress={() => {
                  setMode("advanced");
                  setShowModeModal(false);
                }}
              >
                <Text style={styles.modeOptionTitle}>Advanced Analysis</Text>
                <Text style={styles.modeOptionDesc}>
                  Detailed classification with 9 waste categories, disposal
                  instructions, recycling codes, and environmental guidance
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeOption,
                  mode === "simple" && styles.modeOptionSelected,
                ]}
                onPress={() => {
                  setMode("simple");
                  setShowModeModal(false);
                }}
              >
                <Text style={styles.modeOptionTitle}>
                  Simple Classification
                </Text>
                <Text style={styles.modeOptionDesc}>
                  Quick three-category classification: recyclable, organic, or
                  landfill waste
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowModeModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FCF9",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#065F46",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuButton: {
    padding: 4,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  placeholder: {
    width: 24,
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sidebarContent: {
    width: "80%",
    height: "100%",
    backgroundColor: "#FFFFFF",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#064E3B",
  },
  sidebarItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 16,
    color: "#047857",
    marginBottom: 16,
    fontWeight: "500",
  },
  modeButton: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  modeButtonText: {
    color: "#065F46",
    fontWeight: "600",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#F0FDF4",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#064E3B",
  },
  cardDescription: {
    fontSize: 14,
    color: "#047857",
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#065F46",
    padding: 16,
    borderRadius: 14,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: "#ECFDF5",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButtonText: {
    color: "#065F46",
    fontWeight: "600",
    fontSize: 16,
  },
  imagePreview: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0FDF4",
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#047857",
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F0FDF4",
  },
  loadingText: {
    marginTop: 16,
    color: "#047857",
    fontSize: 16,
    fontWeight: "500",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#F0FDF4",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ECFDF5",
  },
  resultHeaderText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#064E3B",
    marginBottom: 4,
  },
  resultType: {
    fontSize: 16,
    fontWeight: "600",
  },
  confidenceBar: {
    marginBottom: 24,
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#047857",
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#064E3B",
    textAlign: "right",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#064E3B",
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  badge: {
    backgroundColor: "#065F46",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  chipText: {
    fontSize: 13,
    color: "#065F46",
    fontWeight: "500",
  },
  warningSection: {
    backgroundColor: "#FFFBEB",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#D97706",
  },
  warningSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: "#92400E",
    marginTop: 4,
    lineHeight: 20,
  },
  tipText: {
    fontSize: 14,
    color: "#374151",
    marginTop: 6,
    lineHeight: 20,
  },
  simpleResult: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#F8FCF9",
  },
  simpleResultText: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 16,
    color: "#047857",
    fontWeight: "500",
  },
  scoreSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#ECFDF5",
  },
  // scoreLabel: {
  //   fontSize: 14,
  //   color: "#047857",
  //   marginBottom: 8,
  // },
  scoreDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#065F46",
  },
  scoreMax: {
    fontSize: 24,
    color: "#047857",
    marginLeft: 4,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 22,
  },
  errorHint: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(6, 78, 59, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#064E3B",
    marginBottom: 20,
    textAlign: "center",
  },
  modeOption: {
    backgroundColor: "#F8FCF9",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#ECFDF5",
  },
  modeOptionSelected: {
    backgroundColor: "#ECFDF5",
    borderColor: "#065F46",
  },
  modeOptionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#064E3B",
    marginBottom: 8,
  },
  modeOptionDesc: {
    fontSize: 14,
    color: "#047857",
    lineHeight: 20,
  },
  modalCloseButton: {
    backgroundColor: "#F8FCF9",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ECFDF5",
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#047857",
  },
  analysisMethod: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600" as const,
  },
  productDetailsSection: {
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  productInfo: {
    marginTop: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#064E3B",
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#047857",
    marginBottom: 8,
  },
  productCategories: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic" as const,
  },
  scoresRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 12,
  },
  scoreChip: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  scoreLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "600" as const,
  },
  scoreGrade: {
    fontSize: 24,
    fontWeight: "700" as const,
  },
  packagingScore: {
    fontSize: 14,
    color: "#047857",
    marginTop: 8,
    fontWeight: "600" as const,
  },
  keywordChip: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#93C5FD",
  },
  recommendationItem: {
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  extractedText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    fontStyle: "italic" as const,
  },
});
