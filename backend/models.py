from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    datasets = relationship("Dataset", back_populates="owner")
    chat_sessions = relationship("ChatSession", back_populates="user")
    alerts = relationship("Alert", back_populates="user")

class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String, index=True)
    description = Column(String, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="uploaded") # uploaded, processing, completed, error
    
    owner = relationship("User", back_populates="datasets")
    rows = relationship("DatasetRow", back_populates="dataset")
    model_runs = relationship("ModelRun", back_populates="dataset")

class DatasetRow(Base):
    """Stores dataset snapshots or real-time ingest batches."""
    __tablename__ = "dataset_rows"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    features = Column(JSON) # e.g., {"f1": 1.2, "f2": 3.4}
    
    dataset = relationship("Dataset", back_populates="rows")
    anomaly = relationship("Anomaly", uselist=False, back_populates="row")

class ModelRun(Base):
    """Tracks execution of ML detection across a dataset or time batch."""
    __tablename__ = "model_runs"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    model_version = Column(String)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String) # running, completed, failed
    anomalies_detected = Column(Integer, default=0)

    dataset = relationship("Dataset", back_populates="model_runs")
    predictions = relationship("Prediction", back_populates="model_run")
    anomalies = relationship("Anomaly", back_populates="model_run")

class Prediction(Base):
    """Stores future anomaly predictions or historical ML outputs."""
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    model_run_id = Column(Integer, ForeignKey("model_runs.id"))
    target_timestamp = Column(DateTime(timezone=True))
    predicted_probability = Column(Float)
    features_used = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    model_run = relationship("ModelRun", back_populates="predictions")

class Anomaly(Base):
    """Records detected anomalies with severity mapping."""
    __tablename__ = "anomalies"
    id = Column(Integer, primary_key=True, index=True)
    row_id = Column(Integer, ForeignKey("dataset_rows.id"))
    model_run_id = Column(Integer, ForeignKey("model_runs.id"), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    severity = Column(String, default="medium") # low, medium, high, critical
    confidence = Column(Float)
    status = Column(String, default="active") # active, acknowledged, resolved
    
    row = relationship("DatasetRow", back_populates="anomaly")
    model_run = relationship("ModelRun", back_populates="anomalies")
    explanation = relationship("AnomalyExplanation", uselist=False, back_populates="anomaly")
    alert = relationship("Alert", uselist=False, back_populates="anomaly")
    feedback = relationship("UserFeedback", back_populates="anomaly")

class AnomalyExplanation(Base):
    """Explainable AI mapping detailing exact feature impact and AI root causes."""
    __tablename__ = "anomaly_explanations"
    id = Column(Integer, primary_key=True, index=True)
    anomaly_id = Column(Integer, ForeignKey("anomalies.id"), unique=True)
    shap_values = Column(JSON)
    surrogate_rules = Column(JSON, nullable=True)
    generated_root_cause = Column(Text, nullable=True) # OpenAI RCA text
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    anomaly = relationship("Anomaly", back_populates="explanation")

class Alert(Base):
    """History of broadcasted alerts."""
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    anomaly_id = Column(Integer, ForeignKey("anomalies.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    channel = Column(String) # ui, email, slack
    message = Column(Text)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)

    anomaly = relationship("Anomaly", back_populates="alert")
    user = relationship("User", back_populates="alerts")

class Report(Base):
    """Historical aggregated metric and AI text reports."""
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    timeframe_start = Column(DateTime(timezone=True))
    timeframe_end = Column(DateTime(timezone=True))
    content = Column(Text)
    structured_data = Column(JSON, nullable=True)
    html_content = Column(Text, nullable=True)
    generated_by = Column(String, default="AI")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ChatSession(Base):
    """Conversational memory context linking."""
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", order_by="ChatMessage.created_at")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    role = Column(String) # 'user' or 'bot'
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("ChatSession", back_populates="messages")

class UserFeedback(Base):
    """Telemetry to improve precision dynamically."""
    __tablename__ = "user_feedback"
    id = Column(Integer, primary_key=True, index=True)
    anomaly_id = Column(Integer, ForeignKey("anomalies.id"), nullable=True)
    rating = Column(Integer) # e.g. 1-5
    comments = Column(Text)
    was_helpful = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    anomaly = relationship("Anomaly", back_populates="feedback")
