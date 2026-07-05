from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import Base, engine
from .routers import datasets, evals, projects, rubrics

Base.metadata.create_all(bind=engine)

app = FastAPI(title="EvalPilot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(datasets.router)
app.include_router(rubrics.router)
app.include_router(evals.router)


@app.get("/health")
def health():
    return {"status": "ok"}
