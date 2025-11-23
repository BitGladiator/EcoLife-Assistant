import numpy as np
import cv2
from waste_categories import ADVANCED_WASTE_CATEGORIES, get_eco_tips

class AdvancedWasteClassifier:
    def __init__(self):
        self.categories = ADVANCED_WASTE_CATEGORIES
        print("Advanced Waste Classifier initialized with enhanced detection")
        
    def predict(self, image):
        try:
            image_resized = cv2.resize(image, (224, 224))
            
            features = self._extract_features(image_resized)
            
            waste_type, confidence = self._classify_by_features(features, image_resized)
            
            category_info = self.categories.get(waste_type, self.categories['landfill_general'])
            eco_tips = get_eco_tips(waste_type, confidence)
            
            return {
                'waste_type': waste_type,
                'category_name': category_info['name'],
                'confidence': round(confidence, 2),
                'subcategories': category_info['subcategories'],
                'disposal_instructions': category_info['disposal_instructions'],
                'recycling_code': category_info['recycling_code'],
                'eco_tips': eco_tips,
                'contamination_warnings': category_info['contamination_warnings']
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'waste_type': 'unknown',
                'confidence': 0.0
            }
    
    def _extract_features(self, image):
        features = {}
    
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        features['avg_hue'] = np.mean(hsv[:, :, 0])
        features['avg_saturation'] = np.mean(hsv[:, :, 1])
        features['avg_value'] = np.mean(hsv[:, :, 2])
        features['std_hue'] = np.std(hsv[:, :, 0])
        features['std_saturation'] = np.std(hsv[:, :, 1])
        features['std_value'] = np.std(hsv[:, :, 2])
        
        features['avg_l'] = np.mean(lab[:, :, 0])
        features['avg_a'] = np.mean(lab[:, :, 1])
        features['avg_b'] = np.mean(lab[:, :, 2])
        features['std_l'] = np.std(lab[:, :, 0])
        features['std_a'] = np.std(lab[:, :, 1])
        features['std_b'] = np.std(lab[:, :, 2])
        
        features['avg_blue'] = np.mean(image[:, :, 0])
        features['avg_green'] = np.mean(image[:, :, 1])
        features['avg_red'] = np.mean(image[:, :, 2])
        features['std_blue'] = np.std(image[:, :, 0])
        features['std_green'] = np.std(image[:, :, 1])
        features['std_red'] = np.std(image[:, :, 2])
        
        features['avg_brightness'] = np.mean(gray)
        features['std_brightness'] = np.std(gray)
        
        edges = cv2.Canny(gray, 50, 150)
        features['edge_density'] = np.sum(edges > 0) / edges.size
        
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        features['texture_sharpness'] = laplacian_var
        
        hist = cv2.calcHist([gray], [0], None, [64], [0, 256])
        hist = cv2.normalize(hist, hist).flatten()
        features['entropy'] = -np.sum(hist * np.log2(hist + 1e-10))
        
        features['blue_ratio'] = features['avg_blue'] / (features['avg_red'] + features['avg_green'] + 1e-10)
        features['green_ratio'] = features['avg_green'] / (features['avg_red'] + features['avg_blue'] + 1e-10)
        features['red_ratio'] = features['avg_red'] / (features['avg_green'] + features['avg_blue'] + 1e-10)
        
        features['color_uniformity'] = 1.0 - (features['std_red'] + features['std_green'] + features['std_blue']) / 255.0
        
        return features
    
    def _detect_shapes(self, image):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return 0, 0, 0
        
        areas = [cv2.contourArea(cnt) for cnt in contours]
        perimeters = [cv2.arcLength(cnt, True) for cnt in contours]
        
        circularities = []
        for area, perimeter in zip(areas, perimeters):
            if perimeter > 0:
                circularity = 4 * np.pi * area / (perimeter * perimeter)
                circularities.append(circularity)
        
        avg_circularity = np.mean(circularities) if circularities else 0
        shape_complexity = len(contours) / 10.0
        solidity_ratio = np.sum(areas) / (image.shape[0] * image.shape[1])
        
        return avg_circularity, shape_complexity, solidity_ratio
    
    def _detect_texture_patterns(self, image):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        glcm_features = self._calculate_glcm(gray)
        
        lbp = self._calculate_lbp(gray)
        
        return glcm_features, lbp
    
    def _calculate_glcm(self, gray):
        glcm = np.zeros((8, 8))
        h, w = gray.shape
        
        for i in range(h-1):
            for j in range(w-1):
                glcm[gray[i,j]//32, gray[i,j+1]//32] += 1
                glcm[gray[i,j]//32, gray[i+1,j]//32] += 1
        
        if np.sum(glcm) > 0:
            glcm = glcm / np.sum(glcm)
        
        contrast = 0
        homogeneity = 0
        for i in range(8):
            for j in range(8):
                contrast += glcm[i,j] * (i - j) ** 2
                homogeneity += glcm[i,j] / (1 + (i - j) ** 2)
        
        return contrast, homogeneity
    
    def _calculate_lbp(self, gray):
        h, w = gray.shape
        lbp = np.zeros_like(gray)
        
        for i in range(1, h-1):
            for j in range(1, w-1):
                center = gray[i,j]
                code = 0
                code |= (gray[i-1,j-1] > center) << 7
                code |= (gray[i-1,j] > center) << 6
                code |= (gray[i-1,j+1] > center) << 5
                code |= (gray[i,j+1] > center) << 4
                code |= (gray[i+1,j+1] > center) << 3
                code |= (gray[i+1,j] > center) << 2
                code |= (gray[i+1,j-1] > center) << 1
                code |= (gray[i,j-1] > center) << 0
                lbp[i,j] = code
        
        hist, _ = np.histogram(lbp, bins=256, range=(0, 255))
        hist = hist.astype("float")
        hist /= (hist.sum() + 1e-10)
        
        return np.std(hist)
    
    def _classify_by_features(self, f, image):
        circularity, complexity, solidity = self._detect_shapes(image)
        glcm_contrast, glcm_homogeneity = self._calculate_glcm(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY))
        lbp_std = self._calculate_lbp(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY))
        
        scores = {}
        
        paper_score = 0
        if 10 <= f['avg_hue'] <= 30 or 150 <= f['avg_hue'] <= 180:
            paper_score += 25
        if 80 <= f['avg_brightness'] <= 200:
            paper_score += 20
        if f['avg_saturation'] < 80:
            paper_score += 15
        if f['edge_density'] > 0.08:
            paper_score += 15
        if abs(f['avg_a'] - 128) < 15:
            paper_score += 10
        if f['texture_sharpness'] < 100:
            paper_score += 10
        if f['color_uniformity'] > 0.7:
            paper_score += 5
        scores['recyclable_paper'] = paper_score
        
        plastic_score = 0
        if f['avg_saturation'] > 60:
            plastic_score += 20
        if f['std_brightness'] < 40:
            plastic_score += 20
        if f['edge_density'] < 0.12:
            plastic_score += 15
        if f['avg_brightness'] > 120:
            plastic_score += 15
        if f['blue_ratio'] > 0.4 or f['red_ratio'] > 0.4:
            plastic_score += 15
        if circularity > 0.6:
            plastic_score += 10
        if f['color_uniformity'] > 0.8:
            plastic_score += 5
        scores['recyclable_plastic'] = plastic_score
        
        glass_score = 0
        if f['avg_brightness'] > 160:
            glass_score += 25
        if f['std_brightness'] > 50:
            glass_score += 25
        if f['avg_saturation'] < 40:
            glass_score += 20
        if f['edge_density'] < 0.08:
            glass_score += 15
        if f['texture_sharpness'] > 200:
            glass_score += 10
        if glcm_contrast < 0.1:
            glass_score += 5
        scores['recyclable_glass'] = glass_score
        
        metal_score = 0
        if abs(f['avg_a'] - 128) < 20 and abs(f['avg_b'] - 128) < 20:
            metal_score += 25
        if f['avg_brightness'] > 130:
            metal_score += 20
        if f['std_brightness'] > 40:
            metal_score += 20
        if f['avg_saturation'] < 60:
            metal_score += 15
        if f['texture_sharpness'] > 150:
            metal_score += 10
        if lbp_std < 0.02:
            metal_score += 10
        scores['recyclable_metal'] = metal_score
        
        food_score = 0
        if (5 <= f['avg_hue'] <= 50) or (150 <= f['avg_hue'] <= 180):
            food_score += 20
        if 50 < f['avg_saturation'] < 180:
            food_score += 20
        if 60 < f['avg_brightness'] < 190:
            food_score += 15
        if f['edge_density'] > 0.15:
            food_score += 15
        if f['std_hue'] > 20:
            food_score += 15
        if complexity > 0.3:
            food_score += 10
        if f['entropy'] > 4.0:
            food_score += 5
        scores['organic_food'] = food_score
        
        yard_score = 0
        if 35 <= f['avg_hue'] <= 90:
            yard_score += 30
        if f['green_ratio'] > 0.4:
            yard_score += 25
        if 50 < f['avg_saturation'] < 200:
            yard_score += 20
        if f['edge_density'] > 0.18:
            yard_score += 15
        if f['std_green'] > 20:
            yard_score += 10
        scores['organic_yard'] = yard_score
        
        hazardous_score = 0
        if (0 <= f['avg_hue'] <= 15) or (160 <= f['avg_hue'] <= 180):
            hazardous_score += 25
        if f['avg_saturation'] > 120:
            hazardous_score += 20
        if f['red_ratio'] > 0.4:
            hazardous_score += 20
        if f['edge_density'] > 0.2:
            hazardous_score += 15
        if f['std_red'] > 25:
            hazardous_score += 10
        if f['color_uniformity'] < 0.6:
            hazardous_score += 10
        scores['hazardous'] = hazardous_score
        
        ewaste_score = 0
        if f['avg_brightness'] < 120:
            ewaste_score += 25
        if f['avg_saturation'] < 70:
            ewaste_score += 20
        if f['edge_density'] > 0.25:
            ewaste_score += 20
        if abs(f['avg_a'] - 128) < 25:
            ewaste_score += 15
        if f['std_brightness'] > 35:
            ewaste_score += 15
        if complexity > 0.5:
            ewaste_score += 10
        if lbp_std > 0.03:
            ewaste_score += 5
        scores['e_waste'] = ewaste_score
        
        landfill_score = 0
        landfill_threshold = 65
        
        if all(score < landfill_threshold for score in scores.values()):
            landfill_score += 50
        
        if 40 < f['avg_saturation'] < 130 and 70 < f['avg_brightness'] < 170:
            landfill_score += 20
        
        if f['entropy'] < 3.0 and f['color_uniformity'] > 0.6:
            landfill_score += 15
        
        if f['texture_sharpness'] < 50:
            landfill_score += 15
        
        scores['landfill_general'] = landfill_score
        
        if not scores:
            return 'landfill_general', 0.4
        
        best_type = max(scores, key=scores.get)
        best_score = scores[best_type]
        
        max_possible_score = 100.0
        confidence = min(best_score / max_possible_score, 0.92)
        
        confidence = max(confidence, 0.4)
        
        score_difference = best_score - max([scores[k] for k in scores if k != best_type])
        confidence_boost = min(score_difference / 50.0, 0.15)
        confidence += confidence_boost
        
        confidence = max(0.4, min(0.92, confidence))
        
        return best_type, confidence
    
    def get_category_name(self, class_idx):
        category_mapping = {
            0: 'recyclable_paper',
            1: 'recyclable_plastic', 
            2: 'recyclable_glass',
            3: 'recyclable_metal',
            4: 'organic_food',
            5: 'organic_yard',
            6: 'landfill_general',
            7: 'hazardous',
            8: 'e_waste'
        }
        return category_mapping.get(class_idx, 'landfill_general')

if __name__ == "__main__":
    classifier = AdvancedWasteClassifier()
    
    print("Enhanced Waste Classifier ready for testing!")
    print("\nTest with different colored images:")
    
    test_cases = [
        ("Brown/Tan (Paper)", np.full((224, 224, 3), [139, 180, 210], dtype=np.uint8)),
        ("Blue (Plastic)", np.full((224, 224, 3), [200, 100, 50], dtype=np.uint8)),
        ("Green (Yard)", np.full((224, 224, 3), [50, 180, 50], dtype=np.uint8)),
        ("White/Clear (Glass)", np.full((224, 224, 3), [240, 240, 240], dtype=np.uint8)),
        ("Gray (Metal)", np.full((224, 224, 3), [150, 150, 150], dtype=np.uint8)),
    ]
    
    for name, test_img in test_cases:
        result = classifier.predict(test_img)
        print(f"\n{name}:")
        print(f"  Classified as: {result['waste_type']}")
        print(f"  Confidence: {result['confidence']*100:.1f}%")