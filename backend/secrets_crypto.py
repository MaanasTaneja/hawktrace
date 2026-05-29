import os
from cryptography.fernet import Fernet


def _get_fernet() -> Fernet:
    key = os.getenv("SECRETS_ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("SECRETS_ENCRYPTION_KEY env var is not set")
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_secret(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: str) -> str:
    return _get_fernet().decrypt(ciphertext.encode()).decode()
