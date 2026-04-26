"""
Claude AI Service for threat analysis
"""
from typing import List, Dict, Any, Optional
import json
from config import settings

# Try to import anthropic, fallback to rule-based if not available
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


THREAT_ANALYSIS_SYSTEM_PROMPT = """You are a brand reputation analyst. Analyze the following AI-generated responses that mention a specific brand. Identify:

1. HALLUCINATIONS: factually incorrect claims about the brand
2. NEGATIVE_FRAMING: true but framed negatively or misleadingly  
3. RISKY_CONTENT: content that could be exploited or misused by competitors
4. SENTIMENT_DROP: sentiment score below 45 or dropped >10 points
5. COMPETITIVE_GAP: competitor mentioned positively in same context where brand is absent

For each issue found, return JSON in this exact format:
{
  "threats": [
    {
      "type": "HALLUCINATION|NEGATIVE_FRAMING|RISKY_CONTENT|SENTIMENT_DROP|COMPETITIVE_GAP",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "model": "chatgpt|perplexity|gemini|claude|copilot|grok",
      "summary": "one sentence description",
      "evidence": "exact quote from AI response",
      "source_url": "url if applicable",
      "auto_fixable": true|false,
      "fix_type": "CONTENT_UPDATE|SCHEMA_MARKUP|ROBOTS_UPDATE|PR_OUTREACH|null"
    }
  ]
}

Return ONLY valid JSON. If no threats found, return {"threats": []}."""


class ClaudeService:
    """Service for Claude AI analysis"""
    
    def __init__(self):
        self.client = None
        if ANTHROPIC_AVAILABLE and settings.has_anthropic_key:
            self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    
    async def analyze_threats(
        self,
        brand_name: str,
        chat_content: Dict[str, Any],
        brands_report: Dict[str, Any],
        model: str
    ) -> List[Dict[str, Any]]:
        """
        Analyze chat content for brand threats using Claude
        
        Args:
            brand_name: Name of the brand
            chat_content: Chat content from Peec API
            brands_report: Brand metrics
            model: AI model that generated the response
        
        Returns:
            List of detected threats
        """
        if self.client:
            return await self._analyze_with_claude(brand_name, chat_content, brands_report, model)
        else:
            return await self._analyze_rule_based(brand_name, chat_content, brands_report, model)
    
    async def _analyze_with_claude(
        self,
        brand_name: str,
        chat_content: Dict[str, Any],
        brands_report: Dict[str, Any],
        model: str
    ) -> List[Dict[str, Any]]:
        """Use Claude for threat analysis"""
        try:
            prompt = f"""
Brand: {brand_name}

AI Response Content:
{json.dumps(chat_content, indent=2)}

Brand Metrics:
- Current visibility: {brands_report.get('visibility', 0)}
- Current sentiment: {brands_report.get('sentiment', 0)}
- Position: {brands_report.get('position', 'N/A')}

Analyze for threats and return JSON only.
"""
            
            response = self.client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=2000,
                system=THREAT_ANALYSIS_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text
            result = json.loads(content)
            return result.get("threats", [])
        
        except Exception as e:
            print(f"Claude analysis failed: {e}")
            return await self._analyze_rule_based(brand_name, chat_content, brands_report, model)
    
    async def _analyze_rule_based(
        self,
        brand_name: str,
        chat_content: Dict[str, Any],
        brands_report: Dict[str, Any],
        model: str
    ) -> List[Dict[str, Any]]:
        """Rule-based threat detection fallback"""
        threats = []
        sentiment = brands_report.get('sentiment', 50)
        
        # Check for sentiment drop
        if sentiment < 45:
            severity = "CRITICAL" if sentiment < 30 else "HIGH"
            threats.append({
                "type": "SENTIMENT_DROP",
                "severity": severity,
                "model": model,
                "summary": f"Brand sentiment at {sentiment}/100, below healthy threshold",
                "evidence": f"Current sentiment score: {sentiment}",
                "source_url": None,
                "auto_fixable": False,
                "fix_type": None
            })
        
        # Check messages for negative keywords
        messages = chat_content.get('messages', [])
        negative_keywords = ['problem', 'issue', 'bad', 'poor', 'worst', 'fail', 'disappointing']
        
        for msg in messages:
            content_lower = str(msg.get('content', '')).lower()
            if brand_name.lower() in content_lower:
                for keyword in negative_keywords:
                    if keyword in content_lower:
                        threats.append({
                            "type": "NEGATIVE_FRAMING",
                            "severity": "MEDIUM",
                            "model": model,
                            "summary": f"Negative keyword '{keyword}' near brand mention",
                            "evidence": str(msg.get('content', ''))[:200],
                            "source_url": None,
                            "auto_fixable": True,
                            "fix_type": "CONTENT_UPDATE"
                        })
                        break
        
        return threats


# Global service instance
claude_service = ClaudeService()
