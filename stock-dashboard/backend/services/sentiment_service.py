"""
services/sentiment_service.py
Fetches news (NewsAPI) + Reddit posts (PRAW) and scores them
with FinBERT (finance-tuned BERT from HuggingFace).
"""

import os
import re
import praw
import numpy as np
from datetime import datetime, timedelta
from newsapi import NewsApiClient
from transformers import pipeline
from dotenv import load_dotenv

load_dotenv()

# ── Lazy-load FinBERT so startup is fast ────────────────────────────────────
_finbert = None

def _get_finbert():
    global _finbert
    if _finbert is None:
        print("[FinBERT] Loading model (first call)...")
        _finbert = pipeline(
            "text-classification",
            model="ProsusAI/finbert",
            top_k=None,          # return all 3 labels
            truncation=True,
            max_length=512,
        )
        print("[FinBERT] Model loaded.")
    return _finbert


# ── Helpers ──────────────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^a-zA-Z0-9\s.,!?$%]", " ", text)
    return text[:500].strip()


def _score_text(text: str) -> dict:
    """Run FinBERT on a single text, return {positive, negative, neutral, compound}."""
    finbert = _get_finbert()
    clean = _clean_text(text)
    if not clean:
        return {"positive": 0.33, "negative": 0.33, "neutral": 0.34, "compound": 0.0}

    results = finbert(clean)[0]   # list of {label, score}
    scores = {r["label"].lower(): round(r["score"], 4) for r in results}

    # compound: positive contribution minus negative (range -1 to +1)
    compound = round(scores.get("positive", 0) - scores.get("negative", 0), 4)
    scores["compound"] = compound
    return scores


# ── News API ─────────────────────────────────────────────────────────────────

def fetch_news(ticker: str, company_name: str = "") -> list[dict]:
    """Fetch last 24h headlines from NewsAPI."""
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        return []

    client = NewsApiClient(api_key=api_key)
    query = f"{ticker} stock" if not company_name else f"{company_name} OR {ticker} stock"

    try:
        response = client.get_everything(
            q=query,
            language="en",
            sort_by="publishedAt",
            from_param=(datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d"),
            page_size=20,
        )
        articles = response.get("articles", [])
    except Exception as e:
        print(f"[NewsAPI] Error: {e}")
        return []

    results = []
    for article in articles:
        headline = article.get("title", "")
        description = article.get("description", "")
        text = f"{headline}. {description}"
        sentiment = _score_text(text)

        results.append({
            "source": "news",
            "title": headline,
            "url": article.get("url"),
            "published_at": article.get("publishedAt"),
            "sentiment": sentiment,
        })

    return results


# ── Reddit (PRAW) ─────────────────────────────────────────────────────────────

def fetch_reddit(ticker: str) -> list[dict]:
    """Fetch top posts mentioning ticker from finance subreddits."""
    client_id     = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    user_agent    = os.getenv("REDDIT_USER_AGENT", "StockDashboard/1.0")

    if not client_id or not client_secret:
        return []

    try:
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=user_agent,
        )

        subreddits = ["stocks", "wallstreetbets", "investing", "StockMarket"]
        posts = []

        for sub_name in subreddits:
            subreddit = reddit.subreddit(sub_name)
            for post in subreddit.search(ticker, sort="new", time_filter="day", limit=10):
                text = f"{post.title}. {post.selftext[:300]}"
                sentiment = _score_text(text)

                posts.append({
                    "source": "reddit",
                    "subreddit": sub_name,
                    "title": post.title,
                    "url": f"https://reddit.com{post.permalink}",
                    "score": post.score,
                    "comments": post.num_comments,
                    "published_at": datetime.utcfromtimestamp(post.created_utc).isoformat() + "Z",
                    "sentiment": sentiment,
                })

        return posts

    except Exception as e:
        print(f"[Reddit] Error: {e}")
        return []


# ── Aggregate ─────────────────────────────────────────────────────────────────

def get_aggregate_sentiment(ticker: str, company_name: str = "") -> dict:
    """
    Combine NewsAPI + Reddit posts, run FinBERT, return
    aggregate sentiment score and all individual articles.
    """
    news_items   = fetch_news(ticker, company_name)
    reddit_items = fetch_reddit(ticker)
    all_items    = news_items + reddit_items

    if not all_items:
        return {
            "ticker": ticker.upper(),
            "overall_score": 0.0,
            "label": "neutral",
            "positive_pct": 0,
            "negative_pct": 0,
            "neutral_pct": 0,
            "total_articles": 0,
            "items": [],
        }

    compounds = [item["sentiment"]["compound"] for item in all_items]
    avg_compound = round(float(np.mean(compounds)), 4)

    labels = []
    for item in all_items:
        s = item["sentiment"]
        labels.append(max(["positive", "negative", "neutral"], key=lambda l: s.get(l, 0)))

    total = len(labels)
    pos_pct = round(labels.count("positive") / total * 100, 1)
    neg_pct = round(labels.count("negative") / total * 100, 1)
    neu_pct = round(100 - pos_pct - neg_pct, 1)

    if avg_compound > 0.05:
        overall_label = "positive"
    elif avg_compound < -0.05:
        overall_label = "negative"
    else:
        overall_label = "neutral"

    return {
        "ticker": ticker.upper(),
        "overall_score": avg_compound,
        "label": overall_label,
        "positive_pct": pos_pct,
        "negative_pct": neg_pct,
        "neutral_pct": neu_pct,
        "total_articles": total,
        "items": sorted(all_items, key=lambda x: x.get("published_at", ""), reverse=True)[:30],
    }
