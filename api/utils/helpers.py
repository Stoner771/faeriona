"""
Utility functions for Faerion API
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import re
from config import settings


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_username(username: str) -> bool:
    """
    Validate username format
    Allows alphanumeric, underscore, and hyphen
    Min 3 chars, max 50 chars
    """
    if not username or len(username) < 3 or len(username) > 50:
        return False
    pattern = r'^[a-zA-Z0-9_-]+$'
    return re.match(pattern, username) is not None


def validate_password(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength
    Returns (is_valid, error_message)
    """
    if not password:
        return False, "Password is required"
    
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters long"
    
    if settings.PASSWORD_REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if settings.PASSWORD_REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if settings.PASSWORD_REQUIRE_DIGITS and not re.search(r'[0-9]', password):
        return False, "Password must contain at least one digit"
    
    if settings.PASSWORD_REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, None


def is_valid_ip(ip: str) -> bool:
    """Validate IPv4 address"""
    parts = ip.split('.')
    if len(parts) != 4:
        return False
    try:
        return all(0 <= int(part) <= 255 for part in parts)
    except ValueError:
        return False


def get_ip_address(request) -> str:
    """Extract real IP address from request"""
    # Check for forwarded IP (from proxy/load balancer)
    if x_forwarded_for := request.headers.get("x-forwarded-for"):
        return x_forwarded_for.split(",")[0].strip()
    
    if x_real_ip := request.headers.get("x-real-ip"):
        return x_real_ip
    
    # Fall back to direct connection
    return request.client.host if request.client else "unknown"


def paginate(items: List[Any], page: int = 1, page_size: int = 20) -> Dict[str, Any]:
    """
    Paginate a list of items
    Returns paginated response structure
    """
    page = max(1, page)
    page_size = max(1, min(page_size, 100))  # Max 100 items per page
    
    total = len(items)
    total_pages = (total + page_size - 1) // page_size
    start = (page - 1) * page_size
    end = start + page_size
    
    return {
        "items": items[start:end],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1
    }


def generate_license_key(prefix: str = "FAE", length: int = 20) -> str:
    """Generate a formatted license key"""
    import secrets
    import string
    
    chars = string.ascii_uppercase + string.digits
    key = ''.join(secrets.choice(chars) for _ in range(length))
    
    # Format as XXXXX-XXXXX-XXXXX-XXXXX
    formatted = '-'.join(key[i:i+5] for i in range(0, len(key), 5))
    return f"{prefix}-{formatted}"


def calculate_license_expiry(days: Optional[int] = None) -> datetime:
    """Calculate license expiry date"""
    if days is None:
        days = settings.LICENSE_EXPIRY_DAYS
    return datetime.utcnow() + timedelta(days=days)


def is_license_expired(expiry_date: Optional[datetime]) -> bool:
    """Check if license is expired"""
    if not expiry_date:
        return False
    return datetime.utcnow() > expiry_date


def get_time_until_expiry(expiry_date: datetime) -> Optional[timedelta]:
    """Get time remaining until expiry"""
    if is_license_expired(expiry_date):
        return None
    return expiry_date - datetime.utcnow()


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    # Remove path separators
    filename = filename.replace("/", "").replace("\\", "")
    # Remove special characters
    filename = re.sub(r'[^\w\s.-]', '', filename)
    # Remove multiple dots (prevent directory traversal)
    filename = re.sub(r'\.{2,}', '.', filename)
    return filename[:255]  # Limit length


def is_file_allowed(filename: str) -> bool:
    """Check if file extension is allowed"""
    if not filename or '.' not in filename:
        return False
    
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in settings.ALLOWED_FILE_EXTENSIONS


def format_file_size(size_bytes: int) -> str:
    """Format bytes to human readable size"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.2f} TB"


def truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """Truncate string to max length"""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def mask_sensitive_data(data: str, show_chars: int = 4) -> str:
    """Mask sensitive data (password, token, etc)"""
    if len(data) <= show_chars:
        return "*" * len(data)
    return data[:show_chars] + "*" * (len(data) - show_chars)


def merge_dicts(base: Dict, override: Dict) -> Dict:
    """Recursively merge override into base"""
    result = base.copy()
    for key, value in override.items():
        if isinstance(value, dict) and key in result and isinstance(result[key], dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value
    return result


def parse_filter_params(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse and validate filter parameters
    Converts string values to appropriate types
    """
    filters = {}
    
    # Boolean fields
    for field in ['is_active', 'is_banned', 'force_update']:
        if field in params and params[field] is not None:
            filters[field] = params[field].lower() in ('true', '1', 'yes')
    
    # Integer fields
    for field in ['page', 'limit', 'id', 'app_id']:
        if field in params and params[field] is not None:
            try:
                filters[field] = int(params[field])
            except (ValueError, TypeError):
                pass
    
    # String fields (passed as-is)
    for field in ['search', 'sort', 'order', 'status']:
        if field in params and params[field]:
            filters[field] = str(params[field]).strip()
    
    return filters
