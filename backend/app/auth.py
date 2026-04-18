"""Autenticação via JWT com senhas hasheadas por bcrypt."""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from . import models
from .database import get_db

SECRET_KEY = os.getenv("JWT_SECRET", "worldcup2026-brasil-hexa-secret-key-change-me")
ALGORITHM = "HS256"
# Token vale uma semana — curto o bastante pra mitigar risco em caso de vazamento,
# longo o bastante pra não precisar pedir login a cada sessão.
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _truncar_72(senha: str) -> bytes:
    # O bcrypt só lê os primeiros 72 bytes e trunca o resto silenciosamente.
    # Truncamos nós mesmos pra evitar warnings do passlib/bcrypt.
    return senha.encode("utf-8")[:72]


def hash_password(senha: str) -> str:
    return bcrypt.hashpw(_truncar_72(senha), bcrypt.gensalt()).decode("utf-8")


def verify_password(senha_plain: str, hash_armazenado: str) -> bool:
    try:
        return bcrypt.checkpw(_truncar_72(senha_plain), hash_armazenado.encode("utf-8"))
    except ValueError:
        # Hash corrompido no banco — trata como senha incorreta
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expira_em = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload["exp"] = expira_em
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    nao_autorizado = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise nao_autorizado
        user_id = int(sub)
    except (JWTError, ValueError):
        raise nao_autorizado

    usuario = db.query(models.User).filter(models.User.id == user_id).first()
    if usuario is None:
        raise nao_autorizado
    return usuario
