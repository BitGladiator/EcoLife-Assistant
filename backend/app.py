from flask import Flask, request, jsonify
import cv2
import numpy as np
import base64
import traceback
from flask_cors import CORS
from advanced_classifier import AdvancedWasteClassifier
from waste_classifier import WasteClassifier
from product_analyzer import ProductAnalyzer
from auth_manager import AuthManager, token_required
from community_manager import CommunityManager
from impact_calculator import ImpactCalculator
from PIL import Image
import io

app = Flask(__name__)
CORS(app)


advanced_classifier = AdvancedWasteClassifier()
simple_classifier = WasteClassifier()
product_analyzer = ProductAnalyzer()
auth_manager = AuthManager()
community_manager = CommunityManager()
impact_calculator = ImpactCalculator()

def decode_image(image_data):
    """Decode base64 image"""
    try:
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        img_bytes = base64.b64decode(image_data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is not None:
            return img
        
        try:
            pil_image = Image.open(io.BytesIO(img_bytes))
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            img_array = np.array(pil_image)
            img = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            return img
        except Exception:
            pass
        
        return None
    except Exception as e:
        print(f"Image decoding error: {e}")
        return None


@app.route('/auth/register', methods=['POST'])
def register():
    """Register new user"""
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not all([username, email, password]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    result = auth_manager.register_user(username, email, password)
    
    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400

@app.route('/auth/login', methods=['POST'])
def login():
    """Login user"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not all([username, password]):
        return jsonify({'error': 'Missing credentials'}), 400
    
    result = auth_manager.login_user(username, password)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 401

@app.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get user profile"""
    user_id = request.user_id
    
    profile = auth_manager.get_user_profile(user_id)
    
    if profile:
        return jsonify(profile), 200
    else:
        return jsonify({'error': 'Profile not found'}), 404



@app.route('/classify-waste/advanced', methods=['POST', 'OPTIONS'])
# @token_required
def classify_waste_advanced():
    """Advanced waste classification with user tracking"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
        
        image_data = data.get('image')
        if not image_data:
            return jsonify({"error": "No image data in request"}), 400
        
        img = decode_image(image_data)
        
        if img is None:
            return jsonify({
                "error": "Failed to decode image"
            }), 400
        
        result = advanced_classifier.predict(img)
        
        if 'error' in result:
            return jsonify(result), 400
        
        # Record scan in user history
        # user_id = request.user_id
        # latitude = data.get('latitude')
        # longitude = data.get('longitude')
        
        # auth_manager.add_scan_record(
        #     user_id, 
        #     result['waste_type'], 
        #     result['confidence'],
        #     latitude,
        #     longitude
        # )
        
        # Calculate impact
        impact = impact_calculator.calculate_single_item_impact(
            result['waste_type'],
            result['confidence']
        )
        
        response_data = {
            "waste_type": result['waste_type'],
            "category_name": result['category_name'],
            "confidence": result['confidence'],
            "subcategories": result['subcategories'],
            "disposal_instructions": result['disposal_instructions'],
            "recycling_code": result['recycling_code'],
            "tips": result['eco_tips'],
            "contamination_warnings": result['contamination_warnings'],
            "environmental_impact": impact,
            "mode": "advanced"
        }
        
        response = jsonify(response_data)
        return _corsify_actual_response(response)
        
    except Exception as e:
        print(f"Advanced classification error: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/analyze-product', methods=['POST', 'OPTIONS'])
def analyze_product():
    """Product sustainability analysis (no auth required)"""
    if request.method == 'OPTIONS':
        return _build_cors_preflight_response()
    
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
        
        image_data = data.get('image')
        if not image_data:
            return jsonify({"error": "No image data in request"}), 400
        
        img = decode_image(image_data)
        
        if img is None:
            return jsonify({
                "error": "Failed to decode image"
            }), 400
        
      
        result = product_analyzer.analyze_product(img)
        
        if 'error' in result:
            return jsonify(result), 400
        
       
        response_data = {
            "sustainability_score": result.get('sustainability_score', 0),
            "confidence": result.get('confidence', 0),
            "barcode_detected": result.get('barcode_detected', False),
            "found_keywords": result.get('found_keywords', []),
            "extracted_text": result.get('extracted_text', ''),
            "recommendations": result.get('recommendations', []),
            "analysis_method": "barcode" if result.get('barcode_detected') else "ocr"
        }

        if result.get('product_info') and result['product_info'].get('found'):
            product_info = result['product_info']
            response_data['product_details'] = {
                'name': product_info.get('product_name', 'Unknown'),
                'brand': product_info.get('brands', 'Unknown'),
                'categories': product_info.get('categories', ''),
                'nutriscore': product_info.get('nutriscore_grade', 'N/A'),
                'ecoscore': product_info.get('ecoscore_grade', 'N/A'),
                'packaging': product_info.get('packaging', ''),
                'labels': product_info.get('labels', '')
            }
        

        if result.get('packaging_materials'):
            response_data['packaging_analysis'] = {
                'materials': result.get('packaging_materials', []),
                'packaging_score': result.get('packaging_score', 0)
            }
        
        response = jsonify(response_data)
        return _corsify_actual_response(response)
        
    except Exception as e:
        print(f"Product analysis error: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/impact', methods=['GET'])
@token_required
def get_impact():
    """Get user's environmental impact statistics"""
    user_id = request.user_id
    
    profile = auth_manager.get_user_profile(user_id)
    
    if not profile:
        return jsonify({'error': 'User not found'}), 404
    
    import sqlite3
    conn = sqlite3.connect('ecolife_users.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT waste_type, confidence
        FROM scan_history
        WHERE user_id = ?
    ''', (user_id,))
    
    scans = [{'waste_type': row[0], 'confidence': row[1]} for row in cursor.fetchall()]
    conn.close()
    
    # Calculate cumulative impact
    impact = impact_calculator.calculate_cumulative_impact(scans)
    
    # Add personalized tips
    tips = impact_calculator.generate_personalized_tips(
        impact['waste_breakdown'],
        impact['total_co2_saved_kg']
    )
    impact['personalized_tips'] = tips
    
    return jsonify(impact), 200

@app.route('/impact/monthly-projection', methods=['GET'])
@token_required
def get_monthly_projection():
    """Get projected monthly impact"""
    user_id = request.user_id
    
    import sqlite3
    from datetime import datetime, timedelta
    
    conn = sqlite3.connect('ecolife_users.db')
    cursor = conn.cursor()
    
  
    cursor.execute('''
        SELECT waste_type, confidence, timestamp
        FROM scan_history
        WHERE user_id = ? AND timestamp >= date('now', 'start of month')
    ''', (user_id,))
    
    scans = [{'waste_type': row[0], 'confidence': row[1]} for row in cursor.fetchall()]
    conn.close()
    
    if not scans:
        return jsonify({'message': 'No scans this month yet'}), 200
    

    start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    days_elapsed = (datetime.now() - start_of_month).days + 1
    
    projection = impact_calculator.predict_monthly_impact(scans, days_elapsed)
    
    return jsonify(projection), 200



@app.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get global or local leaderboard"""
    timeframe = request.args.get('timeframe', 'all')  
    location = request.args.get('location')
    limit = int(request.args.get('limit', 50))
    
    if location:
        leaderboard = community_manager.get_local_leaderboard(location, limit)
    else:
        leaderboard = community_manager.get_leaderboard(timeframe, limit)
    
    return jsonify(leaderboard), 200

@app.route('/challenges', methods=['GET'])
def get_challenges():
    """Get active challenges"""
    challenges = community_manager.get_active_challenges()
    return jsonify(challenges), 200

@app.route('/challenges/join', methods=['POST'])
@token_required
def join_challenge():
    """Join a challenge"""
    user_id = request.user_id
    challenge_id = request.json.get('challenge_id')
    
    if not challenge_id:
        return jsonify({'error': 'Challenge ID required'}), 400
    
    success = community_manager.join_challenge(user_id, challenge_id)
    
    if success:
        return jsonify({'message': 'Successfully joined challenge'}), 200
    else:
        return jsonify({'error': 'Already joined or challenge not found'}), 400

@app.route('/eco-tip', methods=['GET'])
def get_eco_tip():
    """Get daily eco tip"""
    tip = community_manager.get_daily_eco_tip()
    
    if tip:
        return jsonify(tip), 200
    else:
        return jsonify({'message': 'No tips available'}), 404

@app.route('/recycling-centers', methods=['GET'])
def find_recycling_centers():
    """Find nearby recycling centers"""
    latitude = float(request.args.get('latitude', 0))
    longitude = float(request.args.get('longitude', 0))
    radius = float(request.args.get('radius', 10))
    
    centers = community_manager.find_nearby_recycling_centers(
        latitude, longitude, radius
    )
    
    return jsonify(centers), 200

@app.route('/community/stats', methods=['GET'])
def get_community_stats():
    """Get global community impact statistics"""
    stats = community_manager.get_impact_statistics()
    return jsonify(stats), 200



@app.route('/')
def home():
    return jsonify({
        "message": "EcoLife Enhanced API",
        "status": "operational",
        "version": "4.0",
        "features": [
            "User Authentication",
            "Community Features",
            "Impact Calculator",
            "Leaderboards",
            "Challenges",
            "Advanced Analytics"
        ]
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "version": "4.0",
        "modules": {
            "auth": "active",
            "community": "active",
            "impact_calculator": "active",
            "advanced_classifier": "loaded",
            "simple_classifier": "loaded",
            "product_analyzer": "loaded"
        }
    })

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
    print("EcoLife Enhanced Server v4.0")
    print("=" * 60)
    print("\nAuthentication System Active")
    print("Community Features Enabled")
    print("Impact Calculator Online")
    print("Advanced AI Classifier Ready")
    print("\nNew Endpoints:")
    print("  POST /auth/register")
    print("  POST /auth/login")
    print("  GET  /profile (protected)")
    print("  GET  /impact (protected)")
    print("  GET  /leaderboard")
    print("  GET  /challenges")
    print("  POST /challenges/join (protected)")
    print("  GET  /eco-tip")
    print("  GET  /recycling-centers")
    print("  GET  /community/stats")
    print("\nServer Configuration:")
    print("  Host: 0.0.0.0")
    print("  Port: 5500")
    print("  Debug: True")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5500, debug=True)