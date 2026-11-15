"""QA-only redirect diagnostics. No network requests or authorization decisions."""
import re
from urllib.parse import urlsplit

_REASONS = {
    'Unsafe model transport URL',
    'Publisher path outside exact model scope',
    'Unexpected publisher Xet path',
    'Redirect host outside strict publisher/CDN allowlist',
}


def sanitized_failure(error):
    """Do not let the worker's final error receipt reintroduce a signed URL."""
    return {
        'type': type(error).__name__,
        'reason': str(error) if isinstance(error, RuntimeError) and str(error) in _REASONS
        else 'Acquisition failed; untrusted exception text omitted',
    }


def sanitized_redirect(url, status=None, error=None):
    """Retain public scheme/hostname, never a raw URL, path, query or userinfo."""
    result = {
        'http_status': status if isinstance(status, int) and 100 <= status <= 599 else None,
        'scheme': None, 'hostname': None, 'port': None,
        'credentials_present': False, 'query_present': False,
        'fragment_present': False, 'query_values_retained': False,
        'well_formed': False,
        'rejection_reason': None if error is None else 'Malformed or rejected redirect URL',
    }
    if isinstance(error, RuntimeError) and str(error) in _REASONS:
        result['rejection_reason'] = str(error)
    if not isinstance(url, str):
        return result
    try:
        parsed = urlsplit(url)
        if re.fullmatch(r'[a-z][a-z0-9+.-]{0,31}', parsed.scheme):
            result['scheme'] = parsed.scheme
        host = parsed.hostname
        if host:
            host = host.encode('idna').decode('ascii').lower()
            if len(host) <= 253 and re.fullmatch(r'[a-z0-9.-]+', host):
                result['hostname'] = host
        result['credentials_present'] = parsed.username is not None or parsed.password is not None
        result['query_present'] = bool(parsed.query)
        result['fragment_present'] = bool(parsed.fragment)
        result['port'] = parsed.port
        result['well_formed'] = bool(result['scheme'] and result['hostname'])
    except (ValueError, UnicodeError):
        pass
    return result
