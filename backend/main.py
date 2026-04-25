from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

from peec_client import PeecClient
from prompt_recommender import DEFAULT_MODEL as RECOMMENDER_MODEL, PromptRecommender
from sentiment_flip_agent import DEFAULT_MODEL, SentimentFlipAgent
from source_infiltration_agent import (
    DEFAULT_MODEL as INFILTRATION_MODEL,
    SourceInfiltrationAgent,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/projects")
async def list_projects():
    async with PeecClient() as peec:
        return {"data": await peec.list_projects()}


@app.get("/brands")
async def list_brands(project_id: str):
    async with PeecClient(project_id=project_id) as peec:
        return {"data": await peec.list_brands()}


class SentimentFlipRequest(BaseModel):
    project_id: str
    days: int = 14
    max_chats: int = 50
    brand_id: str | None = None
    model: str = DEFAULT_MODEL


@app.post("/agents/sentiment-flip")
async def run_sentiment_flip(req: SentimentFlipRequest):
    try:
        async with PeecClient(project_id=req.project_id) as peec:
            agent = SentimentFlipAgent(peec, model=req.model)
            report = await agent.run(
                days=req.days,
                max_chats=req.max_chats,
                brand_id=req.brand_id,
            )
        return report.to_dict()
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


class RecommendPromptsRequest(BaseModel):
    project_id: str
    brand_id: str
    count: int = 12
    model: str = RECOMMENDER_MODEL


@app.post("/agents/recommend-prompts")
async def recommend_prompts(req: RecommendPromptsRequest):
    try:
        async with PeecClient(project_id=req.project_id) as peec:
            rec = PromptRecommender(peec, model=req.model)
            return await rec.recommend(req.brand_id, count=req.count)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


class CreatePromptsRequest(BaseModel):
    project_id: str
    texts: list[str]
    country_code: str = "US"


@app.post("/prompts/batch")
async def create_prompts_batch(req: CreatePromptsRequest):
    cleaned = [t.strip() for t in req.texts if t and t.strip()]
    if not cleaned:
        raise HTTPException(status_code=400, detail="texts must not be empty")
    async with PeecClient(project_id=req.project_id) as peec:
        results = await peec.create_prompts_batch(cleaned, req.country_code)
    return {"results": results}


class SourceInfiltrationRequest(BaseModel):
    project_id: str
    days: int = 90
    brand_id: str | None = None
    max_targets: int = 6
    exclude_domains: list[str] = []
    model: str = INFILTRATION_MODEL


@app.post("/agents/source-infiltration")
async def run_source_infiltration(req: SourceInfiltrationRequest):
    try:
        async with PeecClient(project_id=req.project_id) as peec:
            agent = SourceInfiltrationAgent(peec, model=req.model)
            report = await agent.run(
                days=req.days,
                brand_id=req.brand_id,
                max_targets=req.max_targets,
                exclude_domains=req.exclude_domains,
            )
        return report.to_dict()
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
