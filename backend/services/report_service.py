import os
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
from ..models import Anomaly, AnomalyExplanation, Prediction, Report
from .openai_service import openai_service

class ReportGeneratorService:
    def __init__(self):
        pass

    def _generate_html_template(self, structured_data: dict, text_content: str) -> str:
        """Constructs a basic but clean HTML string optimized for printing to PDF."""
        stats = structured_data["statistics"]
        rcas = structured_data["root_causes"]
        
        rca_list = "".join([f"<li><b>{rca['primary_cause']}</b>: Appeared {rca['count']} times</li>" for rca in rcas[:5]])
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }}
                h1 {{ color: #1F2937; border-bottom: 2px solid #3B82F6; padding-bottom: 10px; }}
                h2 {{ color: #374151; margin-top: 30px; }}
                .stats-grid {{ display: flex; gap: 20px; margin-bottom: 30px; }}
                .stat-box {{ background: #F3F4F6; padding: 20px; border-radius: 8px; flex: 1; text-align: center; }}
                .stat-value {{ font-size: 24px; font-weight: bold; color: #DC2626; }}
                .summary {{ background: #EFF6FF; padding: 20px; border-left: 4px solid #3B82F6; margin-bottom: 30px; white-space: pre-wrap; }}
            </style>
        </head>
        <body>
            <h1>Automated System Health Report</h1>
            <p><strong>Timeframe:</strong> {structured_data['timeframe']['start']} to {structured_data['timeframe']['end']}</p>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <div>Total Anomalies</div>
                    <div class="stat-value">{stats['total_anomalies']}</div>
                </div>
                <div class="stat-box">
                    <div>Critical Events</div>
                    <div class="stat-value">{stats['critical_anomalies']}</div>
                </div>
                <div class="stat-box">
                    <div>Future Average Risk</div>
                    <div class="stat-value">{(structured_data.get('predictions_summary', {{}}).get('average_risk_score', 0) * 100):.1f}%</div>
                </div>
            </div>

            <h2>Executive Summary & Recommendations</h2>
            <div class="summary">{text_content}</div>

            <h2>Primary Identified Root Causes</h2>
            <ul>{rca_list if rca_list else "<li>No prominent root causes calculated.</li>"}</ul>
            
            <p style="text-align: center; color: #9CA3AF; margin-top: 50px; font-size: 12px;">Generated automatically by ERTAIS AI Intelligence</p>
        </body>
        </html>
        """
        return html

    def generate_report(self, db: Session, timeframe_hours: int) -> Report:
        """Aggregates db data, instructs OpenAI to format insights, and compiles PDF-ready structures."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=timeframe_hours)
        
        # 1. Fetch exact raw data
        anomalies = db.query(Anomaly).filter(Anomaly.timestamp >= start_time).all()
        
        total = len(anomalies)
        critical = sum(1 for a in anomalies if a.severity == "critical")
        
        # Most severe anomaly
        most_severe = None
        if total > 0:
            most_severe_obj = max(anomalies, key=lambda x: x.confidence)
            most_severe = {"anomaly_id": most_severe_obj.id, "confidence": most_severe_obj.confidence}

        # Root causes frequency
        rca_counts = {}
        for a in anomalies:
            expl = db.query(AnomalyExplanation).filter(AnomalyExplanation.anomaly_id == a.id).first()
            if expl and expl.generated_root_cause:
                try:
                    rca_dict = json.loads(expl.generated_root_cause)
                    cause = rca_dict.get("primary_cause", "Unknown")
                    rca_counts[cause] = rca_counts.get(cause, 0) + 1
                except:
                    pass
                    
        sorted_rcas = sorted([{"primary_cause": k, "count": v} for k, v in rca_counts.items()], key=lambda x: x["count"], reverse=True)

        # Predictions Summary
        preds = db.query(Prediction).filter(Prediction.created_at >= start_time).all()
        avg_risk = sum(p.predicted_probability for p in preds) / len(preds) if preds else 0.0
        
        # Generate trend
        trend = "Stable"
        if len(preds) > 5:
            last_3 = sum(p.predicted_probability for p in preds[-3:]) / 3
            first_3 = sum(p.predicted_probability for p in preds[:3]) / 3
            if last_3 > first_3 + 0.1:
                trend = "Increasing Risk"
            elif last_3 < first_3 - 0.1:
                trend = "Decreasing Risk"

        structured_data = {
            "timeframe": {"start": str(start_time), "end": str(end_time)},
            "statistics": {
                "total_anomalies": total,
                "critical_anomalies": critical,
                "most_severe_anomaly": most_severe
            },
            "root_causes": sorted_rcas,
            "predictions_summary": {
                "average_risk_score": avg_risk,
                "trend": trend
            }
        }

        # 2. Instruct OpenAI to build Human-Readable text & Recommended Actions using exact constraints
        prompt = (
            f"Write a 3-paragraph executive report based strictly on the following aggregated data from the last {timeframe_hours} hours. "
            f"Data: {json.dumps(structured_data)}. "
            "Paragraph 1: Summary of anomalies and severity. "
            "Paragraph 2: Deep dive strictly into the most common Root Causes listed, explaining their likely context. "
            "Paragraph 3: Explicit 'Recommended Actions' based on the predicted future risk trend."
        )
        
        text_content = openai_service.generate_report_text(prompt)
        
        # 3. Compile final HTML string
        html_content = self._generate_html_template(structured_data, text_content)
        
        # 4. Save
        report = Report(
            title=f"Automated AI System Report - Last {timeframe_hours} Hrs",
            timeframe_start=start_time,
            timeframe_end=end_time,
            content=text_content,
            structured_data=structured_data,
            html_content=html_content
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        
        return report

report_generator = ReportGeneratorService()
