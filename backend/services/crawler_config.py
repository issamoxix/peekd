"""
Crawler Configuration Service
Generates robots.txt and sitemap strategies
"""
from typing import Dict, List


class CrawlerConfigService:
    """Service for generating crawler configuration"""
    
    def generate_robots_txt(self, strategy: str = "balanced") -> str:
        """
        Generate robots.txt based on strategy
        
        Args:
            strategy: "balanced", "max_visibility", or "training_block"
        
        Returns:
            robots.txt content
        """
        
        if strategy == "max_visibility":
            return self._max_visibility_robots()
        elif strategy == "training_block":
            return self._training_block_robots()
        else:
            return self._balanced_robots()
    
    def _balanced_robots(self) -> str:
        """Balanced approach - allow retrieval, block training"""
        return """# Sentinel AI Crawler Configuration
# Strategy: Balanced - Allow retrieval, block training

# Block AI Training Crawlers
User-agent: ClaudeBot
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

# Allow AI Retrieval Bots (stay cited in AI answers)
User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

# General crawlers
User-agent: *
Allow: /

# Standard protections
Disallow: /admin/
Disallow: /api/
Disallow: /internal/
Disallow: /*.json$
Disallow: /*.xml$

# Content signals (Cloudflare standard)
# ai-train: disallow
# ai-input: allow
# search: allow

Sitemap: https://yourdomain.com/sitemap.xml
"""
    
    def _max_visibility_robots(self) -> str:
        """Maximum AI visibility - allow everything"""
        return """# Sentinel AI Crawler Configuration
# Strategy: Maximum AI Visibility

# Allow all AI bots (training and retrieval)
User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: CCBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

# General crawlers
User-agent: *
Allow: /

# Only block sensitive areas
Disallow: /admin/
Disallow: /api/

Sitemap: https://yourdomain.com/sitemap.xml
"""
    
    def _training_block_robots(self) -> str:
        """Block AI training only"""
        return """# Sentinel AI Crawler Configuration
# Strategy: Block Training Only

# Block AI Training Crawlers
User-agent: ClaudeBot
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

# Allow AI Retrieval Bots
User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

# Allow everything else
User-agent: *
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml
"""
    
    def generate_sitemap_strategy(self) -> Dict[str, any]:
        """Generate sitemap priority recommendations"""
        return {
            "recommendations": [
                {
                    "pattern": "/blog/*",
                    "priority": 0.8,
                    "changefreq": "weekly",
                    "reason": "Blog content is valuable for AI training and citation"
                },
                {
                    "pattern": "/products/*",
                    "priority": 0.9,
                    "changefreq": "daily",
                    "reason": "Product pages are key for AI recommendations"
                },
                {
                    "pattern": "/press/*",
                    "priority": 1.0,
                    "changefreq": "weekly",
                    "reason": "Press releases establish brand authority"
                },
                {
                    "pattern": "/legal/*",
                    "priority": 0.1,
                    "changefreq": "yearly",
                    "reason": "Legal pages should have minimal AI exposure"
                }
            ],
            "best_practices": [
                "Include all important pages in sitemap",
                "Update changefreq based on actual content updates",
                "Use priority to signal importance to AI crawlers",
                "Submit sitemap to major search engines"
            ]
        }
    
    def get_cloudflare_rules(self) -> List[Dict[str, str]]:
        """Get Cloudflare WAF rule recommendations"""
        return [
            {
                "name": "Block Non-Compliant Perplexity",
                "description": "Block Perplexity if it ignores robots.txt",
                "rule": '(http.user_agent contains "PerplexityBot") and not (http.request.uri.path startswith "/allowed-path/")',
                "action": "block"
            },
            {
                "name": "Rate Limit AI Crawlers",
                "description": "Prevent aggressive AI crawler behavior",
                "rule": '(http.user_agent contains "Bot" or http.user_agent contains "AI") and (cf.threat_score > 10)',
                "action": "challenge"
            }
        ]


# Global service instance
crawler_config_service = CrawlerConfigService()
