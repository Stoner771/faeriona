import secrets
import string


def generate_license_key(length: int = 12) -> str:
    alphabet = string.ascii_uppercase + string.digits
    key = ''.join(secrets.choice(alphabet) for _ in range(length))
    return f"{key[:4]}-{key[4:8]}-{key[8:12]}"