"""
Application configuration and settings
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # API Keys
    peecai_api_key: str = ""
    anthropic_api_key: str = ""
    
    # Database
    database_url: str = "sqlite:///./sentinel.db"
    
    # Security
    secret_key: str = "default-secret-key-change-in-production"
    
    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
    # Email (optional)
    alert_email_from: str = ""
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    
    # Peec API Configuration
    peec_api_base_url: str = "https://api.peec.ai/customer/v1"
    peec_api_mcp_url: str = "https://api.peec.ai/mcp"
    
    # Cache settings
    cache_ttl_seconds: int = 900  # 15 minutes
    
    # Scheduler settings
    scan_frequency_hours: int = 1
    
    # Threat detection thresholds
    sentiment_drop_threshold: float = 10.0
    min_sentiment_alert: float = 45.0
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def has_peec_key(self) -> bool:
        """Check if Peec API key is configured"""
        return bool(self.peecai_api_key and self.peecai_api_key != "your_peec_api_key_here")
    
    @property
    def has_anthropic_key(self) -> bool:
        """Check if Anthropic API key is configured"""
        return bool(self.anthropic_api_key and self.anthropic_api_key != "your_anthropic_api_key_here")
    
    @property
    def has_email_config(self) -> bool:
        """Check if email alerting is configured"""
        return bool(self.smtp_user and self.smtp_pass and self.alert_email_from)


# Global settings instance
settings = Settings()
