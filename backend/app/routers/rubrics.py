from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/projects/{project_id}/rubrics", tags=["rubrics"])


@router.get("", response_model=list[schemas.RubricOut])
def list_rubrics(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Rubric)
        .filter(models.Rubric.project_id == project_id)
        .order_by(models.Rubric.created_at.asc())
        .all()
    )


@router.post("", response_model=schemas.RubricOut)
def create_rubric(project_id: int, payload: schemas.RubricCreate, db: Session = Depends(get_db)):
    if not db.get(models.Project, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    rubric = models.Rubric(project_id=project_id, **payload.model_dump())
    db.add(rubric)
    db.commit()
    db.refresh(rubric)
    return rubric


@router.delete("/{rubric_id}", status_code=204)
def delete_rubric(project_id: int, rubric_id: int, db: Session = Depends(get_db)):
    rubric = db.get(models.Rubric, rubric_id)
    if not rubric or rubric.project_id != project_id:
        raise HTTPException(status_code=404, detail="Rubric not found")
    db.delete(rubric)
    db.commit()
