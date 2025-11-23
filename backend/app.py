from flask import Flask, request, jsonify
import cv2
import numpy as np
import base64
from flask_cors import CORS
from advanced_classifier import AdvancedWasteClassifier
from waste_classifier import WasteClassifier
from product_analyzer import ProductAnalyzer

app = Flask(__name__)
CORS(app)

advanced_classifier = AdvancedWasteClassifier()
simple_classifier = WasteClassifier()
product_analyzer = ProductAnalyzer()

@app.route('/')
def home():
    return jsonify({
        "message": "EcoLife Advanced API",
        "status": "operational",
        "version": "3.0",
        "endpoints": {
            "waste_classification": "/classify-waste",
            "product_analysis": "/analyze-product",
            "barcode_scan": "/scan-barcode"
        }
    })

@app.route('/classify-waste', methods=['POST', 'OPTIONS'])
def classify_waste():
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        image_data = data['image']
        mode = data.get('mode', 'advanced')
        
        img_bytes = base64.b64decode(image_data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"error": "Invalid image data"}), 400
        
        if mode == 'advanced':
            result = advanced_classifier.predict(img)
            if 'error' in result:
                return jsonify(result), 400
            response_data = {
                "waste_type": result['waste_type'],
                "category_name": result['category_name'],
                "confidence": result['confidence'],
                "subcategories": result['subcategories'],
                "disposal_instructions": result['disposal_instructions'],
                "recycling_code": result['recycling_code'],
                "tips": result['eco_tips'],
                "contamination_warnings": result['contamination_warnings'],
                "mode": "advanced"
            }
        else:
            waste_type, confidence = simple_classifier.predict(img)
            response_data = {
                "waste_type": waste_type,
                "confidence": confidence,
                "tips": get_simple_tips(waste_type),
                "mode": "simple"
            }
        
        response = jsonify(response_data)
        return _corsify_actual_response(response)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/analyze-product', methods=['POST', 'OPTIONS'])
def analyze_product():
    """Enhanced product analysis with barcode scanning and OCR"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        image_data = data.get('image')
        
        if not image_data or image_data == 'demo':
            return jsonify({"error": "Please provide a product image"}), 400
        
        # Decode image
        img_bytes = base64.b64decode(image_data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"error": "Invalid image data"}), 400
        

        analysis = product_analyzer.analyze_product(img)
        
        response_data = {
            "sustainability_score": analysis['sustainability_score'],
            "confidence": analysis['confidence'],
            "barcode_detected": analysis['barcode_detected'],
            "found_keywords": [kw for kw, _ in analysis['found_keywords']],
            "extracted_text": analysis['extracted_text'][:200] if analysis['extracted_text'] else "No text detected",
            "recommendations": analysis['recommendations'],
            "analysis_method": "barcode" if analysis['barcode_detected'] else "ocr"
        }
        
        if analysis['barcode_detected'] and analysis['product_info'].get('found'):
            product_info = analysis['product_info']
            response_data['product_details'] = {
                "name": product_info.get('product_name', 'Unknown'),
                "brand": product_info.get('brands', 'Unknown'),
                "categories": product_info.get('categories', ''),
                "nutriscore": product_info.get('nutriscore_grade', 'N/A'),
                "ecoscore": product_info.get('ecoscore_grade', 'N/A'),
                "packaging": product_info.get('packaging', ''),
                "labels": product_info.get('labels', ''),
            }
            
            if analysis['packaging_materials']:
                response_data['packaging_analysis'] = {
                    "materials": analysis['packaging_materials'],
                    "packaging_score": analysis['packaging_score']
                }
        
        response = jsonify(response_data)
        return _corsify_actual_response(response)
        
    except Exception as e:
        print(f"Product analysis error: {e}")
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 400

@app.route('/scan-barcode', methods=['POST', 'OPTIONS'])
def scan_barcode():
    """Dedicated endpoint for barcode scanning"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({"error": "No image provided"}), 400
        

        img_bytes = base64.b64decode(image_data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"error": "Invalid image data"}), 400
        
        barcodes = product_analyzer.detect_and_decode_barcode(img)
        
        if not barcodes:
            return jsonify({
                "barcode_detected": False,
                "message": "No barcode detected. Try adjusting camera angle or lighting."
            })
        
        barcode_data = barcodes[0]['data']
        product_info = product_analyzer.fetch_product_info_from_barcode(barcode_data)
        
        response_data = {
            "barcode_detected": True,
            "barcode": barcode_data,
            "barcode_type": barcodes[0]['type'],
            "product_found": product_info['found']
        }
        
        if product_info['found']:
            response_data['product_details'] = {
                "name": product_info.get('product_name', 'Unknown'),
                "brand": product_info.get('brands', 'Unknown'),
                "categories": product_info.get('categories', ''),
                "nutriscore": product_info.get('nutriscore_grade', 'N/A'),
                "ecoscore": product_info.get('ecoscore_grade', 'N/A'),
                "packaging": product_info.get('packaging', ''),
            }
        
        response = jsonify(response_data)
        return _corsify_actual_response(response)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/waste-categories', methods=['GET'])
def get_waste_categories():
    return jsonify(advanced_classifier.categories)

def get_simple_tips(waste_type):
    tips = {
        'recyclable': ["Rinse containers", "Check local guidelines"],
        'organic': ["Compost food scraps", "Use compost bin"],
        'landfill': ["Reduce single-use items", "Consider repair"]
    }
    return tips.get(waste_type, [])

def _build_cors_preflight_response():
    response = jsonify()
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response

def _corsify_actual_response(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response

if __name__ == '__main__':
    print("=" * 60)
    print("EcoLife Enhanced Server Starting...")
    print("=" * 60)
    print("Features:")
    print("  ✓ Waste Classification (Simple & Advanced)")
    print("  ✓ Barcode Scanning")
    print("  ✓ Product Sustainability Analysis")
    print("  ✓ OCR Text Extraction")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5500, debug=True)