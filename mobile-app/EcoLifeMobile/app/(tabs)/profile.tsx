import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';

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
  <Svg width="96" height="96" viewBox="0 0 96 96">
    <Defs>
      <LinearGradient id="profileGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#0F766E" />
        <Stop offset="1" stopColor="#134E4A" />
      </LinearGradient>
    </Defs>
    <Circle cx="48" cy="48" r="44" fill="url(#profileGradient)" />
    <Circle cx="48" cy="36" r="14" fill="#FFFFFF" />
    <Path
      d="M32 68C32 56 40 48 48 48C56 48 64 56 64 68"
      fill="#FFFFFF"
    />
  </Svg>
);

const ScanIcon = () => (
  <Svg width="32" height="32" viewBox="0 0 32 32">
    <Defs>
      <LinearGradient id="scanGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#059669" />
        <Stop offset="1" stopColor="#047857" />
      </LinearGradient>
    </Defs>
    <Rect x="6" y="6" width="20" height="20" rx="4" stroke="url(#scanGradient)" strokeWidth="2.5" fill="none" />
    <Path d="M10 10L22 22M10 22L22 10" stroke="url(#scanGradient)" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

const ScoreIcon = () => (
  <Svg width="32" height="32" viewBox="0 0 32 32">
    <Defs>
      <LinearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#10B981" />
        <Stop offset="1" stopColor="#059669" />
      </LinearGradient>
    </Defs>
    <Circle cx="16" cy="16" r="14" fill="url(#scoreGradient)" />
    <Path
      d="M11 16L15 20L22 13"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ImpactIcon = () => (
  <Svg width="32" height="32" viewBox="0 0 32 32">
    <Defs>
      <LinearGradient id="impactIconGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#0F766E" />
        <Stop offset="1" stopColor="#134E4A" />
      </LinearGradient>
    </Defs>
    <Path
      d="M16 4L22 12C25 16 26 20 26 24C26 28 21 32 16 32C11 32 6 28 6 24C6 20 7 16 10 12L16 4Z"
      fill="url(#impactIconGradient)"
    />
    <Circle cx="16" cy="24" r="6" fill="#FFFFFF" />
  </Svg>
);

const TreeIcon = () => (
  <Svg width="28" height="28" viewBox="0 0 28 28">
    <Path
      d="M14 4C14 4 7 10 7 14C7 17 9 20 12 20C15 20 17 17 17 14C17 10 14 4 14 4Z"
      fill="#10B981"
    />
    <Path
      d="M14 12C16 12 18 10 18 8H10C10 10 12 12 14 12Z"
      fill="#059669"
    />
    <Rect x="13" y="20" width="2" height="8" fill="#065F46" />
  </Svg>
);

const CarIcon = () => (
  <Svg width="28" height="28" viewBox="0 0 28 28">
    <Rect x="6" y="12" width="16" height="8" rx="2" fill="#3B82F6" />
    <Circle cx="10" cy="22" r="2.5" fill="#1E40AF" />
    <Circle cx="18" cy="22" r="2.5" fill="#1E40AF" />
    <Path d="M8 12L10 8H18L20 12" fill="#2563EB" />
  </Svg>
);

const BatteryIcon = () => (
  <Svg width="28" height="28" viewBox="0 0 28 28">
    <Rect x="6" y="8" width="16" height="12" rx="2" fill="#F59E0B" />
    <Rect x="22" y="12" width="2" height="4" fill="#374151" />
    <Rect x="9" y="11" width="10" height="6" rx="1" fill="#FFFFFF" />
    <Path d="M12 14H16" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const WaterIcon = () => (
  <Svg width="28" height="28" viewBox="0 0 28 28">
    <Path
      d="M14 4L18 10C20 13 21 16 21 19C21 23 18 26 14 26C10 26 7 23 7 19C7 16 8 13 10 10L14 4Z"
      fill="#60A5FA"
    />
    <Path
      d="M14 4V26"
      stroke="#FFFFFF"
      strokeWidth="1"
      strokeOpacity="0.3"
    />
    <Path
      d="M10 10L18 18"
      stroke="#FFFFFF"
      strokeWidth="1"
      strokeOpacity="0.3"
    />
  </Svg>
);

const TrophyIcon = () => (
  <Svg width="28" height="28" viewBox="0 0 28 28">
    <Defs>
      <LinearGradient id="trophyGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#F59E0B" />
        <Stop offset="1" stopColor="#D97706" />
      </LinearGradient>
    </Defs>
    <Path
      d="M8 4H20V8C20 10 18 12 16 12H12C10 12 8 10 8 8V4Z"
      fill="url(#trophyGradient)"
    />
    <Path
      d="M10 12V16"
      stroke="url(#trophyGradient)"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Path
      d="M18 12V16"
      stroke="url(#trophyGradient)"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Rect x="6" y="16" width="16" height="4" rx="2" fill="url(#trophyGradient)" />
    <Path
      d="M12 20V24H16V20"
      stroke="url(#trophyGradient)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

const ChartIcon = () => (
  <Svg width="28" height="28" viewBox="0 0 28 28">
    <Defs>
      <LinearGradient id="chartGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#8B5CF6" />
        <Stop offset="1" stopColor="#7C3AED" />
      </LinearGradient>
    </Defs>
    <Rect x="6" y="16" width="4" height="8" rx="1" fill="url(#chartGradient)" />
    <Rect x="12" y="10" width="4" height="14" rx="1" fill="url(#chartGradient)" />
    <Rect x="18" y="6" width="4" height="18" rx="1" fill="url(#chartGradient)" />
    <Path
      d="M6 24H22"
      stroke="#6B7280"
      strokeWidth="1"
      strokeOpacity="0.3"
    />
  </Svg>
);

const WasteTypeIcon = ({ type }: { type: string }) => {
  const iconMap = {
    recyclable: (
      <Svg width="24" height="24" viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="10" fill="#10B981" />
        <Path d="M9 9L15 15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <Path d="M15 9L9 15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </Svg>
    ),
    organic: (
      <Svg width="24" height="24" viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="10" fill="#D97706" />
        <Path d="M8 12H16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <Path d="M12 8V16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </Svg>
    ),
    hazardous: (
      <Svg width="24" height="24" viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="10" fill="#DC2626" />
        <Path d="M12 8V12" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <Path d="M12 16V16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
      </Svg>
    ),
  };

  if (type.includes('recyclable')) return iconMap.recyclable;
  if (type.includes('organic')) return iconMap.organic;
  if (type === 'hazardous') return iconMap.hazardous;
  
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10" fill="#6B7280" />
      <Circle cx="12" cy="12" r="5" fill="#FFFFFF" />
    </Svg>
  );
};

const AchievementIcon = () => (
  <Svg width="32" height="32" viewBox="0 0 32 32">
    <Defs>
      <LinearGradient id="achievementGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#8B5CF6" />
        <Stop offset="1" stopColor="#7C3AED" />
      </LinearGradient>
    </Defs>
    <Circle cx="16" cy="16" r="14" fill="url(#achievementGradient)" />
    <Path
      d="M11 16L15 20L21 13"
      stroke="#FFFFFF"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const RankIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="rankGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#F59E0B" />
        <Stop offset="1" stopColor="#D97706" />
      </LinearGradient>
    </Defs>
    <Path
      d="M12 2L15 9L22 9L16 13L18 20L12 16L6 20L8 13L2 9L9 9Z"
      fill="url(#rankGradient)"
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
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      const profileResponse = await fetch(`${API_BASE}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const impactResponse = await fetch(`${API_BASE}/impact`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (profileResponse.ok && impactResponse.ok) {
        const profileData = await profileResponse.json();
        const impactData = await impactResponse.json();
        setProfile(profileData);
        setImpact(impactData);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (title: string, value: string | number, icon: React.ReactNode) => (
    <View style={styles.statCard}>
      <View style={styles.statIconContainer}>{icon}</View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
      </View>
    </View>
  );

  const renderProgressBar = (value: number, max: number) => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${Math.min((value / max) * 100, 100)}%` }
          ]} 
        />
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressCurrent}>{value.toFixed(1)} kg</Text>
        <Text style={styles.progressTarget}>Next: {max} kg</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text style={styles.loadingText}>Loading Profile</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              <ProfileIcon />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{profile?.username || 'Eco Warrior'}</Text>
              <Text style={styles.email}>{profile?.email || 'eco.warrior@example.com'}</Text>
              <View style={styles.memberSinceContainer}>
                <Text style={styles.memberSince}>
                  Member since {profile?.member_since ? new Date(profile.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '2024'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.statsOverview}>
            {renderStatCard('Total Scans', profile?.total_scans || 0, <ScanIcon />)}
            {renderStatCard('Eco Score', `${profile?.recycling_score || 0}%`, <ScoreIcon />)}
            {renderStatCard('CO₂ Saved', `${profile?.co2_saved?.toFixed(1) || 0} kg`, <ImpactIcon />)}
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
            onPress={() => setActiveTab('stats')}
          >
            <ChartIcon />
            <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
              Analytics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'impact' && styles.activeTab]}
            onPress={() => setActiveTab('impact')}
          >
            <ImpactIcon />
            <Text style={[styles.tabText, activeTab === 'impact' && styles.activeTabText]}>
              Impact
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
            onPress={() => setActiveTab('achievements')}
          >
            <TrophyIcon />
            <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>
              Achievements
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === 'stats' && (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Waste Analysis</Text>
                  <Text style={styles.sectionSubtitle}>Detailed breakdown by type</Text>
                </View>
                <View style={styles.wasteContainer}>
                  {profile?.waste_breakdown?.map((item, index) => (
                    <View key={index} style={styles.wasteItem}>
                      <View style={styles.wasteTypeContainer}>
                        <WasteTypeIcon type={item.type} />
                        <View style={styles.wasteTypeInfo}>
                          <Text style={styles.wasteType}>
                            {item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Text>
                          <Text style={styles.wastePercentage}>
                            {((item.count / (profile?.total_scans || 1)) * 100).toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                      <View style={styles.wasteStats}>
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

              {impact?.environmental_rank && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.rankHeader}>
                      <RankIcon />
                      <Text style={styles.sectionTitle}>Environmental Rank</Text>
                    </View>
                    <Text style={styles.rankLevel}>{impact.environmental_rank.level}</Text>
                  </View>
                  {impact.environmental_rank.next_level && renderProgressBar(
                    impact.total_co2_saved_kg,
                    impact.environmental_rank.next_level
                  )}
                </View>
              )}
            </>
          )}

          {activeTab === 'impact' && impact && (
            <>
              <View style={styles.impactSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Environmental Impact</Text>
                  <Text style={styles.sectionSubtitle}>
                    Total {impact.total_co2_saved_kg.toFixed(1)} kg CO₂ saved
                  </Text>
                </View>
                
                <View style={styles.impactMetrics}>
                  <View style={styles.impactMetricCard}>
                    <View style={styles.impactMetricIcon}>
                      <TreeIcon />
                    </View>
                    <View style={styles.impactMetricContent}>
                      <Text style={styles.impactMetricValue}>{impact.total_co2_saved_kg.toFixed(1)}</Text>
                      <Text style={styles.impactMetricLabel}>CO₂ Saved (kg)</Text>
                    </View>
                  </View>
                  
                  <View style={styles.impactMetricCard}>
                    <View style={styles.impactMetricIcon}>
                      <WaterIcon />
                    </View>
                    <View style={styles.impactMetricContent}>
                      <Text style={styles.impactMetricValue}>
                        {(impact.total_water_saved_liters / 1000).toFixed(1)}k
                      </Text>
                      <Text style={styles.impactMetricLabel}>Water Saved (L)</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.equivalentsSection}>
                  <Text style={styles.equivalentsTitle}>Environmental Equivalents</Text>
                  <View style={styles.equivalentsGrid}>
                    <View style={styles.equivalentCard}>
                      <View style={styles.equivalentIcon}>
                        <TreeIcon />
                      </View>
                      <Text style={styles.equivalentValue}>
                        {impact.equivalents.trees_planted.toFixed(1)}
                      </Text>
                      <Text style={styles.equivalentLabel}>Trees Equivalent</Text>
                    </View>
                    
                    <View style={styles.equivalentCard}>
                      <View style={styles.equivalentIcon}>
                        <CarIcon />
                      </View>
                      <Text style={styles.equivalentValue}>
                        {impact.equivalents.cars_off_road_days.toFixed(1)}
                      </Text>
                      <Text style={styles.equivalentLabel}>Car-Free Days</Text>
                    </View>
                    
                    <View style={styles.equivalentCard}>
                      <View style={styles.equivalentIcon}>
                        <BatteryIcon />
                      </View>
                      <Text style={styles.equivalentValue}>
                        {impact.equivalents.smartphones_charged.toFixed(0)}
                      </Text>
                      <Text style={styles.equivalentLabel}>Phones Charged</Text>
                    </View>
                    
                    <View style={styles.equivalentCard}>
                      <View style={styles.equivalentIcon}>
                        <WaterIcon />
                      </View>
                      <Text style={styles.equivalentValue}>
                        {impact.equivalents.miles_not_driven.toFixed(0)}
                      </Text>
                      <Text style={styles.equivalentLabel}>Miles Not Driven</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.resourceSection}>
                  <Text style={styles.resourceTitle}>Energy Savings</Text>
                  <View style={styles.resourceCard}>
                    <View style={styles.resourceIconContainer}>
                      <View style={[styles.resourceIcon, { backgroundColor: '#F0FDF4' }]}>
                        <TreeIcon />
                      </View>
                    </View>
                    <View style={styles.resourceContent}>
                      <Text style={styles.resourceValue}>{impact.total_energy_saved_kwh.toFixed(1)} kWh</Text>
                      <Text style={styles.resourceLabel}>Total Energy Saved</Text>
                      <Text style={styles.resourceSubtext}>
                        Enough to power {Math.round(impact.total_energy_saved_kwh / 30)} homes for a day
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}

          {activeTab === 'achievements' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Achievements</Text>
                <Text style={styles.sectionSubtitle}>{profile?.achievements?.length || 0} earned</Text>
              </View>
              <View style={styles.achievementsContainer}>
                {profile?.achievements?.map((achievement, index) => (
                  <View key={index} style={styles.achievementCard}>
                    <View style={styles.achievementIcon}>
                      <AchievementIcon />
                    </View>
                    <View style={styles.achievementContent}>
                      <Text style={styles.achievementTitle}>
                        {achievement.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                      <Text style={styles.achievementDate}>
                        Earned {new Date(achievement.earned_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                  </View>
                )) || (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                      <TrophyIcon />
                    </View>
                    <Text style={styles.emptyTitle}>No Achievements Yet</Text>
                    <Text style={styles.emptySubtitle}>Start scanning items to earn achievements</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getWasteColor(type: string): string {
  if (type.includes('recyclable')) return '#10B981';
  if (type.includes('organic')) return '#D97706';
  if (type === 'hazardous') return '#DC2626';
  if (type === 'e_waste') return '#8B5CF6';
  return '#6B7280';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
    marginBottom: 8,
  },
  memberSinceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberSince: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statContent: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#059669',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  impactSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: 20,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rankLevel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  wasteContainer: {
    gap: 12,
  },
  wasteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  wasteTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  wasteTypeInfo: {
    marginLeft: 12,
  },
  wasteType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  wastePercentage: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  wasteStats: {
    alignItems: 'flex-end',
  },
  wasteCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  wasteBar: {
    width: 100,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  wasteBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressContainer: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressCurrent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressTarget: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  impactMetrics: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  impactMetricCard: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  impactMetricIcon: {
    marginRight: 12,
  },
  impactMetricContent: {
    flex: 1,
  },
  impactMetricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 2,
  },
  impactMetricLabel: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500',
  },
  equivalentsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  equivalentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  equivalentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  equivalentCard: {
    width: (width - 64) / 2,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  equivalentIcon: {
    marginBottom: 12,
  },
  equivalentValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  equivalentLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  resourceSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resourceIconContainer: {
    marginRight: 16,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceContent: {
    flex: 1,
  },
  resourceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  resourceLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  resourceSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  achievementsContainer: {
    gap: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  achievementIcon: {
    marginRight: 16,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});