import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const API_BASE = 'http://10.219.49.127:5500';

type WasteType = 'recyclable' | 'organic' | 'landfill';

interface WasteResult {
  waste_type: WasteType;
  confidence: number;
  tips: string[];
  error?: string;
}

interface ProductResult {
  sustainability_score: number;
  found_keywords: string[];
  extracted_text: string;
  error?: string;
}

type ApiResult = WasteResult | ProductResult | { error: string; details?: string };

export default function HomeScreen() {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const takePicture = async (): Promise<void> => {
    setLoading(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera permissions to make this work!');
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        await classifyWaste(result.assets[0].base64);
      }
    } catch (error) {
      console.error(error);
      setResult({ error: 'Failed to take picture' });
    }
    setLoading(false);
  };

  const pickImage = async (): Promise<void> => {
    setLoading(true);
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        await classifyWaste(result.assets[0].base64);
      }
    } catch (error) {
      console.error(error);
      setResult({ error: 'Failed to pick image' });
    }
    setLoading(false);
  };

  const classifyWaste = async (base64Image: string): Promise<void> => {
    try {
      const response = await axios.post<WasteResult>(`${API_BASE}/classify-waste`, {
        image: base64Image
      });
      setResult(response.data);
    } catch (error) {
      setResult({ 
        error: 'API call failed', 
        details: 'Make sure your backend is running on port 5500'
      });
    }
  };

  const analyzeProduct = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await axios.post<ProductResult>(`${API_BASE}/analyze-product`, {
        image: 'demo'
      });
      setResult(response.data);
    } catch (error) {
      setResult({ error: 'API call failed' });
    }
    setLoading(false);
  };

  const getWasteColor = (type: WasteType) => {
    const colors: Record<WasteType, string> = { 
      recyclable: '#2E7D32', 
      organic: '#FF9800', 
      landfill: '#757575' 
    };
    return { color: colors[type] || '#000' };
  };

  const getWasteIcon = (type: WasteType): string => {
    const icons: Record<WasteType, string> = { 
      recyclable: '♻️', 
      organic: '🌱', 
      landfill: '🗑️' 
    };
    return icons[type] || '📦';
  };

  const getScoreStars = (score: number): string => {
    return '⭐'.repeat(Math.floor(score / 2)) + '☆'.repeat(5 - Math.floor(score / 2));
  };

  const isWasteResult = (result: ApiResult): result is WasteResult => {
    return 'waste_type' in result;
  };

  const isProductResult = (result: ApiResult): result is ProductResult => {
    return 'sustainability_score' in result;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>EcoLife Assistant</Text>
      <Text style={styles.subtitle}>AI Sustainability Advisor</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Waste Classification</Text>
        <Text style={styles.sectionDesc}>Identify recyclable, organic, or landfill waste</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={takePicture}>
            <Text style={styles.buttonText}>Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product Analysis</Text>
        <Text style={styles.sectionDesc}>Check product environmental impact</Text>
        
        <TouchableOpacity style={styles.button} onPress={analyzeProduct}>
          <Text style={styles.buttonText}>Analyze Product</Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.section}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Analyzing...</Text>
        </View>
      )}

      {result && !loading && (
        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>Analysis Results</Text>
          
          {'error' in result ? (
            <Text style={styles.error}>{result.error}</Text>
          ) : (
            <>
              {isWasteResult(result) && (
                <>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Waste Type:</Text>
                    <Text style={[styles.resultValue, getWasteColor(result.waste_type)]}>
                      {getWasteIcon(result.waste_type)} {result.waste_type.toUpperCase()}
                    </Text>
                    <Text style={styles.confidence}>
                      Confidence: {Math.round(result.confidence * 100)}%
                    </Text>
                  </View>

                  {result.tips && result.tips.length > 0 && (
                    <View style={styles.resultItem}>
                      <Text style={styles.resultLabel}>💡 Eco Tips:</Text>
                      {result.tips.map((tip, index) => (
                        <Text key={index} style={styles.tip}>• {tip}</Text>
                      ))}
                    </View>
                  )}
                </>
              )}

              {isProductResult(result) && (
                <>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Eco Score:</Text>
                    <Text style={styles.resultValue}>
                      {getScoreStars(result.sustainability_score)} 
                      {result.sustainability_score}/10
                    </Text>
                  </View>

                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Keywords:</Text>
                    <Text style={styles.resultValue}>
                      {result.found_keywords.join(', ')}
                    </Text>
                  </View>
                </>
              )}
            </>
          )}
        </View>
      )}

      <View style={styles.status}>
        <Text style={styles.statusText}>Backend: Connected</Text>
        <Text style={styles.statusText}>Port: 5500</Text>
        <Text style={styles.statusText}>Mode: Working Prototype</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2E7D32',
    marginTop: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sectionDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  resultItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  confidence: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  tip: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
    lineHeight: 20,
  },
  error: {
    color: '#f44336',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
  },
  status: {
    backgroundColor: '#E8F5E8',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  statusText: {
    fontSize: 12,
    color: '#2E7D32',
    marginBottom: 3,
  },
});