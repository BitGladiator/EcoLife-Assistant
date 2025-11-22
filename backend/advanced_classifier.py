import numpy as np
import cv2
import tensorflow as tf
from waste_categories import ADVANCED_WASTE_CATEGORIES, get_eco_tips

class AdvancedWasteClassifier:
    def __init__(self):
        self.categories = ADVANCED_WASTE_CATEGORIES
        self.model = self.create_model()
        self.train_dummy()  
        
    def create_model(self):
        model = tf.keras.Sequential([
            tf.keras.layers.Conv2D(32, (3,3), activation='relu', input_shape=(224,224,3)),
            tf.keras.layers.MaxPooling2D(2,2),
            tf.keras.layers.Conv2D(64, (3,3), activation='relu'),
            tf.keras.layers.MaxPooling2D(2,2),
            tf.keras.layers.Conv2D(128, (3,3), activation='relu'),
            tf.keras.layers.MaxPooling2D(2,2),
            tf.keras.layers.Flatten(),
            tf.keras.layers.Dense(512, activation='relu'),
            tf.keras.layers.Dropout(0.5),
            tf.keras.layers.Dense(9, activation='softmax')
        ])
        
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        return model
    
    def train_dummy(self):
        x_train = np.random.random((100, 224, 224, 3)).astype(np.float32)
        y_train = tf.keras.utils.to_categorical(np.random.randint(0, 9, (100,)), 9)
        
        self.model.fit(x_train, y_train, epochs=1, verbose=0)
        print("TensorFlow model trained with dummy data")
    
    def predict(self, image):
        try:
            image = cv2.resize(image, (224, 224))
            image = image.astype(np.float32) / 255.0
            image = np.expand_dims(image, axis=0)
            
            prediction = self.model.predict(image, verbose=0)
            class_idx = np.argmax(prediction[0])
            confidence = float(prediction[0][class_idx])
            
            waste_type = self.get_category_name(class_idx)
            
            category_info = self.categories.get(waste_type, self.categories['landfill_general'])
            eco_tips = get_eco_tips(waste_type, confidence)
            
            return {
                'waste_type': waste_type,
                'category_name': category_info['name'],
                'confidence': round(confidence, 2),
                'subcategories': category_info['subcategories'],
                'disposal_instructions': category_info['disposal_instructions'],
                'recycling_code': category_info['recycling_code'],
                'eco_tips': eco_tips,
                'contamination_warnings': category_info['contamination_warnings']
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'waste_type': 'unknown',
                'confidence': 0.0
            }
    
    def get_category_name(self, class_idx):
        category_mapping = {
            0: 'recyclable_paper',
            1: 'recyclable_plastic', 
            2: 'recyclable_glass',
            3: 'recyclable_metal',
            4: 'organic_food',
            5: 'organic_yard',
            6: 'landfill_general',
            7: 'hazardous',
            8: 'e_waste'
        }
        return category_mapping.get(class_idx, 'landfill_general')