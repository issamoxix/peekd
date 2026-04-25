"""
In-memory TTL cache for Peec API responses
"""
from cachetools import TTLCache
from typing import Any, Optional
import hashlib
import json


class PeecCache:
    """Simple TTL cache for API responses"""
    
    def __init__(self, maxsize: int = 1000, ttl: int = 900):
        """
        Initialize cache
        
        Args:
            maxsize: Maximum number of cached items
            ttl: Time to live in seconds (default 15 minutes)
        """
        self.cache = TTLCache(maxsize=maxsize, ttl=ttl)
    
    def _generate_key(self, method: str, **kwargs) -> str:
        """Generate cache key from method name and parameters"""
        params_str = json.dumps(kwargs, sort_keys=True)
        key_str = f"{method}:{params_str}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, method: str, **kwargs) -> Optional[Any]:
        """Get value from cache"""
        key = self._generate_key(method, **kwargs)
        return self.cache.get(key)
    
    def set(self, method: str, value: Any, **kwargs) -> None:
        """Set value in cache"""
        key = self._generate_key(method, **kwargs)
        self.cache[key] = value
    
    def clear(self) -> None:
        """Clear all cache"""
        self.cache.clear()
    
    def invalidate(self, method: str, **kwargs) -> None:
        """Invalidate specific cache entry"""
        key = self._generate_key(method, **kwargs)
        self.cache.pop(key, None)


# Global cache instance
peec_cache = PeecCache()
