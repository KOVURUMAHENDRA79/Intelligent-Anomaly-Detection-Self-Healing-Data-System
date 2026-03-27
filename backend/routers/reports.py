from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
import json
from ..database import get_db
from ..models import Report, Anomaly
from ..schemas import ReportResponse
from ..services.report_service import report_generator

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/", response_model=List[ReportResponse])
def get_reports(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """Fetch history of AI generated system reports."""
    reports = db.query(Report).order_by(Report.id.desc()).offset(skip).limit(limit).all()
    return reports

@router.post("/generate", response_model=ReportResponse)
def generate_ai_report(timeframe_hours: int = 24, db: Session = Depends(get_db)):
    """Generate a comprehensive summary report of the system using exact DB data sets."""
    return report_generator.generate_report(db, timeframe_hours)

@router.get("/{id}/download/json")
def download_report_json(id: int, db: Session = Depends(get_db)):
    """Export purely the programmatic structured output of the report."""
    report = db.query(Report).filter(Report.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    return Response(
        content=json.dumps(report.structured_data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=report_{id}.json"}
    )
    
@router.get("/{id}/download/html")
def download_report_html(id: int, db: Session = Depends(get_db)):
    """Export the PDF-ready HTML visual representation."""
    report = db.query(Report).filter(Report.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if not report.html_content:
        raise HTTPException(status_code=400, detail="HTML content missing for this legacy report.")
        
    return Response(
        content=report.html_content,
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=report_{id}.html"}
    )
