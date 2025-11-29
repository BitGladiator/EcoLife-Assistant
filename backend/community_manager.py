import sqlite3
from datetime import datetime, timedelta
import json

class CommunityManager:
    def __init__(self, db_path='ecolife_community.db'):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize community database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS leaderboard (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                total_scans INTEGER,
                recycling_score INTEGER,
                co2_saved REAL,
                rank INTEGER,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Community challenges
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS challenges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                target_value INTEGER,
                challenge_type TEXT,
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                reward_points INTEGER,
                created_by INTEGER
            )
        ''')
        
        # Challenge participation
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS challenge_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                challenge_id INTEGER,
                user_id INTEGER,
                progress INTEGER DEFAULT 0,
                completed BOOLEAN DEFAULT 0,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (challenge_id) REFERENCES challenges (id)
            )
        ''')
    
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS eco_tips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tip_text TEXT NOT NULL,
                category TEXT,
                difficulty TEXT,
                impact_score INTEGER,
                likes INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_contributions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                contribution_type TEXT,
                content TEXT,
                upvotes INTEGER DEFAULT 0,
                verified BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
    
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recycling_centers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                address TEXT,
                latitude REAL,
                longitude REAL,
                accepts_types TEXT,
                operating_hours TEXT,
                contact TEXT,
                rating REAL DEFAULT 0.0,
                verified BOOLEAN DEFAULT 0
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def get_leaderboard(self, timeframe='all', limit=50):
        """Get global leaderboard"""
        conn = sqlite3.connect('ecolife_users.db')
        cursor = conn.cursor()
        
    
        date_filter = ''
        if timeframe == 'week':
            date_filter = f"AND created_at >= datetime('now', '-7 days')"
        elif timeframe == 'month':
            date_filter = f"AND created_at >= datetime('now', '-30 days')"
        
        query = f'''
            SELECT username, total_scans, recycling_score, co2_saved,
                   ROW_NUMBER() OVER (ORDER BY recycling_score DESC) as rank
            FROM users
            WHERE total_scans > 0 {date_filter}
            ORDER BY recycling_score DESC
            LIMIT ?
        '''
        
        cursor.execute(query, (limit,))
        results = cursor.fetchall()
        conn.close()
        
        return [{
            'username': r[0],
            'total_scans': r[1],
            'recycling_score': r[2],
            'co2_saved': round(r[3], 2),
            'rank': r[4]
        } for r in results]
    
    def get_local_leaderboard(self, location, limit=20):
        """Get location-based leaderboard"""
        conn = sqlite3.connect('ecolife_users.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT username, total_scans, recycling_score, co2_saved
            FROM users
            WHERE location = ? AND total_scans > 0
            ORDER BY recycling_score DESC
            LIMIT ?
        ''', (location, limit))
        
        results = cursor.fetchall()
        conn.close()
        
        return [{
            'username': r[0],
            'total_scans': r[1],
            'recycling_score': r[2],
            'co2_saved': round(r[3], 2),
            'rank': idx + 1
        } for idx, r in enumerate(results)]
    
    def create_challenge(self, title, description, target_value, 
                        challenge_type, duration_days, reward_points):
        """Create new community challenge"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        start_date = datetime.now()
        end_date = start_date + timedelta(days=duration_days)
        
        cursor.execute('''
            INSERT INTO challenges 
            (title, description, target_value, challenge_type, start_date, end_date, reward_points)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (title, description, target_value, challenge_type, 
              start_date, end_date, reward_points))
        
        challenge_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return challenge_id
    
    def get_active_challenges(self):
        """Get all active challenges"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, title, description, target_value, challenge_type,
                   start_date, end_date, reward_points,
                   (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = challenges.id) as participants
            FROM challenges
            WHERE end_date > datetime('now')
            ORDER BY start_date DESC
        ''')
        
        results = cursor.fetchall()
        conn.close()
        
        return [{
            'id': r[0],
            'title': r[1],
            'description': r[2],
            'target': r[3],
            'type': r[4],
            'start_date': r[5],
            'end_date': r[6],
            'reward_points': r[7],
            'participants': r[8]
        } for r in results]
    
    def join_challenge(self, user_id, challenge_id):
        """User joins a challenge"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO challenge_participants (challenge_id, user_id)
                VALUES (?, ?)
            ''', (challenge_id, user_id))
            conn.commit()
            success = True
        except sqlite3.IntegrityError:
            success = False
        
        conn.close()
        return success
    
    def update_challenge_progress(self, user_id, challenge_id, progress_increment):
        """Update user's challenge progress"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE challenge_participants
            SET progress = progress + ?
            WHERE user_id = ? AND challenge_id = ?
        ''', (progress_increment, user_id, challenge_id))
        
        # Check if challenge is completed
        cursor.execute('''
            SELECT cp.progress, c.target_value
            FROM challenge_participants cp
            JOIN challenges c ON cp.challenge_id = c.id
            WHERE cp.user_id = ? AND cp.challenge_id = ?
        ''', (user_id, challenge_id))
        
        result = cursor.fetchone()
        if result and result[0] >= result[1]:
            cursor.execute('''
                UPDATE challenge_participants
                SET completed = 1
                WHERE user_id = ? AND challenge_id = ?
            ''', (user_id, challenge_id))
        
        conn.commit()
        conn.close()
    
    def get_daily_eco_tip(self):
        """Get random eco tip of the day"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT tip_text, category, impact_score
            FROM eco_tips
            ORDER BY RANDOM()
            LIMIT 1
        ''')
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'tip': result[0],
                'category': result[1],
                'impact_score': result[2]
            }
        return None
    
    def find_nearby_recycling_centers(self, latitude, longitude, radius_km=10):
        """Find recycling centers near location"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
       
        cursor.execute('''
            SELECT id, name, address, latitude, longitude, accepts_types, 
                   operating_hours, contact, rating,
                   (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
                   cos(radians(longitude) - radians(?)) + 
                   sin(radians(?)) * sin(radians(latitude)))) AS distance
            FROM recycling_centers
            WHERE verified = 1
            HAVING distance <= ?
            ORDER BY distance
            LIMIT 10
        ''', (latitude, longitude, latitude, radius_km))
        
        results = cursor.fetchall()
        conn.close()
        
        return [{
            'id': r[0],
            'name': r[1],
            'address': r[2],
            'latitude': r[3],
            'longitude': r[4],
            'accepts': r[5].split(',') if r[5] else [],
            'hours': r[6],
            'contact': r[7],
            'rating': r[8],
            'distance_km': round(r[9], 2)
        } for r in results]
    
    def get_impact_statistics(self):
        """Get global community impact statistics"""
        conn = sqlite3.connect('ecolife_users.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                COUNT(*) as total_users,
                SUM(total_scans) as total_scans,
                SUM(co2_saved) as total_co2_saved,
                AVG(recycling_score) as avg_score
            FROM users
        ''')
        
        stats = cursor.fetchone()
        
        cursor.execute('''
            SELECT waste_type, COUNT(*) as count
            FROM scan_history
            GROUP BY waste_type
            ORDER BY count DESC
        ''')
        
        waste_breakdown = cursor.fetchall()
        conn.close()
        
        return {
            'total_users': stats[0],
            'total_scans': stats[1] or 0,
            'co2_saved_kg': round(stats[2] or 0, 2),
            'avg_recycling_score': round(stats[3] or 0, 2),
            'waste_breakdown': [{'type': w[0], 'count': w[1]} for w in waste_breakdown]
        }

if __name__ == "__main__":
    community = CommunityManager()
    print("Community system initialized!")
    
    community.create_challenge(
        "Recycle 50 Items",
        "Help the environment by recycling 50 items this month",
        50, "scans", 30, 500
    )
    
    print("Sample challenge created!")