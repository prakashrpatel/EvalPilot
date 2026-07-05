import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["datasets"])


@router.get("/projects/{project_id}/datasets", response_model=list[schemas.DatasetOut])
def list_datasets(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Dataset)
        .filter(models.Dataset.project_id == project_id)
        .order_by(models.Dataset.created_at.desc())
        .all()
    )


@router.post("/projects/{project_id}/datasets", response_model=schemas.DatasetOut)
def create_dataset(project_id: int, payload: schemas.DatasetCreate, db: Session = Depends(get_db)):
    if not db.get(models.Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    dataset = models.Dataset(project_id=project_id, **payload.model_dump())
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


@router.get("/datasets/{dataset_id}/test-cases", response_model=list[schemas.TestCaseOut])
def list_test_cases(dataset_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.TestCase)
        .filter(models.TestCase.dataset_id == dataset_id)
        .order_by(models.TestCase.id.asc())
        .all()
    )


@router.post("/datasets/{dataset_id}/test-cases", response_model=schemas.TestCaseOut)
def create_test_case(dataset_id: int, payload: schemas.TestCaseCreate, db: Session = Depends(get_db)):
    if not db.get(models.Dataset, dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")
    test_case = models.TestCase(dataset_id=dataset_id, **payload.model_dump())
    db.add(test_case)
    db.commit()
    db.refresh(test_case)
    return test_case


@router.delete("/test-cases/{test_case_id}", status_code=204)
def delete_test_case(test_case_id: int, db: Session = Depends(get_db)):
    test_case = db.get(models.TestCase, test_case_id)
    if not test_case:
        raise HTTPException(status_code=404, detail="Test case not found")
    db.delete(test_case)
    db.commit()


@router.post("/datasets/{dataset_id}/import", response_model=list[schemas.TestCaseOut])
async def import_test_cases(dataset_id: int, file: UploadFile, db: Session = Depends(get_db)):
    """Bulk import test cases from a CSV or JSON file.

    Expected columns/keys: input_prompt, expected_output, context, tags, severity, is_golden
    """
    dataset = db.get(models.Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    raw = (await file.read()).decode("utf-8-sig")
    rows: list[dict]

    if (file.filename or "").lower().endswith(".json"):
        parsed = json.loads(raw)
        rows = parsed if isinstance(parsed, list) else parsed.get("test_cases", [])
    else:
        reader = csv.DictReader(io.StringIO(raw))
        rows = list(reader)

    created = []
    for row in rows:
        if not row.get("input_prompt"):
            continue
        is_golden_raw = row.get("is_golden", True)
        if isinstance(is_golden_raw, str):
            is_golden = is_golden_raw.strip().lower() not in ("false", "0", "no", "")
        else:
            is_golden = bool(is_golden_raw)

        test_case = models.TestCase(
            dataset_id=dataset_id,
            input_prompt=row.get("input_prompt", ""),
            expected_output=row.get("expected_output", "") or "",
            context=row.get("context", "") or "",
            tags=row.get("tags", "") or "",
            severity=row.get("severity", "medium") or "medium",
            is_golden=is_golden,
        )
        db.add(test_case)
        created.append(test_case)

    db.commit()
    for tc in created:
        db.refresh(tc)
    return created
