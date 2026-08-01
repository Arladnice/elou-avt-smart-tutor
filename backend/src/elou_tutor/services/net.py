"""
Проверка внешних адресов, задаваемых пользователем (защита от SSRF).

Инструктор указывает произвольный URL вебхука, поэтому адрес нужно ограничить
публичной сетью: иначе сервер превращается в прокси во внутренний периметр
(метаданные облака, админки на localhost) и в читалку локальных файлов.
"""

import ipaddress
import logging
import socket
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

ALLOWED_SCHEMES = ("http", "https")


def _is_public_address(host: str) -> bool:
    """Резолвит имя и проверяет, что все адреса — публичные."""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        # Неразрешимое имя не пропускаем: проверить его безопасность нельзя
        return False

    for info in infos:
        addr = info[4][0]
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            return False
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False
    return True


def is_webhook_url_allowed(url: str) -> bool:
    """Разрешает только http(s) на публичный адрес."""
    if not url or not isinstance(url, str):
        return False

    try:
        parsed = urlparse(url)
    except ValueError:
        return False

    if parsed.scheme not in ALLOWED_SCHEMES:
        return False

    host = parsed.hostname
    if not host:
        return False

    return _is_public_address(host)
