import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import sqlite3
import os

class AuthManager:
    def __init__(self, db_path='ecolife_users.db'):
        self.db_path = db_path
        self.secret_key = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database for users"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_scans INTEGER DEFAULT 0,
                recycling_score INTEGER DEFAULT 0,
                co2_saved REAL DEFAULT 0.0,
                profile_picture TEXT,
                location TEXT,
                preferences TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scan_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                waste_type TEXT,
                confidence REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                image_path TEXT,
                latitude REAL,
                longitude REAL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                achievement_type TEXT,
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def hash_password(self, password):
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password, password_hash):
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    
    def generate_token(self, user_id, username):
        """Generate JWT token"""
        payload = {
            'user_id': user_id,
            'username': username,
            'exp': datetime.utcnow() + timedelta(days=7)
        }
        return jwt.encode(payload, self.secret_key, algorithm='HS256')
    
    def verify_token(self, token):
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def register_user(self, username, email, password):
        """Register new user"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            password_hash = self.hash_password(password)
            
            cursor.execute(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                (username, email, password_hash)
            )
            
            user_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            token = self.generate_token(user_id, username)
            
            return {
                'success': True,
                'token': token,
                'user_id': user_id,
                'username': username
            }
            
        except sqlite3.IntegrityError:
            return {
                'success': False,
                'error': 'Username or email already exists'
            }
    
    def login_user(self, username, password):
        """Login user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT id, username, password_hash FROM users WHERE username = ? OR email = ?',
            (username, username)
        )
        
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return {'success': False, 'error': 'User not found'}
        
        user_id, username, password_hash = user
        
        if not self.verify_password(password, password_hash):
            return {'success': False, 'error': 'Invalid password'}
        
        token = self.generate_token(user_id, username)
        
        return {
            'success': True,
            'token': token,
            'user_id': user_id,
            'username': username
        }
    
    def get_user_profile(self, user_id):
        """Get user profile and statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT username, email, total_scans, recycling_score, 
                   co2_saved, created_at, location
            FROM users WHERE id = ?
        ''', (user_id,))
        
        user_data = cursor.fetchone()
        
        if not user_data:
            conn.close()
            return None
        
        cursor.execute('''
            SELECT COUNT(*) as total, waste_type
            FROM scan_history
            WHERE user_id = ?
            GROUP BY waste_type
        ''', (user_id,))
        
        waste_breakdown = cursor.fetchall()
        
        cursor.execute('''
            SELECT achievement_type, earned_at
            FROM achievements
            WHERE user_id = ?
            ORDER BY earned_at DESC
        ''', (user_id,))
        
        achievements = cursor.fetchall()
        
        conn.close()
        
        return {
            'username': user_data[0],
            'email': user_data[1],
            'total_scans': user_data[2],
            'recycling_score': user_data[3],
            'co2_saved': user_data[4],
            'member_since': user_data[5],
            'location': user_data[6],
            'waste_breakdown': [{'type': w[1], 'count': w[0]} for w in waste_breakdown],
            'achievements': [{'type': a[0], 'earned_at': a[1]} for a in achievements]
        }
    
    def add_scan_record(self, user_id, waste_type, confidence, latitude=None, longitude=None):
        """Add scan to history and update user stats"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO scan_history (user_id, waste_type, confidence, latitude, longitude)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, waste_type, confidence, latitude, longitude))
        
        # Update user statistics
        cursor.execute('''
            UPDATE users 
            SET total_scans = total_scans + 1,
                recycling_score = recycling_score + ?
            WHERE id = ?
        ''', (int(confidence * 10), user_id))
        
        # Check for achievements
        self._check_achievements(cursor, user_id)
        
        conn.commit()
        conn.close()
    
    def _check_achievements(self, cursor, user_id):
        """Check and award achievements"""
        cursor.execute('SELECT total_scans FROM users WHERE id = ?', (user_id,))
        total_scans = cursor.fetchone()[0]
        
        achievements_to_award = []
        
        if total_scans == 1:
            achievements_to_award.append('first_scan')
        elif total_scans == 10:
            achievements_to_award.append('eco_novice')
        elif total_scans == 50:
            achievements_to_award.append('waste_warrior')
        elif total_scans == 100:
            achievements_to_award.append('recycling_champion')
        
        for achievement in achievements_to_award:
            cursor.execute('''
                INSERT OR IGNORE INTO achievements (user_id, achievement_type)
                VALUES (?, ?)
            ''', (user_id, achievement))

def token_required(f):
    """Decorator to protect routes with JWT"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        auth_manager = AuthManager()
        payload = auth_manager.verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        request.user_id = payload['user_id']
        request.username = payload['username']
        
        return f(*args, **kwargs)
    
    return decorated

if __name__ == "__main__":
    auth = AuthManager()
    print("Auth system initialized successfully!")
    print("Database created at:", auth.db_path)