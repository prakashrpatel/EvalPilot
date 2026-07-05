import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    use_case_type: str = "chatbot"
    owner: str = ""


class ProjectOut(ProjectCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime.datetime


class DatasetCreate(BaseModel):
    name: str
    version: str = "v1"
    source: str = "manual"


class DatasetOut(DatasetCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    created_at: datetime.datetime


class TestCaseCreate(BaseModel):
    input_prompt: str
    expected_output: str = ""
    context: str = ""
    tags: str = ""
    severity: str = "medium"
    is_golden: bool = True


class TestCaseOut(TestCaseCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    dataset_id: int
    created_at: datetime.datetime


class RubricCreate(BaseModel):
    metric_name: str
    description: str = ""
    check_type: str  # exact_match, contains, regex, forbidden_words, json_valid, reference_similarity
    config: dict[str, Any] = {}
    severity: str = "medium"
    is_launch_blocker: bool = False


class RubricOut(RubricCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    created_at: datetime.datetime


class EvalRunCreate(BaseModel):
    dataset_id: int
    name: str = ""
    version_label: str = ""
    outputs: dict[int, str]  # test_case_id -> ai_output


class MetricResult(BaseModel):
    rubric_id: int
    metric_name: str
    passed: bool
    detail: str
    is_launch_blocker: bool


class EvalResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    test_case_id: int
    ai_output: str
    metric_results: list[dict[str, Any]]
    overall_pass: bool
    human_override: Optional[bool] = None
    reviewer_comment: str = ""
    corrected_output: str = ""
    reviewed: bool = False
    reviewed_at: Optional[datetime.datetime] = None


class EvalRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    dataset_id: int
    name: str
    version_label: str
    status: str
    created_at: datetime.datetime


class EvalRunDetailOut(EvalRunOut):
    results: list[EvalResultOut]


class ReviewUpdate(BaseModel):
    human_override: Optional[bool] = None
    reviewer_comment: str = ""
    corrected_output: str = ""


class ReviewQueueItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    result_id: int
    eval_run_id: int
    eval_run_name: str
    version_label: str
    test_case_id: int
    input_prompt: str
    expected_output: str
    severity: str
    tags: str
    ai_output: str
    metric_results: list[dict[str, Any]]
    overall_pass: bool
    human_override: Optional[bool] = None
    reviewer_comment: str = ""
    corrected_output: str = ""
    reviewed: bool = False
    reviewed_at: Optional[datetime.datetime] = None
