import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple

class RootCauseAnalyzer:
    def __init__(self):
        pass

    def _calculate_baseline_stats(self, baseline_df: pd.DataFrame) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """Calculates means, standard deviations, and correlation matrix from the baseline."""
        means = baseline_df.mean()
        stds = baseline_df.std()
        # fill 0 for zero-variance to avoid divide by zero errors later
        stds = stds.replace(0, 1e-9) 
        corr_matrix = baseline_df.corr().fillna(0)
        return means, stds, corr_matrix

    def analyze(self, anomaly_features: Dict[str, float], baseline_history: List[Dict[str, float]], shap_values: Dict[str, float]) -> Dict[str, Any]:
        """
        Data-driven analysis determining exact primary/secondary causes utilizing 
        window-based deviations, correlations, and SHAP feature importances.
        """
        if not baseline_history:
            # Fallback if no history exists yet
            top_feature = max(shap_values.items(), key=lambda x: abs(x[1]))[0] if shap_values else "Unknown"
            return {
                "primary_cause": top_feature,
                "secondary_causes": [],
                "confidence_per_cause": {top_feature: 1.0},
                "evidence_used": {"shap_importance": abs(shap_values.get(top_feature, 0))},
                "plain_english_explanation": f"Insufficient historical baseline. The anomaly is primarily flagged based on extreme SHAP values in {top_feature}."
            }

        df = pd.DataFrame(baseline_history)
        # Select numeric
        df_num = df.select_dtypes(include=[np.number])
        means, stds, corr_matrix = self._calculate_baseline_stats(df_num)

        # 1. Feature Importance (SHAP)
        sorted_shap = sorted(shap_values.items(), key=lambda x: abs(x[1]), reverse=True)
        primary_feature = sorted_shap[0][0] if sorted_shap else "Unknown"
        
        # 2. Z-Score Deviation against baseline
        focus_val = anomaly_features.get(primary_feature, 0)
        focus_mean = means.get(primary_feature, 0)
        focus_std = stds.get(primary_feature, 1)
        z_score = abs(focus_val - focus_mean) / focus_std

        # 3. Identify Secondary Causes via Correlation & SHAP
        secondary_causes = []
        confidence_per_cause = {primary_feature: min(abs(shap_values.get(primary_feature, 0)) + (z_score / 10), 1.0)}
        
        # Look for features that are highly correlated with primary feature AND have some SHAP weight
        if primary_feature in corr_matrix.columns:
            correlations = corr_matrix[primary_feature]
            for feature, corr_val in correlations.items():
                if feature != primary_feature and abs(corr_val) > 0.6: # Strong correlation threshold
                    shap_impact = abs(shap_values.get(feature, 0))
                    if shap_impact > 0.05: # Secondary must have some actual model impact
                        secondary_causes.append(feature)
                        confidence_per_cause[feature] = min(abs(corr_val) * shap_impact * 2, 0.9)

        # 4. Trend Change (Baseline vs Recent Window)
        trend_msg = "stable"
        if len(df_num) > 10:
            recent_mean = df_num[primary_feature].tail(5).mean()
            old_mean = df_num[primary_feature].head(len(df_num)-5).mean()
            if recent_mean > old_mean + focus_std:
                trend_msg = "rapidly increasing"
            elif recent_mean < old_mean - focus_std:
                trend_msg = "rapidly decreasing"

        # 5. Formulate Evidence
        evidence = {
            "baseline_mean": float(focus_mean),
            "anomaly_value": float(focus_val),
            "z_score_deviation": float(z_score),
            "trend": trend_msg,
            "correlations": {f: float(corr_matrix[primary_feature].get(f, 0)) for f in secondary_causes}
        }

        # 6. Plain English Construction
        explanation = (
            f"The primary driver for this anomaly is '{primary_feature}' which deviated "
            f"by {z_score:.2f} standard deviations from the historical baseline "
            f"(valued at {focus_val:.2f} compared to the average {focus_mean:.2f}). "
        )
        if trend_msg != "stable":
            explanation += f"We observed a {trend_msg} trend just before the spike. "
            
        if secondary_causes:
            explanation += f"Additionally, secondary factors like {', '.join(secondary_causes)} contributed to the event due to strong covariance."

        return {
            "primary_cause": primary_feature,
            "secondary_causes": secondary_causes,
            "confidence_per_cause": {k: float(v) for k, v in confidence_per_cause.items()},
            "evidence_used": evidence,
            "plain_english_explanation": explanation
        }

rca_analyzer = RootCauseAnalyzer()
