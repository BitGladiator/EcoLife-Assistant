import easyocr
import cv2
import numpy as np
from pyzbar import pyzbar
import requests
import re

class ProductAnalyzer:
    def __init__(self):
        self.reader = easyocr.Reader(['en'])
        self.barcode_api_key = None
        
    def preprocess_image_for_barcode(self, image):
        """Enhanced image preprocessing for better barcode detection"""
        try:
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            # Multiple preprocessing techniques
            processed_images = []
            
            # Original grayscale
            processed_images.append(gray)
            
            # Contrast enhancement
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(gray)
            processed_images.append(enhanced)
            
            # Gaussian blur for noise reduction
            blurred = cv2.GaussianBlur(gray, (3, 3), 0)
            processed_images.append(blurred)
            
            # Sharpening
            kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
            sharpened = cv2.filter2D(gray, -1, kernel)
            processed_images.append(sharpened)
            
            # Adaptive threshold
            thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                         cv2.THRESH_BINARY, 11, 2)
            processed_images.append(thresh)
            
            return processed_images
            
        except Exception as e:
            print(f"Image preprocessing error: {e}")
            return [gray] if 'gray' in locals() else [image]
    
    def detect_and_decode_barcode(self, image):
        """Enhanced barcode detection with multiple preprocessing techniques"""
        try:
            processed_images = self.preprocess_image_for_barcode(image)
            
            all_barcodes = []
            
            for i, processed_img in enumerate(processed_images):
                try:
                    # Try different barcode detection methods
                    barcodes = pyzbar.decode(processed_img)
                    
                    for barcode in barcodes:
                        barcode_data = barcode.data.decode('utf-8')
                        barcode_type = barcode.type
                        
                        # Validate barcode format
                        if self.validate_barcode_format(barcode_data, barcode_type):
                            barcode_info = {
                                'data': barcode_data,
                                'type': barcode_type,
                                'rect': barcode.rect,
                                'preprocessing_method': i,
                                'quality_score': self.calculate_barcode_quality(barcode, processed_img)
                            }
                            all_barcodes.append(barcode_info)
                            
                except Exception as e:
                    print(f"Barcode detection attempt {i} failed: {e}")
                    continue
            
            # Remove duplicates and sort by quality
            unique_barcodes = self.remove_duplicate_barcodes(all_barcodes)
            unique_barcodes.sort(key=lambda x: x['quality_score'], reverse=True)
            
            print(f"Detected {len(unique_barcodes)} unique barcodes")
            return unique_barcodes
            
        except Exception as e:
            print(f"Barcode detection error: {e}")
            return []
    
    def validate_barcode_format(self, barcode_data, barcode_type):
        """Validate barcode format and checksum"""
        try:
            if barcode_type == 'EAN13':
                # EAN-13 should be 13 digits
                if len(barcode_data) != 13 or not barcode_data.isdigit():
                    return False
                return self.validate_ean13_checksum(barcode_data)
                
            elif barcode_type == 'UPC-A':
                # UPC-A should be 12 digits
                if len(barcode_data) != 12 or not barcode_data.isdigit():
                    return False
                return self.validate_upca_checksum(barcode_data)
                
            elif barcode_type == 'CODE128':
                # CODE128 can be alphanumeric, basic validation
                return len(barcode_data) >= 4 and len(barcode_data) <= 50
                
            elif barcode_type == 'QRCODE':
                # QR codes can contain various data
                return len(barcode_data) > 0
                
            else:
                # For other types, basic validation
                return len(barcode_data) > 0
                
        except Exception:
            return False
    
    def validate_ean13_checksum(self, barcode):
        """Validate EAN-13 checksum"""
        try:
            digits = [int(d) for d in barcode]
            checksum = 0
            for i in range(12):
                checksum += digits[i] * (3 if i % 2 == 1 else 1)
            checksum = (10 - (checksum % 10)) % 10
            return checksum == digits[12]
        except Exception:
            return False
    
    def validate_upca_checksum(self, barcode):
        """Validate UPC-A checksum"""
        try:
            digits = [int(d) for d in barcode]
            checksum = 0
            for i in range(11):
                checksum += digits[i] * (3 if i % 2 == 0 else 1)
            checksum = (10 - (checksum % 10)) % 10
            return checksum == digits[11]
        except Exception:
            return False
    
    def calculate_barcode_quality(self, barcode, image):
        """Calculate barcode quality score"""
        try:
            quality_score = 0
            
            # Score based on barcode size relative to image
            barcode_area = barcode.rect.width * barcode.rect.height
            image_area = image.shape[0] * image.shape[1]
            size_ratio = barcode_area / image_area
            
            if size_ratio > 0.1:  # Barcode takes up significant portion of image
                quality_score += 40
            elif size_ratio > 0.05:
                quality_score += 20
            elif size_ratio > 0.02:
                quality_score += 10
            
            # Score based on barcode position (center is better)
            center_x = image.shape[1] // 2
            center_y = image.shape[0] // 2
            barcode_center_x = barcode.rect.left + barcode.rect.width // 2
            barcode_center_y = barcode.rect.top + barcode.rect.height // 2
            
            distance_from_center = np.sqrt((barcode_center_x - center_x)**2 + 
                                         (barcode_center_y - center_y)**2)
            max_distance = np.sqrt(center_x**2 + center_y**2)
            
            if distance_from_center < max_distance * 0.1:
                quality_score += 30
            elif distance_from_center < max_distance * 0.3:
                quality_score += 20
            elif distance_from_center < max_distance * 0.5:
                quality_score += 10
            
            # Score based on barcode orientation (horizontal is better)
            if barcode.rect.width > barcode.rect.height * 1.5:
                quality_score += 30  # Horizontal barcode
            elif barcode.rect.height > barcode.rect.width * 1.5:
                quality_score += 10  # Vertical barcode
            else:
                quality_score += 5   # Square barcode
            
            return min(100, quality_score)
            
        except Exception:
            return 50  # Default quality score
    
    def remove_duplicate_barcodes(self, barcodes):
        """Remove duplicate barcodes while keeping the highest quality one"""
        unique_barcodes = {}
        
        for barcode in barcodes:
            barcode_data = barcode['data']
            if barcode_data not in unique_barcodes:
                unique_barcodes[barcode_data] = barcode
            else:
                # Keep the higher quality barcode
                if barcode['quality_score'] > unique_barcodes[barcode_data]['quality_score']:
                    unique_barcodes[barcode_data] = barcode
        
        return list(unique_barcodes.values())
    
    def fetch_product_info_from_barcode(self, barcode):
        """Enhanced product information fetching with multiple data sources"""
        try:
            # Try Open Food Facts first
            product_info = self.fetch_from_open_food_facts(barcode)
            if product_info['found']:
                return product_info
            
            # If not found, try other sources
            product_info = self.fetch_from_barcode_lookup(barcode)
            if product_info['found']:
                return product_info
            
            return {'found': False, 'source': 'none'}
            
        except Exception as e:
            print(f"Product info fetch error: {e}")
            return {'found': False, 'error': str(e)}
    
    def fetch_from_open_food_facts(self, barcode):
        """Fetch from Open Food Facts API"""
        try:
            url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 1:
                    product = data.get('product', {})
                    return {
                        'found': True,
                        'source': 'open_food_facts',
                        'product_name': product.get('product_name', 'Unknown'),
                        'brands': product.get('brands', 'Unknown'),
                        'categories': product.get('categories', ''),
                        'ingredients_text': product.get('ingredients_text', ''),
                        'nutriscore_grade': product.get('nutriscore_grade', 'N/A'),
                        'ecoscore_grade': product.get('ecoscore_grade', 'N/A'),
                        'packaging': product.get('packaging', ''),
                        'labels': product.get('labels', ''),
                        'image_url': product.get('image_url', ''),
                        'allergens': product.get('allergens', ''),
                    }
            return {'found': False, 'source': 'open_food_facts'}
        except Exception as e:
            print(f"Open Food Facts API error: {e}")
            return {'found': False, 'source': 'open_food_facts'}
    
    def fetch_from_barcode_lookup(self, barcode):
        """Alternative barcode lookup service"""
        try:
            # Using a free barcode lookup service as fallback
            url = f"https://api.barcodelookup.com/v3/products?barcode={barcode}&formatted=y&key=demo"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('products'):
                    product = data['products'][0]
                    return {
                        'found': True,
                        'source': 'barcode_lookup',
                        'product_name': product.get('product_name', 'Unknown'),
                        'brands': product.get('brand', 'Unknown'),
                        'categories': product.get('category', ''),
                        'description': product.get('description', ''),
                    }
            return {'found': False, 'source': 'barcode_lookup'}
        except Exception as e:
            print(f"Barcode lookup API error: {e}")
            return {'found': False, 'source': 'barcode_lookup'}
    
    def extract_text(self, image):
        """Extract text from image using OCR"""
        try:
            # Preprocess image for better OCR
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            # Enhance contrast for better text recognition
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(gray)
            
            results = self.reader.readtext(enhanced)
            extracted_text = ' '.join([result[1] for result in results])
            return extracted_text
        except Exception as e:
            print(f"OCR Error: {e}")
            return ""
    
    def analyze_sustainability_from_text(self, text):
        """Analyze sustainability based on extracted text"""
        text_lower = text.lower()
        
        positive_keywords = {
            'organic': 3,
            'recyclable': 3,
            'biodegradable': 3,
            'compostable': 3,
            'sustainable': 3,
            'eco-friendly': 3,
            'natural': 2,
            'green': 2,
            'renewable': 2,
            'fair trade': 2,
            'locally sourced': 2,
            'carbon neutral': 3,
            'zero waste': 3,
            'plant-based': 2,
            'reusable': 2,
            'recycled': 2,
        }
        
        negative_keywords = {
            'plastic': -2,
            'non-recyclable': -3,
            'chemical': -1,
            'toxic': -3,
            'artificial': -1,
            'synthetic': -1,
            'petroleum': -2,
            'disposable': -2,
            'single-use': -3,
        }
        
        score = 5
        found_keywords = []
        
        for keyword, points in positive_keywords.items():
            if keyword in text_lower:
                score += points
                found_keywords.append((keyword, 'positive'))
        
        for keyword, points in negative_keywords.items():
            if keyword in text_lower:
                score += points
                found_keywords.append((keyword, 'negative'))
        
        score = max(0, min(10, score))
        
        return score, found_keywords
    
    def analyze_packaging(self, packaging_text):
        """Analyze packaging materials for sustainability"""
        packaging_lower = packaging_text.lower()
        
        packaging_scores = {
            'glass': 8,
            'aluminum': 7,
            'steel': 7,
            'cardboard': 8,
            'paper': 8,
            'plastic': 3,
            'styrofoam': 1,
            'polystyrene': 1,
            'pet': 5,
            'hdpe': 6,
            'biodegradable': 9,
            'compostable': 9,
        }
        
        scores = []
        materials_found = []
        
        for material, score in packaging_scores.items():
            if material in packaging_lower:
                scores.append(score)
                materials_found.append(material)
        
        if scores:
            avg_score = sum(scores) / len(scores)
            return avg_score, materials_found
        
        return 5, []
    
    def generate_recommendations(self, analysis_result):
        """Generate sustainability recommendations"""
        recommendations = []
        score = analysis_result.get('sustainability_score', 0)
        
        if score >= 8:
            recommendations.append("Excellent choice! This product shows strong environmental credentials.")
        elif score >= 6:
            recommendations.append("Good product with decent sustainability features.")
        elif score >= 4:
            recommendations.append("Consider looking for more eco-friendly alternatives.")
        else:
            recommendations.append("This product has significant environmental concerns.")
        
        found_keywords = analysis_result.get('found_keywords', [])
        negative_found = [kw for kw, sentiment in found_keywords if sentiment == 'negative']
        
        if 'plastic' in [kw for kw, _ in found_keywords]:
            recommendations.append("Contains plastic packaging - consider recycling or choosing alternatives.")
        
        if 'recyclable' in [kw for kw, _ in found_keywords]:
            recommendations.append("Product is recyclable - please dispose in appropriate recycling bins.")
        
        if analysis_result.get('ecoscore_grade') and analysis_result['ecoscore_grade'] != 'N/A':
            recommendations.append(f"Eco-Score: {analysis_result['ecoscore_grade'].upper()} - Check packaging for recycling instructions.")
        
        return recommendations
    
    def analyze_product(self, image):
        """Main analysis function combining barcode and OCR"""
        result = {
            'barcode_detected': False,
            'product_info': {},
            'sustainability_score': 0,
            'found_keywords': [],
            'extracted_text': '',
            'packaging_score': 0,
            'packaging_materials': [],
            'recommendations': [],
            'confidence': 0
        }
        
        print("Starting barcode detection...")
        barcodes = self.detect_and_decode_barcode(image)
        
        if barcodes:
            result['barcode_detected'] = True
            best_barcode = barcodes[0]  # Highest quality barcode
            barcode_data = best_barcode['data']
            
            print(f"Barcode detected: {barcode_data} (Type: {best_barcode['type']})")
            
            product_info = self.fetch_product_info_from_barcode(barcode_data)
            
            if product_info['found']:
                result['product_info'] = product_info
                result['confidence'] = 0.9
                
                base_score = 5
                
                nutriscore = product_info.get('nutriscore_grade', '').upper()
                nutriscore_map = {'A': 2, 'B': 1, 'C': 0, 'D': -1, 'E': -2}
                base_score += nutriscore_map.get(nutriscore, 0)
                
                ecoscore = product_info.get('ecoscore_grade', '').upper()
                ecoscore_map = {'A': 3, 'B': 2, 'C': 0, 'D': -2, 'E': -3}
                base_score += ecoscore_map.get(ecoscore, 0)
                
                packaging_score, materials = self.analyze_packaging(
                    product_info.get('packaging', '')
                )
                result['packaging_score'] = packaging_score
                result['packaging_materials'] = materials
                base_score = (base_score + packaging_score) / 2
                
                labels_text = product_info.get('labels', '') + ' ' + product_info.get('categories', '')
                text_score, keywords = self.analyze_sustainability_from_text(labels_text)
                result['found_keywords'] = keywords
                
                result['sustainability_score'] = round(
                    min(10, max(0, (base_score + text_score) / 2)), 1
                )
            else:
                result['confidence'] = 0.5
                result['sustainability_score'] = 5
        
        print("Extracting text via OCR...")
        extracted_text = self.extract_text(image)
        result['extracted_text'] = extracted_text
        
        if not result['barcode_detected'] or not result['product_info'].get('found'):
            text_score, keywords = self.analyze_sustainability_from_text(extracted_text)
            result['sustainability_score'] = text_score
            result['found_keywords'] = keywords
            result['confidence'] = 0.6 if len(extracted_text) > 20 else 0.4
        
        result['recommendations'] = self.generate_recommendations(result)
        
        print(f"Analysis complete. Sustainability score: {result['sustainability_score']}/10")
        return result


if __name__ == "__main__":
    analyzer = ProductAnalyzer()
    print("Enhanced Product Analyzer initialized!")
    print("Ready to analyze products via barcode or OCR")