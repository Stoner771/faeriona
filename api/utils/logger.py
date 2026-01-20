from sqlalchemy.orm import Session
from models.log import Log

# Actions that should NEVER be logged (polling / validation / noise)
BLOCKED_ACTIONS = {
    "validate",
    "init",
    "token_valid",
    "token_verified",
    "license_check",
    "license_valid",
    "license_validated",
    "admin_authenticated",
}

def create_log(
    db: Session,
    app_id: int,
    action: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
    details: str | None = None,
    user_id: int | None = None,
):
    # Safety: no action, no log
    if not action:
        return None

    action_normalized = action.strip().lower()

    # 🚫 Block noisy / automatic logs
    if action_normalized in BLOCKED_ACTIONS:
        return None

    # 🚫 Never log GET-style actions
    if action_normalized.startswith("get "):
        return None

    log = Log(
        app_id=app_id,
        action=action,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
        user_id=user_id,
    )

    db.add(log)
    db.commit()
    return log
