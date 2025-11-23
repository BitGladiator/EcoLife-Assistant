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
        
    def detect_and_decode_barcode(self, image):
        """Detect and decode barcodes from image"""
        try:
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            barcodes = pyzbar.decode(gray)
            
            results = []
            for barcode in barcodes:
                barcode_data = barcode.data.decode('utf-8')
                barcode_type = barcode.type
                results.append({
                    'data': barcode_data,
                    'type': barcode_type,
                    'rect': barcode.rect
                })
            
            return results
        except Exception as e:
            print(f"Barcode detection error: {e}")
            return []
    
    def fetch_product_info_from_barcode(self, barcode):
        """Fetch product information using barcode from Open Food Facts"""
        try:
            url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 1:
                    product = data.get('product', {})
                    return {
                        'found': True,
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
            return {'found': False}
        except Exception as e:
            print(f"API fetch error: {e}")
            return {'found': False}
    
    def extract_text(self, image):
        """Extract text from image using OCR"""
        try:
            results = self.reader.readtext(image)
            extracted_text = ' '.join([result[1] for result in results])
            return extracted_text
        except Exception as e:
            print(f"OCR Error: {e}")
            return ""
    
    def analyze_sustainability_from_text(self, text):
        """Analyze sustainability based on extracted text"""
        text_lower = text.lower()
        
        # Enhanced keyword analysis
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
        
        return 5, []  # Default neutral score
    
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
        
        # Specific recommendations based on findings
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
        
        barcodes = self.detect_and_decode_barcode(image)
        
        if barcodes:
            result['barcode_detected'] = True
            barcode_data = barcodes[0]['data']
        
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
        
        extracted_text = self.extract_text(image)
        result['extracted_text'] = extracted_text
        
        if not result['barcode_detected'] or not result['product_info'].get('found'):
            text_score, keywords = self.analyze_sustainability_from_text(extracted_text)
            result['sustainability_score'] = text_score
            result['found_keywords'] = keywords
            result['confidence'] = 0.6 if len(extracted_text) > 20 else 0.4
        
        result['recommendations'] = self.generate_recommendations(result)
        
        return result


if __name__ == "__main__":
    analyzer = ProductAnalyzer()
    print("Product Analyzer initialized!")
    print("Ready to analyze products via barcode or OCR")