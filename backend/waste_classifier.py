import tensorflow as tf
import numpy as np
import cv2
from tensorflow import keras

class WasteClassifier:
    def __init__(self):
        self.model = None
        self.class_names = ['recyclable', 'organic', 'landfill']
        
    def get_disposal_instructions(self, waste_type):
        instructions = {
            'recyclable': 'Rinse if needed and place in recycling bin',
            'organic': 'Compost in green bin or backyard compost',
            'landfill': 'Place in general waste bin'
        }
        return instructions.get(waste_type, 'Check local disposal guidelines')
    
    def create_model(self):
        """Create a simple CNN model for waste classification"""
        model = keras.Sequential([
            keras.layers.Input(shape=(224, 224, 3)),
            
            keras.layers.Conv2D(32, (3, 3), activation='relu'),
            keras.layers.MaxPooling2D(2, 2),
             
            keras.layers.Conv2D(64, (3, 3), activation='relu'),
            keras.layers.MaxPooling2D(2, 2),
            
            keras.layers.Conv2D(128, (3, 3), activation='relu'),
            keras.layers.MaxPooling2D(2, 2),
            
            keras.layers.Flatten(),
            keras.layers.Dense(512, activation='relu'),
            keras.layers.Dropout(0.5),
            keras.layers.Dense(3, activation='softmax')  
        ])
        
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        self.model = model
        return model
    
    def train_dummy_data(self):
        """Create dummy data for testing (we'll use real data later)"""
        x_train = np.random.random((100, 224, 224, 3)).astype(np.float32)
        y_train = np.random.randint(0, 3, (100,))
        y_train = keras.utils.to_categorical(y_train, 3)
        
        return x_train, y_train
    
    def predict(self, image):
        """Predict waste type from image"""
        try:
            if self.model is None:
                self.create_model()
            
            image = cv2.resize(image, (224, 224))
            image = image / 255.0 
            image = np.expand_dims(image, axis=0)
            
            predictions = self.model.predict(image)
            class_idx = np.argmax(predictions[0])
            confidence = predictions[0][class_idx]
            
            waste_type = self.class_names[class_idx]
            confidence_value = float(confidence)
            
            # FIXED: Return a dictionary instead of a tuple
            return {
                'waste_type': waste_type,
                'confidence': confidence_value,
                'disposal_instructions': self.get_disposal_instructions(waste_type)
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'waste_type': 'unclassified',
                'confidence': 0.0,
                'disposal_instructions': 'Prediction error occurred'
            }

if __name__ == "__main__":
    classifier = WasteClassifier()
    classifier.create_model()

    x_train, y_train = classifier.train_dummy_data()
    
    print("Waste Classifier created successfully!")
    print(f"Model summary:")
    classifier.model.summary()