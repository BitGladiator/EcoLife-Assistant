from flask import Flask, request, jsonify
import cv2
import numpy as np
import base64
import traceback
from flask_cors import CORS
from advanced_classifier import AdvancedWasteClassifier
from waste_classifier import WasteClassifier
from product_analyzer import ProductAnalyzer
# FIXED IMPORT: Use get_auth_manager instead of AuthManager
from auth_manager import get_auth_manager, token_required
from community_manager import CommunityManager
from impact_calculator import ImpactCalculator
from PIL import Image
import io

app = Flask(__name__)

# Configure CORS properly - allow all origins and specific headers
CORS(app, 
     origins=["*"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

# Initialize components
advanced_classifier = AdvancedWasteClassifier()
simple_classifier = WasteClassifier()
product_analyzer = ProductAnalyzer()
# FIXED: Use get_auth_manager() instead of AuthManager()
auth_manager = get_auth_manager()
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
        
        if img is None:
            pil_image = Image.open(io.BytesIO(img_bytes))
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            img_array = np.array(pil_image)
            img = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        
        return img
    except Exception as e:
        print(f"Image decoding error: {e}")
        return None

@app.route('/auth/register', methods=['POST'])
def register():
    """Register new user"""
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400
        
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
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@app.route('/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No JSON data received'}), 400
        
        username = data.get('username')
        password = data.get('password')
        
        if not all([username, password]):
            return jsonify({'error': 'Missing credentials'}), 400
        
        result = auth_manager.login_user(username, password)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 401
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@app.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get user profile"""
    try:
        user_id = request.user_id
        
        if not user_id:
            return jsonify({'error': 'User not authenticated'}), 401
        
        profile = auth_manager.get_user_profile(user_id)
        
        if profile:
            return jsonify(profile), 200
        else:
            return jsonify({'error': 'Profile not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Failed to get profile: {str(e)}'}), 500

@app.route('/classify-waste/advanced', methods=['POST'])
@token_required
def classify_waste_advanced():
    """Advanced waste classification with user tracking"""
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
        
        user_id = request.user_id
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if user_id:
            auth_manager.add_scan_record(
                user_id, 
                result['waste_type'], 
                result['confidence'],
                latitude,
                longitude
            )
        
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
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Advanced classification error: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/classify-waste/simple', methods=['POST'])
@token_required
def classify_waste_simple():
    """Simple waste classification"""
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
        
        result = simple_classifier.predict(img)
        
        if 'error' in result:
            return jsonify(result), 400
        
        user_id = request.user_id
        if user_id:
            auth_manager.add_scan_record(
                user_id, 
                result['waste_type'], 
                result['confidence'],
                None,
                None
            )
        
        response_data = {
            "waste_type": result['waste_type'],
            "confidence": result['confidence'],
            "disposal_instructions": result.get('disposal_instructions', ''),
            "mode": "simple"
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Simple classification error: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/analyze-product', methods=['POST'])
@token_required
def analyze_product():
    """Product sustainability analysis"""
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
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Product analysis error: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/impact', methods=['GET'])
@token_required
def get_impact():
    """Get user's environmental impact statistics"""
    try:
        user_id = request.user_id
        
        if not user_id:
            return jsonify({'error': 'User not authenticated'}), 401
        
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
        
        impact = impact_calculator.calculate_cumulative_impact(scans)
        
        tips = impact_calculator.generate_personalized_tips(
            impact['waste_breakdown'],
            impact['total_co2_saved_kg']
        )
        impact['personalized_tips'] = tips
        
        return jsonify(impact), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get impact: {str(e)}'}), 500

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
    try:
        user_id = request.user_id
        data = request.json
        challenge_id = data.get('challenge_id')
        
        if not challenge_id:
            return jsonify({'error': 'Challenge ID required'}), 400
        
        success = community_manager.join_challenge(user_id, challenge_id)
        
        if success:
            return jsonify({'message': 'Successfully joined challenge'}), 200
        else:
            return jsonify({'error': 'Already joined or challenge not found'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to join challenge: {str(e)}'}), 500

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

@app.route('/verify-token', methods=['POST'])
def verify_token():
    """Verify if a token is valid"""
    try:
        data = request.json
        token = data.get('token')
        
        if not token:
            return jsonify({'valid': False, 'error': 'Token missing'}), 400
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        payload = auth_manager.verify_token(token)
        
        if payload:
            return jsonify({
                'valid': True,
                'user_id': payload['user_id'],
                'username': payload['username']
            }), 200
        else:
            return jsonify({'valid': False, 'error': 'Invalid token'}), 401
    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)}), 500

# Add a test endpoint to debug tokens
@app.route('/debug-token', methods=['GET'])
def debug_token():
    """Debug endpoint to check token verification"""
    token = request.headers.get('Authorization')
    
    if not token:
        return jsonify({'error': 'No token provided'}), 400
    
    print("=" * 50)
    print("DEBUG TOKEN ENDPOINT")
    print(f"Authorization header: {token}")
    
    if token.startswith('Bearer '):
        token = token[7:]
    
    payload = auth_manager.verify_token(token)
    
    if payload:
        return jsonify({
            'valid': True,
            'user_id': payload['user_id'],
            'username': payload['username'],
            'exp': payload['exp']
        }), 200
    else:
        return jsonify({'valid': False, 'error': 'Token verification failed'}), 401

@app.route('/')
def home():
    return jsonify({
        "message": "EcoLife Enhanced API",
        "status": "operational",
        "version": "4.0",
        "endpoints": {
            "auth": ["/auth/register", "/auth/login", "/verify-token", "/debug-token"],
            "classification": ["/classify-waste/advanced", "/classify-waste/simple"],
            "analysis": ["/analyze-product"],
            "user": ["/profile", "/impact"],
            "community": ["/leaderboard", "/challenges", "/community/stats"],
            "info": ["/eco-tip", "/recycling-centers"]
        },
        "note": "Most endpoints require JWT token in Authorization header"
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

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    print("=" * 60)
    print("EcoLife Enhanced Server v4.0")
    print("=" * 60)
    print("\nServer running on: http://10.219.49.127:5500")
    print("\nAdded debug endpoint: /debug-token")
    print("\nProtected Endpoints (require token):")
    print("  GET  /profile")
    print("  POST /classify-waste/advanced")
    print("  POST /classify-waste/simple")
    print("  GET  /impact")
    print("  POST /challenges/join")
    print("\nPublic Endpoints:")
    print("  POST /auth/register")
    print("  POST /auth/login")
    print("  POST /verify-token")
    print("  GET  /debug-token")
    print("  GET  /leaderboard")
    print("  GET  /challenges")
    print("  GET  /eco-tip")
    print("\nServer Configuration:")
    print("  Host: 0.0.0.0")
    print("  Port: 5500")
    print("  Debug: True")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5500, debug=True)