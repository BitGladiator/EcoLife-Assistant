import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, G, Line } from 'react-native-svg';
import axios from 'axios';

const { width } = Dimensions.get('window');
const API_BASE = "http://10.219.49.127:5500";

interface UserProfile {
  username: string;
  email: string;
  total_scans: number;
  recycling_score: number;
  co2_saved: number;
  member_since: string;
  location: string;
  waste_breakdown: { type: string; count: number }[];
  achievements: { type: string; earned_at: string }[];
}

interface ImpactData {
  total_co2_saved_kg: number;
  total_water_saved_liters: number;
  total_energy_saved_kwh: number;
  equivalents: {
    trees_planted: number;
    cars_off_road_days: number;
    smartphones_charged: number;
    miles_not_driven: number;
  };
  environmental_rank: {
    level: string;
    icon: string;
    next_level: number | null;
  };
}

const ProfileIcon = () => (
  <Svg width="80" height="80" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke="#065F46" strokeWidth="2" />
    <Path
      d="M20 21C20 17.134 16.418 14 12 14C7.582 14 4 17.134 4 21"
      stroke="#065F46"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

const TrophyIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M8.5 17H15.5M12 17V21M7 21H17M12 3V5M6.5 5H17.5C18.605 5 19.5 5.895 19.5 7V10C19.5 12.485 17.485 14.5 15 14.5H9C6.515 14.5 4.5 12.485 4.5 10V7C4.5 5.895 5.395 5 6.5 5Z"
      stroke="#F59E0B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChartIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 3V21H21"
      stroke="#059669"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 14L12 9L16 13L21 8"
      stroke="#059669"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ImpactIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke="#10B981" strokeWidth="2" />
    <Path
      d="M12 2C12 2 7 7 7 12C7 14.761 9.239 17 12 17C14.761 17 17 14.761 17 12C17 7 12 2 12 2Z"
      fill="#10B981"
    />
  </Svg>
);

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'impact' | 'achievements'>('stats');

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
    
      const token = 'your-jwt-token';
      
      const profileResponse = await axios.get(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const impactResponse = await axios.get(`${API_BASE}/impact`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProfile(profileResponse.data);
      setImpact(impactResponse.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (title: string, value: string | number, icon: React.ReactNode) => (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );

  const renderProgressBar = (value: number, max: number, color: string) => (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <View 
          style={[
            styles.progressBarFill, 
            { width: `${(value / max) * 100}%`, backgroundColor: color }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>{value} / {max}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading your eco journey...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <ProfileIcon />
        </View>
        <Text style={styles.username}>{profile?.username || 'Eco Warrior'}</Text>
        <Text style={styles.memberSince}>
          Member since {profile?.member_since ? new Date(profile.member_since).toLocaleDateString() : 'Today'}
        </Text>
        {impact?.environmental_rank && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankIcon}>{impact.environmental_rank.icon}</Text>
            <Text style={styles.rankText}>{impact.environmental_rank.level}</Text>
          </View>
        )}
      </View>


      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Statistics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'impact' && styles.activeTab]}
          onPress={() => setActiveTab('impact')}
        >
          <Text style={[styles.tabText, activeTab === 'impact' && styles.activeTabText]}>
            Impact
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
          onPress={() => setActiveTab('achievements')}
        >
          <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>
            Achievements
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'stats' && (
        <View style={styles.content}>
          <View style={styles.statsGrid}>
            {renderStatCard(
              'Total Scans',
              profile?.total_scans || 0,
              <ChartIcon />
            )}
            {renderStatCard(
              'Eco Score',
              profile?.recycling_score || 0,
              <TrophyIcon />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Waste Breakdown</Text>
            {profile?.waste_breakdown?.map((item, index) => (
              <View key={index} style={styles.wasteItem}>
                <Text style={styles.wasteType}>
                  {item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <View style={styles.wasteCountContainer}>
                  <Text style={styles.wasteCount}>{item.count}</Text>
                  <View style={styles.wasteBar}>
                    <View 
                      style={[
                        styles.wasteBarFill,
                        { 
                          width: `${(item.count / (profile?.total_scans || 1)) * 100}%`,
                          backgroundColor: getWasteColor(item.type)
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
      {activeTab === 'impact' && impact && (
        <View style={styles.content}>
          <View style={styles.impactCard}>
            <ImpactIcon />
            <Text style={styles.impactTitle}>Your Environmental Impact</Text>
            <Text style={styles.impactSubtitle}>
              You've saved {impact.total_co2_saved_kg.toFixed(2)} kg of CO₂
            </Text>
          </View>

          <View style={styles.equivalentsGrid}>
            <View style={styles.equivalentCard}>
              <Text style={styles.equivalentValue}>
                {impact.equivalents.trees_planted.toFixed(1)}
              </Text>
              <Text style={styles.equivalentLabel}>🌳 Trees Planted</Text>
            </View>
            <View style={styles.equivalentCard}>
              <Text style={styles.equivalentValue}>
                {impact.equivalents.cars_off_road_days.toFixed(1)}
              </Text>
              <Text style={styles.equivalentLabel}>🚗 Car Days Saved</Text>
            </View>
            <View style={styles.equivalentCard}>
              <Text style={styles.equivalentValue}>
                {impact.equivalents.smartphones_charged.toFixed(0)}
              </Text>
              <Text style={styles.equivalentLabel}>📱 Phone Charges</Text>
            </View>
            <View style={styles.equivalentCard}>
              <Text style={styles.equivalentValue}>
                {impact.total_water_saved_liters.toFixed(0)}
              </Text>
              <Text style={styles.equivalentLabel}>💧 Liters Saved</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progress to Next Rank</Text>
            {impact.environmental_rank.next_level && (
              <>
                {renderProgressBar(
                  impact.total_co2_saved_kg,
                  impact.environmental_rank.next_level,
                  '#10B981'
                )}
                <Text style={styles.progressHint}>
                  {(impact.environmental_rank.next_level - impact.total_co2_saved_kg).toFixed(1)} kg CO₂ until next level
                </Text>
              </>
            )}
          </View>
        </View>
      )}

      {activeTab === 'achievements' && (
        <View style={styles.content}>
          <View style={styles.achievementsGrid}>
            {profile?.achievements?.map((achievement, index) => (
              <View key={index} style={styles.achievementCard}>
                <Text style={styles.achievementIcon}>🏆</Text>
                <Text style={styles.achievementTitle}>
                  {achievement.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <Text style={styles.achievementDate}>
                  {new Date(achievement.earned_at).toLocaleDateString()}
                </Text>
              </View>
            )) || (
              <Text style={styles.noAchievements}>
                Start recycling to earn achievements!
              </Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function getWasteColor(type: string): string {
  if (type.includes('recyclable')) return '#059669';
  if (type.includes('organic')) return '#D97706';
  if (type === 'hazardous') return '#DC2626';
  if (type === 'e_waste') return '#7C3AED';
  return '#6B7280';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FCF9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FCF9',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#047857',
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#A7F3D0',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#064E3B',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rankIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#059669',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#059669',
  },
  content: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#064E3B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#064E3B',
    marginBottom: 16,
  },
  wasteItem: {
    marginBottom: 16,
  },
  wasteType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  wasteCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wasteCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#064E3B',
    width: 30,
  },
  wasteBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  wasteBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  impactCard: {
    backgroundColor: '#ECFDF5',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  impactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#064E3B',
    marginTop: 12,
    marginBottom: 8,
  },
  impactSubtitle: {
    fontSize: 16,
    color: '#047857',
    textAlign: 'center',
  },
  equivalentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  equivalentCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  equivalentValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  equivalentLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
    fontWeight: '600',
  },
  progressHint: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
    marginTop: 8,
  },
  achievementsGrid: {
    gap: 12,
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  achievementIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#064E3B',
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  noAchievements: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    padding: 40,
  },
});