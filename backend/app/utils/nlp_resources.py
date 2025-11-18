import os
import threading
from functools import lru_cache

_DOWNLOAD_LOCK = threading.Lock()

_REQUIRED_PACKAGES = {
    "punkt": "tokenizers/punkt",
    "stopwords": "corpora/stopwords",
    "wordnet": "corpora/wordnet",
    "omw-1.4": "corpora/omw-1.4",
}


def _downloads_allowed() -> bool:
    flag = os.getenv("ALLOW_NLTK_DOWNLOADS", "1")
    return flag.lower() not in {"0", "false", "no"}


def ensure_nltk_resource(package: str, resource_path: str) -> bool:
    """
    Ensure an individual NLTK resource is available.
    Returns True if resource is ready, False otherwise.
    """
    try:
        import nltk
        nltk.data.find(resource_path)
        return True
    except LookupError:
        if not _downloads_allowed():
            print(
                f"[NLPResources] Missing NLTK resource '{resource_path}' but downloads are disabled "
                "(set ALLOW_NLTK_DOWNLOADS=1 to enable)."
            )
            return False
        try:
            import nltk
            with _DOWNLOAD_LOCK:
                nltk.download(package, quiet=True, raise_on_error=True)
                nltk.data.find(resource_path)
            print(f"[NLPResources] Downloaded NLTK resource '{package}'.")
            return True
        except Exception as exc:
            print(f"[NLPResources] Failed to download '{package}': {exc}")
            return False
    except Exception as exc:
        print(f"[NLPResources] Unexpected error checking '{package}': {exc}")
        return False


@lru_cache(maxsize=1)
def ensure_core_nlp_resources() -> dict:
    """
    Ensure all core NLTK resources used by the app are available.
    Returns a dict mapping package -> bool.
    """
    results = {}
    for package, resource_path in _REQUIRED_PACKAGES.items():
        results[package] = ensure_nltk_resource(package, resource_path)
    return results
