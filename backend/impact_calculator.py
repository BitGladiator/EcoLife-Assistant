import numpy as np
from datetime import datetime, timedelta

class ImpactCalculator:
    """
    Calculate environmental impact of recycling decisions
    Based on EPA and environmental research data
    """
    
    def __init__(self):
      
        self.co2_savings = {
            'recyclable_paper': 3.2,   
            'recyclable_plastic': 2.1,   
            'recyclable_glass': 0.3,      
            'recyclable_metal': 9.0,      
            'organic_food': 0.5,           
            'organic_yard': 0.4,
            'e_waste': 15.0,             
        }
        self.average_weights = {
            'recyclable_paper': 0.05,      
            'recyclable_plastic': 0.03,   
            'recyclable_glass': 0.4,     
            'recyclable_metal': 0.015,
            'organic_food': 0.2,          
            'organic_yard': 1.0,        
            'e_waste': 2.0,               
            'hazardous': 0.5,
            'landfill_general': 0.1
        }
        self.water_savings = {
            'recyclable_paper': 50,
            'recyclable_plastic': 20,
            'recyclable_glass': 5,
            'recyclable_metal': 150,
        }
        self.energy_savings = {
            'recyclable_paper': 4.0,
            'recyclable_plastic': 5.8,
            'recyclable_glass': 0.3,
            'recyclable_metal': 14.0,
        }
    
        self.trees_equivalent = {
            'recyclable_paper': 17, 
        }
    
    def calculate_single_item_impact(self, waste_type, confidence=1.0):
        """Calculate impact of recycling a single item"""
        weight = self.average_weights.get(waste_type, 0.1)
        co2_per_kg = self.co2_savings.get(waste_type, 0)
        
        impact = {
            'waste_type': waste_type,
            'co2_saved_kg': round(weight * co2_per_kg * confidence, 4),
            'weight_kg': weight,
            'confidence': confidence
        }
        
        # Add water savings if applicable
        if waste_type in self.water_savings:
            impact['water_saved_liters'] = round(
                self.water_savings[waste_type] * confidence, 2
            )
        
        # Add energy savings if applicable
        if waste_type in self.energy_savings:
            impact['energy_saved_kwh'] = round(
                self.energy_savings[waste_type] * confidence, 2
            )
        
        return impact
    
    def calculate_cumulative_impact(self, scan_history):
        """
        Calculate cumulative environmental impact
        scan_history: list of dicts with 'waste_type' and 'confidence'
        """
        total_co2 = 0
        total_water = 0
        total_energy = 0
        waste_counts = {}
        
        for scan in scan_history:
            waste_type = scan.get('waste_type')
            confidence = scan.get('confidence', 1.0)
            
            impact = self.calculate_single_item_impact(waste_type, confidence)
            
            total_co2 += impact['co2_saved_kg']
            total_water += impact.get('water_saved_liters', 0)
            total_energy += impact.get('energy_saved_kwh', 0)
            
            waste_counts[waste_type] = waste_counts.get(waste_type, 0) + 1
        
        # Calculate equivalents
        equivalents = self.calculate_equivalents(total_co2, total_energy)
        
        return {
            'total_co2_saved_kg': round(total_co2, 2),
            'total_water_saved_liters': round(total_water, 2),
            'total_energy_saved_kwh': round(total_energy, 2),
            'total_items_recycled': len(scan_history),
            'waste_breakdown': waste_counts,
            'equivalents': equivalents,
            'environmental_rank': self.get_environmental_rank(total_co2)
        }
    
    def calculate_equivalents(self, co2_kg, energy_kwh):
        """Convert savings to relatable equivalents"""
        equivalents = {}
        
        # CO2 equivalents
        equivalents['cars_off_road_days'] = round(co2_kg / 4.6, 2)  # 4.6 kg CO2 per car per day
        equivalents['trees_planted'] = round(co2_kg / 21, 2)  # One tree absorbs ~21 kg CO2/year
        equivalents['smartphones_charged'] = round(energy_kwh / 0.012, 0)  # 12 Wh per charge
        equivalents['miles_not_driven'] = round(co2_kg / 0.411, 2)  # 0.411 kg CO2 per mile
        
        return equivalents
    
    def get_environmental_rank(self, total_co2):
        """Determine environmental impact rank"""
        if total_co2 < 1:
            return {'level': 'Eco Beginner', 'icon': '🌱', 'next_level': 1}
        elif total_co2 < 5:
            return {'level': 'Green Guardian', 'icon': '♻️', 'next_level': 5}
        elif total_co2 < 20:
            return {'level': 'Recycling Hero', 'icon': '🌿', 'next_level': 20}
        elif total_co2 < 50:
            return {'level': 'Sustainability Champion', 'icon': '🌳', 'next_level': 50}
        else:
            return {'level': 'Eco Legend', 'icon': '🌍', 'next_level': None}
    
    def predict_monthly_impact(self, current_scans, days_elapsed):
        """Predict monthly impact based on current behavior"""
        if days_elapsed == 0:
            return None
        
        daily_rate = len(current_scans) / days_elapsed
        days_in_month = 30
        
        projected_scans = int(daily_rate * days_in_month)
        projected_co2 = sum([
            self.calculate_single_item_impact(
                scan['waste_type'], 
                scan.get('confidence', 1.0)
            )['co2_saved_kg'] 
            for scan in current_scans
        ]) * (days_in_month / days_elapsed)
        
        return {
            'projected_monthly_scans': projected_scans,
            'projected_co2_kg': round(projected_co2, 2),
            'current_daily_rate': round(daily_rate, 2),
            'days_analyzed': days_elapsed
        }
    
    def generate_personalized_tips(self, waste_breakdown, total_co2):
        """Generate personalized sustainability tips based on user behavior"""
        tips = []
    
        if waste_breakdown:
            most_common = max(waste_breakdown.items(), key=lambda x: x[1])
            waste_type, count = most_common
            
            type_tips = {
                'recyclable_plastic': [
                    "Great job recycling plastic! Consider carrying a reusable water bottle to reduce plastic use.",
                    "Try switching to reusable shopping bags to further reduce plastic waste.",
                ],
                'recyclable_paper': [
                    "Excellent paper recycling! Go digital when possible to save even more trees.",
                    "Consider using both sides of paper before recycling.",
                ],
                'organic_food': [
                    "Composting food waste is great! Consider meal planning to reduce food waste.",
                    "Save vegetable scraps for making homemade stock.",
                ],
            }
            
            if waste_type in type_tips:
                tips.extend(type_tips[waste_type])
    
        if total_co2 < 5:
            tips.append("You're making a difference! Try to recycle at least one item daily to increase your impact.")
        elif total_co2 >= 20:
            tips.append("Amazing work! You're in the top tier of eco-warriors. Consider mentoring others!")
        
        return tips[:3] 
    
    def compare_with_average(self, user_co2, user_scans):
        """Compare user's impact with community average"""
    
        avg_co2_per_user = 10.5  
        avg_scans_per_user = 25
        
        return {
            'user_co2': user_co2,
            'average_co2': avg_co2_per_user,
            'percentile': self.calculate_percentile(user_co2, avg_co2_per_user),
            'user_scans': user_scans,
            'average_scans': avg_scans_per_user,
            'comparison': 'above_average' if user_co2 > avg_co2_per_user else 'below_average'
        }
    
    def calculate_percentile(self, user_value, average_value):
        """Calculate user's percentile (simplified)"""
        if average_value == 0:
            return 50
        
        ratio = user_value / average_value
        percentile = min(99, int(50 + (ratio - 1) * 30))
        return max(1, percentile)

if __name__ == "__main__":
    calculator = ImpactCalculator()
    

    sample_scans = [
        {'waste_type': 'recyclable_plastic', 'confidence': 0.9},
        {'waste_type': 'recyclable_paper', 'confidence': 0.85},
        {'waste_type': 'recyclable_metal', 'confidence': 0.95},
        {'waste_type': 'organic_food', 'confidence': 0.8},
    ]
    
    impact = calculator.calculate_cumulative_impact(sample_scans)
    
    print("Environmental Impact Calculator Test:")
    print(f"Total CO2 Saved: {impact['total_co2_saved_kg']} kg")
    print(f"Trees Planted Equivalent: {impact['equivalents']['trees_planted']}")
    print(f"Environmental Rank: {impact['environmental_rank']['level']}")
    print(f"\nWaste Breakdown: {impact['waste_breakdown']}")