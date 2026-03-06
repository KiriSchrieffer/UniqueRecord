from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import webbrowser
from pathlib import Path
from typing import Any


def _now_unix() -> int:
    return int(time.time())


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + padding)


def _hash_password(password: str, *, iterations: int = 260_000) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${base64.b64encode(salt).decode('ascii')}${base64.b64encode(digest).decode('ascii')}"


def _verify_password(password: str, encoded: str) -> bool:
    try:
        algo, iter_raw, salt_b64, digest_b64 = encoded.split("$", 3)
        if algo != "pbkdf2_sha256":
            return False
        iterations = int(iter_raw)
        salt = base64.b64decode(salt_b64.encode("ascii"))
        expected = base64.b64decode(digest_b64.encode("ascii"))
    except Exception:
        return False
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(actual, expected)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _load_json_file(path: Path, *, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default
    return payload


def _write_json_file(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, ensure_ascii=False, indent=2)
    path.write_text(serialized + "\n", encoding="utf-8")


def _decode_jwt_payload(id_token: str) -> dict[str, Any]:
    parts = id_token.split(".")
    if len(parts) != 3:
        raise ValueError("invalid id_token format")
    raw_payload = _b64url_decode(parts[1])
    payload = json.loads(raw_payload.decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("invalid id_token payload")
    return payload


class LocalAuthService:
    def __init__(
        self,
        *,
        data_root: Path,
        oauth_host: str,
        oauth_port: int,
        google_client_id: str = "",
        google_client_secret: str = "",
    ) -> None:
        self._lock = threading.RLock()
        self._data_root = data_root.resolve()
        self._oauth_host = oauth_host
        self._oauth_port = oauth_port
        self._google_client_id = google_client_id.strip()
        self._google_client_secret = google_client_secret.strip()

        self._users_path = (self._data_root / "auth" / "users.json").resolve()
        self._session_path = (self._data_root / "auth" / "session.json").resolve()
        self._google_pending: dict[str, dict[str, Any]] = {}

        self._users: list[dict[str, Any]] = []
        self._active_user_id: str | None = None
        self._load_state()

    def status(self) -> dict[str, Any]:
        with self._lock:
            return {
                "authenticated": self._active_user_id is not None,
                "user": self._public_user(self._find_user_by_id(self._active_user_id)),
                "google_enabled": bool(self._google_client_id),
            }

    def register_email(self, *, email: str, password: str, display_name: str = "") -> dict[str, Any]:
        normalized_email = _normalize_email(email)
        if not normalized_email or "@" not in normalized_email:
            raise ValueError("email format is invalid")
        if len(password) < 8:
            raise ValueError("password must be at least 8 characters")
        with self._lock:
            for user in self._users:
                if user.get("email") == normalized_email:
                    raise ValueError("email already exists")
            user_id = f"user_{uuid.uuid4().hex}"
            profile = {
                "id": user_id,
                "provider": "email",
                "email": normalized_email,
                "display_name": display_name.strip() or normalized_email.split("@", 1)[0],
                "password_hash": _hash_password(password),
                "created_at_unix": _now_unix(),
            }
            self._users.append(profile)
            self._active_user_id = user_id
            self._persist_state()
            return self.status()

    def login_email(self, *, email: str, password: str) -> dict[str, Any]:
        normalized_email = _normalize_email(email)
        with self._lock:
            user = None
            for candidate in self._users:
                if candidate.get("provider") == "email" and candidate.get("email") == normalized_email:
                    user = candidate
                    break
            if user is None:
                raise ValueError("account not found")
            encoded = user.get("password_hash")
            if not isinstance(encoded, str) or not _verify_password(password, encoded):
                raise ValueError("email or password is incorrect")
            self._active_user_id = str(user["id"])
            self._persist_state()
            return self.status()

    def logout(self) -> dict[str, Any]:
        with self._lock:
            self._active_user_id = None
            self._persist_state()
            return self.status()

    def start_google_login(self) -> dict[str, Any]:
        with self._lock:
            if not self._google_client_id:
                raise ValueError("google login is not configured")
            state = secrets.token_urlsafe(24)
            code_verifier = secrets.token_urlsafe(48)
            code_challenge = _b64url_encode(hashlib.sha256(code_verifier.encode("utf-8")).digest())
            redirect_uri = self._redirect_uri()
            now = _now_unix()
            self._google_pending[state] = {
                "code_verifier": code_verifier,
                "created_at_unix": now,
                "redirect_uri": redirect_uri,
            }
            self._expire_old_google_states(now_unix=now)

        query = urllib.parse.urlencode(
            {
                "client_id": self._google_client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": "openid email profile",
                "state": state,
                "access_type": "offline",
                "prompt": "select_account",
                "code_challenge": code_challenge,
                "code_challenge_method": "S256",
            }
        )
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
        webbrowser.open(auth_url, new=2, autoraise=True)
        return {"ok": True, "auth_url": auth_url}

    def complete_google_login(self, *, state: str, code: str) -> dict[str, Any]:
        state = state.strip()
        code = code.strip()
        if not state or not code:
            raise ValueError("missing oauth state or code")

        with self._lock:
            pending = self._google_pending.pop(state, None)
        if pending is None:
            raise ValueError("oauth state is invalid or expired")

        token_payload = self._exchange_google_code_for_tokens(
            code=code,
            code_verifier=str(pending["code_verifier"]),
            redirect_uri=str(pending["redirect_uri"]),
        )
        id_token = token_payload.get("id_token")
        if not isinstance(id_token, str) or not id_token:
            raise ValueError("google token response missing id_token")
        claims = _decode_jwt_payload(id_token)
        audience = str(claims.get("aud") or "")
        if audience != self._google_client_id:
            raise ValueError("google token audience mismatch")
        exp = claims.get("exp")
        if isinstance(exp, (int, float)) and int(exp) <= _now_unix():
            raise ValueError("google token expired")

        sub = str(claims.get("sub") or "").strip()
        if not sub:
            raise ValueError("google token missing subject")
        email = _normalize_email(str(claims.get("email") or ""))
        name = str(claims.get("name") or "").strip()
        if not email:
            email = f"{sub}@google.local"
        if not name:
            name = email.split("@", 1)[0]

        with self._lock:
            user = None
            for candidate in self._users:
                if candidate.get("provider") == "google" and candidate.get("google_sub") == sub:
                    user = candidate
                    break
            if user is None:
                user = {
                    "id": f"user_{uuid.uuid4().hex}",
                    "provider": "google",
                    "google_sub": sub,
                    "email": email,
                    "display_name": name,
                    "created_at_unix": _now_unix(),
                }
                self._users.append(user)
            else:
                user["email"] = email
                if name:
                    user["display_name"] = name

            self._active_user_id = str(user["id"])
            self._persist_state()
            return self.status()

    def _redirect_uri(self) -> str:
        return f"http://{self._oauth_host}:{self._oauth_port}/api/auth/google/callback"

    def _exchange_google_code_for_tokens(
        self,
        *,
        code: str,
        code_verifier: str,
        redirect_uri: str,
    ) -> dict[str, Any]:
        payload = {
            "code": code,
            "client_id": self._google_client_id,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
            "code_verifier": code_verifier,
        }
        if self._google_client_secret:
            payload["client_secret"] = self._google_client_secret
        body = urllib.parse.urlencode(payload).encode("utf-8")
        request = urllib.request.Request(
            "https://oauth2.googleapis.com/token",
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                raw = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="ignore")
            raise ValueError(f"google token exchange failed: {exc.code} {raw}") from exc
        except Exception as exc:
            raise ValueError(f"google token exchange failed: {exc}") from exc

        try:
            parsed = json.loads(raw)
        except ValueError as exc:
            raise ValueError("google token endpoint returned invalid JSON") from exc
        if not isinstance(parsed, dict):
            raise ValueError("google token endpoint returned invalid payload")
        if "error" in parsed:
            raise ValueError(f"google token exchange failed: {parsed.get('error')}")
        return parsed

    def _expire_old_google_states(self, *, now_unix: int) -> None:
        ttl = 600
        expired = [
            state
            for state, pending in self._google_pending.items()
            if int(pending.get("created_at_unix") or 0) + ttl < now_unix
        ]
        for state in expired:
            self._google_pending.pop(state, None)

    def _load_state(self) -> None:
        with self._lock:
            raw_users = _load_json_file(self._users_path, default=[])
            if isinstance(raw_users, list):
                self._users = [item for item in raw_users if isinstance(item, dict)]
            else:
                self._users = []

            session = _load_json_file(self._session_path, default={})
            active_user_id = None
            if isinstance(session, dict):
                value = session.get("active_user_id")
                if isinstance(value, str) and value.strip():
                    active_user_id = value.strip()
            self._active_user_id = active_user_id
            if self._find_user_by_id(self._active_user_id) is None:
                self._active_user_id = None

    def _persist_state(self) -> None:
        _write_json_file(self._users_path, self._users)
        _write_json_file(self._session_path, {"active_user_id": self._active_user_id})

    def _find_user_by_id(self, user_id: str | None) -> dict[str, Any] | None:
        if user_id is None:
            return None
        for candidate in self._users:
            if str(candidate.get("id")) == user_id:
                return candidate
        return None

    def _public_user(self, user: dict[str, Any] | None) -> dict[str, Any] | None:
        if user is None:
            return None
        return {
            "id": user.get("id"),
            "provider": user.get("provider"),
            "email": user.get("email"),
            "display_name": user.get("display_name"),
            "created_at_unix": user.get("created_at_unix"),
        }

