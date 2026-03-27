import numpy as np
import pandas as pd
from datetime import timedelta
from typing import Dict, Any, List

class ForecastingService:
    def __init__(self):
        pass

    def forecast_dataset(self, rows_history: List[Dict[str, Any]], periods_ahead: int = 5) -> Dict[str, Any]:
        """
        Calculates future trend extrapolations using polynomial regression over the recent time window.
        Outputs extrapolated features which can be passed to ML models for risk scoring.
        """
        if len(rows_history) < 10:
            raise ValueError("Insufficient history to calculate an accurate forecast. Minimum 10 points required.")
            
        df = pd.DataFrame([r["features"] for r in rows_history])
        df_num = df.select_dtypes(include=[np.number])
        
        # We will use the last 50 points to establish the recent trend
        df_recent = df_num.tail(50).copy()
        x = np.arange(len(df_recent))
        
        extrapolated_features_list = []
        slopes = {}
        
        # 1. Extrapolate future feature values linearly
        for k in range(1, periods_ahead + 1):
            future_point = {}
            for col in df_recent.columns:
                y = df_recent[col].values
                # linear fit: y = mx + c
                m, c = np.polyfit(x, y, 1)
                
                if k == 1:
                    slopes[col] = float(m)
                    
                future_x = len(df_recent) + k
                future_y = m * future_x + c
                future_point[col] = float(future_y)
            extrapolated_features_list.append(future_point)
            
        # Determine aggregate trend
        avg_slope = np.mean(list(slopes.values())) if slopes else 0
        if avg_slope > 0.1:
            trend_direction = "increasing"
        elif avg_slope < -0.1:
            trend_direction = "decreasing"
        else:
            trend_direction = "stable"
            
        # Get timestamps if available to calculate future windows
        last_timestamp = pd.to_datetime(rows_history[-1].get("timestamp", pd.Timestamp.utcnow()))
        
        # Assuming typical data frequency (e.g. 1 minute for streaming, but we estimate dynamically)
        if len(rows_history) >= 2 and "timestamp" in rows_history[0]:
            t1 = pd.to_datetime(rows_history[-1]["timestamp"])
            t2 = pd.to_datetime(rows_history[-2]["timestamp"])
            freq = max(t1 - t2, timedelta(seconds=1))
        else:
            freq = timedelta(minutes=1)
            
        return {
            "extrapolated_features": extrapolated_features_list,
            "trend_direction": trend_direction,
            "base_timestamp": last_timestamp,
            "frequency": freq
        }

forecasting_service = ForecastingService()
