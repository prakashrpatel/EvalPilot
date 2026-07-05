from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import evaluators, models, schemas
from ..database import get_db
from ..models import utcnow

router = APIRouter(tags=["evals"])


@router.get("/projects/{project_id}/eval-runs", response_model=list[schemas.EvalRunOut])
def list_eval_runs(project_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.EvalRun)
        .filter(models.EvalRun.project_id == project_id)
        .order_by(models.EvalRun.created_at.desc())
        .all()
    )


@router.post("/projects/{project_id}/eval-runs", response_model=schemas.EvalRunDetailOut)
def run_eval(project_id: int, payload: schemas.EvalRunCreate, db: Session = Depends(get_db)):
    project = db.get(models.Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    dataset = db.get(models.Dataset, payload.dataset_id)
    if not dataset or dataset.project_id != project_id:
        raise HTTPException(status_code=404, detail="Dataset not found in this project")

    rubrics = db.query(models.Rubric).filter(models.Rubric.project_id == project_id).all()
    if not rubrics:
        raise HTTPException(status_code=400, detail="Define at least one rubric before running an eval")

    test_cases = {tc.id: tc for tc in dataset.test_cases}
    if not test_cases:
        raise HTTPException(status_code=400, detail="Dataset has no test cases")

    eval_run = models.EvalRun(
        project_id=project_id,
        dataset_id=payload.dataset_id,
        name=payload.name,
        version_label=payload.version_label,
        status="completed",
    )
    db.add(eval_run)
    db.flush()

    for test_case_id, ai_output in payload.outputs.items():
        test_case = test_cases.get(int(test_case_id))
        if not test_case:
            continue

        metric_results = [evaluators.run_check(rubric, ai_output, test_case) for rubric in rubrics]
        blocker_results = [m for m in metric_results if m["is_launch_blocker"]]
        overall_pass = (
            all(m["passed"] for m in blocker_results)
            if blocker_results
            else all(m["passed"] for m in metric_results)
        )

        result = models.EvalResult(
            eval_run_id=eval_run.id,
            test_case_id=test_case.id,
            ai_output=ai_output,
            metric_results=metric_results,
            overall_pass=overall_pass,
        )
        db.add(result)

    db.commit()
    db.refresh(eval_run)
    return eval_run


@router.get("/eval-runs/{eval_run_id}", response_model=schemas.EvalRunDetailOut)
def get_eval_run(eval_run_id: int, db: Session = Depends(get_db)):
    eval_run = db.get(models.EvalRun, eval_run_id)
    if not eval_run:
        raise HTTPException(status_code=404, detail="Eval run not found")
    return eval_run


@router.patch("/eval-results/{result_id}/review", response_model=schemas.EvalResultOut)
def review_result(result_id: int, payload: schemas.ReviewUpdate, db: Session = Depends(get_db)):
    result = db.get(models.EvalResult, result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    result.human_override = payload.human_override
    result.reviewer_comment = payload.reviewer_comment
    result.corrected_output = payload.corrected_output
    result.reviewed = True
    result.reviewed_at = utcnow()
    db.commit()
    db.refresh(result)
    return result


@router.get("/projects/{project_id}/review-queue", response_model=list[schemas.ReviewQueueItem])
def get_review_queue(project_id: int, include_reviewed: bool = False, db: Session = Depends(get_db)):
    query = (
        db.query(models.EvalResult)
        .join(models.EvalRun, models.EvalResult.eval_run_id == models.EvalRun.id)
        .filter(models.EvalRun.project_id == project_id)
        .filter(models.EvalResult.overall_pass.is_(False))
    )
    if not include_reviewed:
        query = query.filter(models.EvalResult.reviewed.is_(False))

    results = query.order_by(models.EvalResult.id.desc()).all()

    items = []
    for r in results:
        tc = r.test_case
        items.append(
            schemas.ReviewQueueItem(
                result_id=r.id,
                eval_run_id=r.eval_run.id,
                eval_run_name=r.eval_run.name,
                version_label=r.eval_run.version_label,
                test_case_id=tc.id,
                input_prompt=tc.input_prompt,
                expected_output=tc.expected_output,
                severity=tc.severity,
                tags=tc.tags,
                ai_output=r.ai_output,
                metric_results=r.metric_results,
                overall_pass=r.overall_pass,
                human_override=r.human_override,
                reviewer_comment=r.reviewer_comment,
                corrected_output=r.corrected_output,
                reviewed=r.reviewed,
                reviewed_at=r.reviewed_at,
            )
        )
    return items


@router.get("/projects/{project_id}/eval-runs/compare")
def compare_eval_runs(project_id: int, run_a: int, run_b: int, db: Session = Depends(get_db)):
    def summarize(eval_run_id: int):
        eval_run = db.get(models.EvalRun, eval_run_id)
        if not eval_run or eval_run.project_id != project_id:
            raise HTTPException(status_code=404, detail=f"Eval run {eval_run_id} not found in project")
        results = eval_run.results
        total = len(results)
        passed = sum(1 for r in results if r.overall_pass)
        metric_pass_rates: dict[str, dict[str, int]] = {}
        for r in results:
            for m in r.metric_results:
                bucket = metric_pass_rates.setdefault(m["metric_name"], {"passed": 0, "total": 0})
                bucket["total"] += 1
                if m["passed"]:
                    bucket["passed"] += 1
        return {
            "eval_run_id": eval_run.id,
            "name": eval_run.name,
            "version_label": eval_run.version_label,
            "total": total,
            "passed": passed,
            "pass_rate": (passed / total) if total else 0,
            "metric_pass_rates": {
                k: (v["passed"] / v["total"] if v["total"] else 0) for k, v in metric_pass_rates.items()
            },
        }

    summary_a = summarize(run_a)
    summary_b = summarize(run_b)
    delta = summary_b["pass_rate"] - summary_a["pass_rate"]
    return {"run_a": summary_a, "run_b": summary_b, "pass_rate_delta": delta}
