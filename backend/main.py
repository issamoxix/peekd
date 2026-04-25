from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from peec_client import PeecClient
from sentiment_flip_agent import DEFAULT_MODEL, SentimentFlipAgent

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


@app.get("/brands")
async def list_brands():
    async with PeecClient() as peec:
        return {"data": await peec.list_brands()}


class SentimentFlipRequest(BaseModel):
    days: int = 14
    max_chats: int = 50
    brand_id: str | None = None
    model: str = DEFAULT_MODEL


@app.post("/agents/sentiment-flip")
async def run_sentiment_flip(req: SentimentFlipRequest):
    try:
        async with PeecClient() as peec:
            agent = SentimentFlipAgent(peec, model=req.model)
            report = await agent.run(
                days=req.days,
                max_chats=req.max_chats,
                brand_id=req.brand_id,
            )
        return report.to_dict()
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
