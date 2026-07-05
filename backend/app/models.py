import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .database import Base


def utcnow():
    return datetime.datetime.utcnow()


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    use_case_type = Column(String, default="chatbot")  # chatbot, rag, summarization, content_generation, agent
    owner = Column(String, default="")
    created_at = Column(DateTime, default=utcnow)

    datasets = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")
    rubrics = relationship("Rubric", back_populates="project", cascade="all, delete-orphan")
    eval_runs = relationship("EvalRun", back_populates="project", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    version = Column(String, default="v1")
    source = Column(String, default="manual")  # manual, csv_upload, json_upload
    created_at = Column(DateTime, default=utcnow)

    project = relationship("Project", back_populates="datasets")
    test_cases = relationship("TestCase", back_populates="dataset", cascade="all, delete-orphan")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    input_prompt = Column(Text, nullable=False)
    expected_output = Column(Text, default="")
    context = Column(Text, default="")
    tags = Column(String, default="")  # comma-separated
    severity = Column(String, default="medium")  # low, medium, high, critical
    is_golden = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

    dataset = relationship("Dataset", back_populates="test_cases")


class Rubric(Base):
    __tablename__ = "rubrics"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    metric_name = Column(String, nullable=False)
    description = Column(Text, default="")
    check_type = Column(String, nullable=False)
    # exact_match, contains, regex, forbidden_words, json_valid, reference_similarity
    config = Column(JSON, default=dict)
    # e.g. {"keywords": [...]}, {"pattern": "..."}, {"forbidden": [...]}, {"threshold": 0.8}
    severity = Column(String, default="medium")
    is_launch_blocker = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)

    project = relationship("Project", back_populates="rubrics")


class EvalRun(Base):
    __tablename__ = "eval_runs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    name = Column(String, default="")
    version_label = Column(String, default="")  # e.g. "prompt-v2", free text for comparison
    status = Column(String, default="completed")  # running, completed, failed
    created_at = Column(DateTime, default=utcnow)

    project = relationship("Project", back_populates="eval_runs")
    dataset = relationship("Dataset")
    results = relationship("EvalResult", back_populates="eval_run", cascade="all, delete-orphan")


class EvalResult(Base):
    __tablename__ = "eval_results"

    id = Column(Integer, primary_key=True, index=True)
    eval_run_id = Column(Integer, ForeignKey("eval_runs.id"), nullable=False)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False)
    ai_output = Column(Text, default="")
    metric_results = Column(JSON, default=list)
    # list of {rubric_id, metric_name, passed, detail, is_launch_blocker}
    overall_pass = Column(Boolean, default=False)
    human_override = Column(Boolean, nullable=True)
    reviewer_comment = Column(Text, default="")
    corrected_output = Column(Text, default="")
    reviewed = Column(Boolean, default=False)
    reviewed_at = Column(DateTime, nullable=True)

    eval_run = relationship("EvalRun", back_populates="results")
    test_case = relationship("TestCase")
