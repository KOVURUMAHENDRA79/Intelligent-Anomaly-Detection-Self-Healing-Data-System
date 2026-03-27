import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer
import shap
import joblib
import os
from typing import Dict, Any, Tuple

class MLService:
    def __init__(self):
        self.model = None
        self.explainer = None
        self.imputer = None
        self.model_path = "model.joblib"
        self.imputer_path = "imputer.joblib"
        self.feature_names = []

    def preprocess_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Selects numeric columns and handles missing values cleanly."""
        # 1. Select only numeric features
        df_numeric = df.select_dtypes(include=[np.number])
        
        # 2. Store feature names upon first ingest so we can validate incoming streams
        if not self.feature_names:
            self.feature_names = df_numeric.columns.tolist()
        else:
            # Reindex to force column order and add missing columns as NaN
            df_numeric = df_numeric.reindex(columns=self.feature_names)
            
        # 3. Handle Missing Values
        if self.imputer is None:
            self.imputer = SimpleImputer(strategy='median')
            imputed_array = self.imputer.fit_transform(df_numeric)
            joblib.dump(self.imputer, self.imputer_path)
        else:
            imputed_array = self.imputer.transform(df_numeric)
            
        return pd.DataFrame(imputed_array, columns=self.feature_names)

    def train(self, df: pd.DataFrame):
        """Trains or retrains the IsolationForest model on a full dataset."""
        df_clean = self.preprocess_dataframe(df)
        
        # Isolation Forest is robust and scalable
        # contamination="auto" or explicitly defined float e.g., 0.05
        self.model = IsolationForest(contamination=0.05, random_state=42)
        X = df_clean.values
        self.model.fit(X)
        
        # Create strict explainer
        self.explainer = shap.TreeExplainer(self.model)
        
        # Persist model
        joblib.dump(self.model, self.model_path)
        
    def initialize_model(self):
        """Loads persisting model on startup or creates mock baseline."""
        if os.path.exists(self.model_path) and os.path.exists(self.imputer_path):
            self.model = joblib.load(self.model_path)
            self.imputer = joblib.load(self.imputer_path)
            self.explainer = shap.TreeExplainer(self.model)
            # Cannot easily load feature_names dynamically without another file; hardcoding for synthetic mock
            self.feature_names = ["feature_1", "feature_2", "feature_3"]
        else:
            # Mock initial train for out-of-the-box working stream
            df_mock = pd.DataFrame(np.random.normal(loc=0, scale=1, size=(1000, 3)), columns=["feature_1", "feature_2", "feature_3"])
            self.train(df_mock)

    def _calculate_severity(self, confidence: float) -> str:
        """Business logic calculating dynamic severity string mapping from confidence."""
        if confidence >= 0.90:
            return "critical"
        elif confidence >= 0.75:
            return "high"
        elif confidence >= 0.50:
            return "medium"
        return "low"

    def predict(self, features: Dict[str, float]) -> Tuple[bool, float, str, float, Dict[str, float]]:
        """
        Reusable pipeline for streaming or iterative dataset rows.
        Returns: 
           is_anomaly: bool,
           anomaly_score: float, 
           severity: str, 
           confidence: float, 
           shap_dict: Dict
        """
        if self.model is None or self.explainer is None:
            self.initialize_model()
            
        # 1. Transform dict to single-row df to utilize robust preprocessing
        df_single = pd.DataFrame([features])
        df_clean = self.preprocess_dataframe(df_single)
        X = df_clean.values
        
        # 2. Extract ML Scores
        # predict: +1 for normal, -1 for anomaly
        label = self.model.predict(X)[0]
        # decision_function: The lower, the more abnormal.
        anomaly_score = self.model.decision_function(X)[0]
        
        is_anomaly = True if label == -1 else False
        
        # Configure confidence score [0, 1] bounds from absolute magnitude
        # This is a synthetic transformation meant for UI/Business logic comprehension
        confidence = float(np.clip(np.abs(anomaly_score) * 1.5, 0, 1.0))
        
        severity = self._calculate_severity(confidence) if is_anomaly else "none"
        
        # 3. Calculate Explainability
        shap_vals = self.explainer.shap_values(X)
        shap_dict = {
            self.feature_names[i]: float(shap_vals[0][i]) for i in range(len(self.feature_names))
        }
        
        return is_anomaly, float(anomaly_score), severity, confidence, shap_dict

ml_service = MLService()
