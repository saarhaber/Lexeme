"""
Dictionary service for fetching translations and grammar information.
Uses multiple free APIs and fallback methods.
Primary source: Wiktextract via kaikki.org (high-quality Wiktionary data)
Fallback: MyMemory, WordReference, LibreTranslate, etc.
"""
import os
import requests
from typing import Dict, List, Optional
import json
import time
import re
import unicodedata
from wordfreq import zipf_frequency

# Try to import KaikkiService, but don't fail if it's not available
try:
    from .kaikki_service import KaikkiService
    KAIKKI_AVAILABLE = True
except ImportError:
    KAIKKI_AVAILABLE = False
    KaikkiService = None

# Try to import WiktextractService for direct Wiktionary parsing
try:
    from .wiktextract_service import WiktextractService
    WIKTEXTRACT_SERVICE_AVAILABLE = True
except ImportError:
    WIKTEXTRACT_SERVICE_AVAILABLE = False
    WiktextractService = None

class DictionaryService:
    """
    Service for fetching word definitions, translations, and grammar information.
    
    Optimized for free tier deployment:
    - Checks database first (grows organically as books are processed)
    - Only calls APIs for words not in database
    - Efficient caching reduces API calls significantly
    """
    
    def __init__(self, db_session=None):
        """
        Initialize DictionaryService.
        
        Args:
            db_session: Optional database session for checking existing lemmas
        """
        self.cache = {}
        self.rate_limit_delay = 0.05  # Reduced delay for faster processing (was 0.1)
        self.normalization_cache = {}
        self._spacy_models = {}
        self._spacy_download_attempted = set()
        self.spacy_auto_download_enabled = self._should_auto_download_spacy()
        self._db_session = db_session  # For database lookups
        
        # Initialize WiktextractService (direct Wiktionary parsing) - BEST QUALITY
        if WIKTEXTRACT_SERVICE_AVAILABLE:
            self.wiktextract_service = WiktextractService(timeout=10, rate_limit_delay=0.5)
        else:
            self.wiktextract_service = None
            print("[DictionaryService] WiktextractService not available (install: pip install wiktextract)")
        
        # Initialize KaikkiService (Wiktextract via kaikki.org) as fallback
        if KAIKKI_AVAILABLE:
            self.kaikki_service = KaikkiService(timeout=5, rate_limit_delay=0.1)
        else:
            self.kaikki_service = None

    def normalize_word_form(self, word: str, language: str) -> str:
        """
        Public helper that returns a normalized (typically infinitive) form for the word.
        Falls back to the original word if normalization fails.
        """
        if not word:
            return word
        language = (language or "en").lower()
        normalized = self._normalize_word_form(word.strip().lower(), language)
        return normalized or word.strip().lower()
    
    def get_word_info(self, word: str, language: str, target_language: str = "en", db = None) -> Dict:
        """
        Get comprehensive word information including translation and grammar breakdown.
        
        Args:
            word: The word to look up
            language: Source language code (e.g., 'it', 'en', 'es')
            target_language: Target language for translation (default: 'en')
        
        Returns:
            Dictionary with definition, translation, grammar info, etc.
        """
        word_clean = (word or "").strip()
        language = (language or "en").lower()
        target_language = (target_language or "en").lower()
        word_lower = word_clean.lower()
        normalized_word = self._normalize_word_form(word_lower, language)
        lookup_word = normalized_word or word_lower
        cache_key = f"{lookup_word}_{language}_{target_language}"
        
        # Check in-memory cache first
        if cache_key in self.cache:
            cached = dict(self.cache[cache_key])
            cached['word'] = word_clean or lookup_word
            cached['normalized_word'] = lookup_word
            cached['normalization_applied'] = lookup_word != word_lower
            return cached
        
        result = {
            'word': word_clean or lookup_word,
            'normalized_word': lookup_word,
            'normalization_applied': lookup_word != word_lower,
            'definition': '',
            'translation': '',
            'part_of_speech': '',
            'grammar': {},
            'examples': [],
            'source': 'none'
        }
        
        # PRIMARY SOURCE: Check database first (grows organically as books are processed)
        # This is the REAL optimization - reuse definitions from previously processed books!
        db_to_use = db or self._db_session
        if db_to_use:
            try:
                from ..models.lemma import Lemma
                existing_lemma = db_to_use.query(Lemma).filter(
                    Lemma.lemma == lookup_word,
                    Lemma.language == language
                ).first()
                
                if existing_lemma and existing_lemma.definition:
                    # Found in database! Use it - no API call needed
                    sanitized = self._sanitize_translation(existing_lemma.definition, lookup_word, language, allow_blank=True)
                    result['definition'] = sanitized or existing_lemma.definition
                    result['translation'] = sanitized or existing_lemma.definition  # Use sanitized translation when possible
                    result['part_of_speech'] = existing_lemma.pos or ''
                    if existing_lemma.morphology:
                        result['grammar'] = existing_lemma.morphology
                    result['source'] = 'database'
                    # Heuristic: sometimes older cached MT results are clearly wrong
                    # ("tuttora" -> "employees", "facevamo" -> "we would use").
                    # If the cached definition looks suspicious, try Wiktionary once
                    # to improve correctness. Avoid doing this for normal single-word
                    # translations to keep bulk processing fast.
                    if not self._should_refresh_cached_definition(result['translation'], lookup_word, language):
                        self.cache[cache_key] = dict(result)
                        return result
            except Exception as e:
                # If database lookup fails, continue to API fallbacks
                print(f"[DictionaryService] Database lookup error: {e}")

        # SECONDARY SOURCE: Try direct Wiktionary parsing with wiktextract (BEST QUALITY)
        if self.wiktextract_service:
            wiktextract_result = self.wiktextract_service.get_word(lookup_word, language, target_language)
            if wiktextract_result and (wiktextract_result.get('translation') or wiktextract_result.get('definition')):
                # Merge wiktextract data into result
                result = self._merge_kaikki_result(result, wiktextract_result, word_clean, lookup_word, word_lower)
                # Final cleanup (ensure translation is populated even when only definition is present)
                result['translation'] = self._sanitize_translation(result.get('translation', ''), lookup_word, language)
                if not result['translation']:
                    result['translation'] = self._sanitize_translation(result.get('definition', ''), lookup_word, language)
                result['definition'] = self._sanitize_translation(result.get('definition', ''), lookup_word, language, allow_blank=True)
                # If we got good data, use it and skip fallbacks
                if result.get('translation') or result.get('definition'):
                    self.cache[cache_key] = dict(result)
                    return result
        
        # TERTIARY SOURCE: Try Wiktextract via kaikki.org (if local data available)
        if self.kaikki_service:
            kaikki_result = self.kaikki_service.get_word(lookup_word, language, target_language)
            if kaikki_result and (kaikki_result.get('translation') or kaikki_result.get('definition')):
                # Merge kaikki data into result
                result = self._merge_kaikki_result(result, kaikki_result, word_clean, lookup_word, word_lower)
                # Final cleanup (ensure translation is populated even when only definition is present)
                result['translation'] = self._sanitize_translation(result.get('translation', ''), lookup_word, language)
                if not result['translation']:
                    result['translation'] = self._sanitize_translation(result.get('definition', ''), lookup_word, language)
                result['definition'] = self._sanitize_translation(result.get('definition', ''), lookup_word, language, allow_blank=True)
                # If we got good data, use it and skip fallbacks
                if result.get('translation') or result.get('definition'):
                    self.cache[cache_key] = dict(result)
                    return result
        
        # FALLBACK: Try different dictionary sources based on language
        if language == 'en':
            result = self._get_english_definition(lookup_word, result)
        elif language in ['it', 'es', 'fr', 'de', 'pt']:
            result = self._get_romance_language_info(lookup_word, language, target_language, result, original_word=word_lower)
        else:
            # Generic fallback
            result = self._get_generic_translation(lookup_word, language, target_language, result)

        # Final cleanup to ensure we don't return noisy punctuation/quotes
        result['translation'] = self._sanitize_translation(result.get('translation', ''), lookup_word, language)
        # If translation is missing, try to reuse the sanitized definition
        if not result['translation']:
            result['translation'] = self._sanitize_translation(result.get('definition', ''), lookup_word, language)
        result['definition'] = self._sanitize_translation(result.get('definition', ''), lookup_word, language, allow_blank=True)
        
        self.cache[cache_key] = dict(result)
        return result

    def _should_refresh_cached_definition(self, definition: str, source: str, language: str) -> bool:
        """Return True if cached definition looks like a bad MT artifact."""
        if not definition or language == "en":
            return False
        cleaned = (definition or "").strip()
        if not cleaned:
            return False
        lower = cleaned.lower()
        words = lower.split()
        # MT artifacts / conjugated sentence-like outputs
        pronoun_starts = {"i", "we", "you", "he", "she", "they"}
        if words and words[0] in pronoun_starts:
            return True
        if " would " in f" {lower} ":
            return True
        # Suspicious plural noun for non-English lemma (e.g., "employees")
        if len(words) == 1 and words[0].endswith("s") and len(source or "") >= 5:
            return True
        return False
    
    def _normalize_word_form(self, word: str, language: str) -> str:
        """
        Attempt to normalize a word to its lemma/infinitive form.
        Uses spaCy when available, with heuristic fallbacks for Italian verbs with clitics.
        """
        if not word:
            return word
        cache_key = f"{language}:{word}"
        if cache_key in self.normalization_cache:
            return self.normalization_cache[cache_key]
        
        normalized = word
        # Strip accents early to improve matches when spaCy isn't available
        stripped_word = self._strip_accents(word)
        if stripped_word and stripped_word != word:
            normalized = stripped_word
        nlp = self._get_spacy_model(language)
        if nlp:
            try:
                doc = nlp(normalized)
                if len(doc) > 0:
                    lemma = doc[0].lemma_.strip()
                    if lemma and lemma != '-PRON-':
                        normalized = lemma.lower()
            except Exception:
                pass
        
        if language == 'it':
            normalized = self._normalize_italian_word_form(word, normalized)
        
        self.normalization_cache[cache_key] = normalized
        return normalized
    
    def _should_auto_download_spacy(self) -> bool:
        """Check env flag to see if we should download spaCy models at runtime."""
        flag = os.getenv("SPACY_AUTO_DOWNLOAD", "")
        return flag.lower() in {"1", "true", "yes"}

    def _get_spacy_model(self, language: str):
        """Lazily load and cache spaCy models per language."""
        if language in self._spacy_models:
            return self._spacy_models[language]
        
        try:
            import spacy
        except ImportError:
            self._spacy_models[language] = None
            return None
        
        model_map = {
            'en': 'en_core_web_sm',
            'it': 'it_core_news_sm',
            'es': 'es_core_news_sm',
            'fr': 'fr_core_news_sm',
            'de': 'de_core_news_sm',
            'pt': 'pt_core_news_sm'
        }
        model_name = model_map.get(language, 'en_core_web_sm')
        
        if model_name in self._spacy_download_attempted:
            # Avoid repeated download attempts
            try:
                nlp = spacy.load(model_name)
            except Exception:
                nlp = None
            self._spacy_models[language] = nlp
            return nlp
        
        try:
            nlp = spacy.load(model_name)
            self._spacy_models[language] = nlp
            return nlp
        except OSError:
            # Try downloading the model once (if enabled)
            self._spacy_download_attempted.add(model_name)
            if not self.spacy_auto_download_enabled:
                print(
                    f"[DictionaryService] spaCy model '{model_name}' not found and auto-download is disabled. "
                    "Set SPACY_AUTO_DOWNLOAD=1 to enable downloads at startup."
                )
                nlp = None
            else:
                try:
                    from spacy.cli import download
                    download(model_name)
                    nlp = spacy.load(model_name)
                except Exception as exc:
                    print(f"[DictionaryService] Failed to auto-download spaCy model '{model_name}': {exc}")
                    nlp = None
        except Exception:
            nlp = None
        
        self._spacy_models[language] = nlp
        return nlp
    
    def _normalize_italian_word_form(self, original_word: str, current_normalized: str) -> str:
        """
        Handle common Italian verb contractions (clitics) and reflexive infinitives.
        Only applies transformations if the candidate clearly looks like an infinitive.
        """
        word = original_word or current_normalized
        if not word:
            return current_normalized
        
        # If spaCy already produced an infinitive, keep it
        if self._looks_like_infinitive(current_normalized):
            return current_normalized
        
        lower_word = word.lower().replace("’", "").replace("'", "")
        lower_word_stripped = self._strip_accents(lower_word)
        candidate = current_normalized
        
        clitic_candidate = self._strip_italian_clitic(lower_word)
        if clitic_candidate and clitic_candidate != candidate:
            candidate = clitic_candidate
        
        # Heuristic: map common conjugated endings back to infinitives when spaCy is unavailable
        heuristic_candidate = self._italian_infinitive_hint(lower_word_stripped or lower_word)
        if heuristic_candidate and self._looks_like_infinitive(heuristic_candidate):
            candidate = heuristic_candidate

        # If it's not a verb infinitive, try to normalize plural nouns/adjectives
        noun_candidate = self._normalize_italian_noun_adjective(lower_word_stripped or lower_word, candidate)
        if noun_candidate and noun_candidate != candidate:
            candidate = noun_candidate
        
        return candidate

    def _normalize_italian_noun_adjective(self, original_word: str, current: str) -> Optional[str]:
        """
        Normalize common Italian plural noun/adjective endings to singular to improve lookups.
        """
        word = (original_word or "").strip()
        if not word or self._looks_like_infinitive(current):
            return current

        # Skip if the current form already looks like a singular noun/adjective
        if current and current.endswith(('o', 'a', 'e')):
            return current

        candidate = current
        # Masculine plural -> singular (ragazzi -> ragazzo, umani -> umano)
        if word.endswith('i') and len(word) > 3:
            candidate = f"{word[:-1]}o"
        # Feminine plural -> singular (case) -> casa/cose)
        elif word.endswith('e') and len(word) > 3:
            candidate = f"{word[:-1]}a"

        if candidate and len(candidate) >= 3:
            return candidate
        return current
    
    def _strip_accents(self, text: str) -> str:
        """Remove accents/diacritics (e.g., guarderò -> guardero) for fallback normalization."""
        if not text:
            return text
        return ''.join(
            ch for ch in unicodedata.normalize('NFD', text)
            if unicodedata.category(ch) != 'Mn'
        )
    
    def _strip_italian_clitic(self, word: str) -> Optional[str]:
        """Remove Italian clitic pronouns from the end of a word to recover the infinitive."""
        if not word or len(word) < 4:
            return None
        
        suffixes = [
            'gliene', 'gliela', 'glielo', 'glieli', 'gliele',
            'mene', 'tene', 'cene', 'vene',
            'mele', 'mela', 'melo', 'meli',
            'tele', 'tela', 'telo', 'teli',
            'cele', 'cela', 'celo', 'celi',
            'gli', 'la', 'le', 'li', 'lo',
            'mi', 'ti', 'si', 'ci', 'vi', 'ne'
        ]
        suffixes.sort(key=len, reverse=True)
        
        for suffix in suffixes:
            if not word.endswith(suffix):
                continue
            stem = word[:-len(suffix)]
            if len(stem) < 3:
                continue
            
            # Cases like "conoscerla" -> "conoscere"
            if stem.endswith('r'):
                candidate = f"{stem}e"
                if self._looks_like_infinitive(candidate):
                    return candidate
            
            # Cases like "circondati" -> "circondare"
            if stem[-1] in 'aeiou':
                candidate = f"{stem}re"
                if self._looks_like_infinitive(candidate):
                    return candidate
            
            # Reflexive infinitives like "guardarsi"
            if stem.endswith(('ar', 'er', 'ir')):
                candidate = f"{stem}e"
                if self._looks_like_infinitive(candidate):
                    return candidate
        
        # Handle explicit reflexive infinitives ("chiamarsi")
        if word.endswith(('arsi', 'ersi', 'irsi')) and len(word) > 5:
            stem = word[:-2]  # remove 'si'
            if stem.endswith('r'):
                candidate = f"{stem}e"
            else:
                candidate = f"{stem}re"
            if self._looks_like_infinitive(candidate):
                return candidate
        
        return None
    
    def _italian_infinitive_hint(self, word: str) -> Optional[str]:
        """
        Lightweight heuristic to map common conjugated forms to infinitives when spaCy is unavailable.
        Examples: riflettono -> riflettere, liberava -> liberare, guarderò -> guardare.
        """
        if not word:
            return None
        
        suffix_map = {
            'avano': ['are'],
            'evano': ['ere'],
            'ivano': ['ire'],
            'iamo': ['are', 'ere', 'ire'],
            'ate': ['are'],
            'ete': ['ere'],
            'ite': ['ire'],
            'ava': ['are'],
            'eva': ['ere'],
            'iva': ['ire'],
            'ano': ['are'],
            'ono': ['ere', 'ire'],
            'ero': ['are', 'ere'],
            'aro': ['are'],
            'iro': ['ire'],
            'ato': ['are'],
            'uto': ['ere'],
            'ito': ['ire']
        }
        
        for suffix, replacements in suffix_map.items():
            if word.endswith(suffix) and len(word) > len(suffix) + 1:
                stem = word[:-len(suffix)]
                for rep in replacements:
                    candidate = f"{stem}{rep}"
                    if self._looks_like_infinitive(candidate):
                        return candidate
        return None
    
    def _looks_like_infinitive(self, word: str) -> bool:
        """Check if a word looks like an Italian infinitive."""
        if not word:
            return False
        return word.endswith(('are', 'ere', 'ire'))
    
    def _clean_translation_text(self, text: str) -> str:
        """Standardize translation/definition strings and remove noisy formatting."""
        if not text:
            return ''

        # Collapse whitespace
        cleaned = re.sub(r'\s+', ' ', text).strip()

        # Drop common wrappers/punctuation
        cleaned = cleaned.strip('[]')
        cleaned = cleaned.strip('“”"\'`')
        cleaned = cleaned.rstrip('?!.,;:').strip()

        # Drop MyMemory sense markers like "-3" appended to translations
        cleaned = re.sub(r'-\d+$', '', cleaned)
        # Remove trailing numeric qualifiers in parentheses
        cleaned = re.sub(r'\s*\(\d+\)$', '', cleaned)

        # Normalize shouting responses (e.g., ROUTES -> routes) but keep acronyms
        if cleaned and cleaned.isupper() and ' ' not in cleaned and len(cleaned) > 2:
            cleaned = cleaned.lower()

        return cleaned

    def _translate_via_libretranslate(
        self,
        word: str,
        source_lang: str,
        target_lang: str,
        endpoints: Optional[List[str]] = None
    ) -> Optional[str]:
        """
        Translate using LibreTranslate (multiple public instances). Returns a cleaned string or None.
        """
        if not word or source_lang == target_lang:
            return None

        urls = endpoints or [
            'https://libretranslate.com/translate',
            'https://translate.argosopentech.com/translate',
        ]

        for url in urls:
            try:
                time.sleep(self.rate_limit_delay)
                response = requests.post(
                    url,
                    json={
                        'q': word,
                        'source': source_lang,
                        'target': target_lang,
                        'format': 'text'
                    },
                    timeout=5,
                    headers={'Content-Type': 'application/json'}
                )
                if response.status_code == 200:
                    data = response.json()
                    translation = data.get('translatedText') or data.get('translation')
                    translation = self._clean_translation_text(translation)
                    if translation and translation.lower() != word.lower():
                        return translation
            except Exception:
                continue
        return None

    def _looks_like_bad_translation(self, translation: str, source: str, language: str) -> bool:
        """Heuristic check to flag noisy or clearly wrong translations."""
        if not translation:
            return True
        cleaned = translation.strip()
        if cleaned in {'-', '--'}:
            return True
        if not any(ch.isalpha() for ch in cleaned):
            return True
        # Too short to be meaningful
        alpha_only = ''.join(ch for ch in cleaned if ch.isalpha())
        if len(alpha_only) < 2:
            return True
        words = cleaned.split()
        # Extremely long translations are likely off for single words
        if len(words) > 5 and len(source) <= 5:
            return True
        if any(char.isdigit() for char in cleaned):
            return True
        # Proper-noun translation for lowercase source is often noise (e.g., "Berlin" for "umani")
        if (source and source[0].islower() and cleaned and cleaned[0].isupper() and len(words) == 1 and len(source) >= 3):
            return True
        # Use frequency to catch typos (very rare English words for short sources)
        try:
            freq = zipf_frequency(words[0].lower(), 'en', wordlist='best')
            if freq < 1.0 and len(source) <= 4:
                return True
            if freq < 0.5 and len(words) == 1:
                return True
        except Exception:
            pass
        return False

    def _sanitize_translation(self, translation: str, source: str, language: str, allow_blank: bool = False) -> str:
        """
        Clean and validate translation text. Falls back to curated overrides when data looks noisy.
        """
        cleaned = self._clean_translation_text(translation or '')

        # Split on common separators and keep the first usable segment
        for sep in [';', ',', '/', '\n']:
            if sep in cleaned:
                parts = [p.strip() for p in cleaned.split(sep) if p.strip()]
                if parts:
                    cleaned = parts[0]
                    break

        # If the translation is a phrase and the source is very short, prefer the first token
        words = cleaned.split()
        if len(words) > 2 and len(source or '') <= 4:
            cleaned = words[0]
        elif len(words) > 1 and len(source or '') <= 3:
            cleaned = words[0]

        lower_clean = cleaned.lower()
        if any(lower_clean.startswith(prefix) for prefix in ('plural:', 'feminine:', 'masculine:', 'root:', 'prefix:', 'suffix:')):
            cleaned = ''
        # Avoid echoing the source word back as the translation
        if source and cleaned and cleaned.lower() == source.lower():
            cleaned = ''

        if self._looks_like_bad_translation(cleaned, source, language):
            cleaned = ''

        # Final basic cleanup
        cleaned = self._clean_translation_text(cleaned)

        if not cleaned and not allow_blank:
            return ''
        return cleaned
    
    def _has_new_translation(self, result: Dict, previous: str) -> bool:
        """Check if result now contains a new translation compared to the previous value."""
        translation = (result.get('translation') or '').strip()
        prev = (previous or '').strip()
        return bool(translation) and translation != prev
    
    def _lookup_translation(self, word: str, source_lang: str, target_lang: str, result: Dict) -> bool:
        """Try dictionary + API translation sources for a single word."""
        if not word:
            return False
        
        translation = self._translate_via_libretranslate(word, source_lang, target_lang)
        if translation:
            result['translation'] = translation
            result['definition'] = translation
            result['source'] = 'libretranslate'
            return True

        translation = self._query_mymemory(word, source_lang, target_lang)
        if translation:
            result['translation'] = translation
            result['definition'] = translation
            result['source'] = 'mymemory'
            return True
        
        return False
    
    def _query_mymemory(self, word: str, source_lang: str, target_lang: str) -> Optional[str]:
        """Query MyMemory translation API and return a cleaned translation if available."""
        try:
            time.sleep(self.rate_limit_delay)
            if source_lang == target_lang:
                return None
            response = requests.get(
                "https://api.mymemory.translated.net/get",
                params={'q': word, 'langpair': f"{source_lang}|{target_lang}"},
                timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                translation = data.get('responseData', {}).get('translatedText')
                translation = self._clean_translation_text(translation)
                if (translation and
                    translation.lower() != word.lower() and
                    not translation.startswith('[')):
                    return translation
        except Exception as e:
            print(f"Translation API error for {word}: {e}")
        return None
    
    def _get_english_definition(self, word: str, result: Dict) -> Dict:
        """Get English word definition using Free Dictionary API."""
        try:
            time.sleep(self.rate_limit_delay)
            response = requests.get(
                f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}",
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    entry = data[0]
                    
                    # Get first definition
                    if 'meanings' in entry and len(entry['meanings']) > 0:
                        meaning = entry['meanings'][0]
                        result['part_of_speech'] = meaning.get('partOfSpeech', '')
                        
                        if 'definitions' in meaning and len(meaning['definitions']) > 0:
                            definition = meaning['definitions'][0]
                            result['definition'] = definition.get('definition', '')
                            
                            # Get example if available
                            if 'example' in definition:
                                result['examples'].append(definition['example'])
                        
                        # Get all definitions for this POS
                        all_definitions = [d.get('definition', '') for d in meaning.get('definitions', [])]
                        if all_definitions:
                            result['definition'] = '; '.join(all_definitions[:3])  # Limit to 3
                    
                    result['translation'] = result['definition']  # For English, definition is translation
                    result['source'] = 'dictionaryapi.dev'
                    
        except Exception as e:
            print(f"Dictionary API error for {word}: {e}")
        
        return result
    
    def _get_romance_language_info(self, word: str, source_lang: str, target_lang: str, result: Dict, original_word: Optional[str] = None) -> Dict:
        """Get information for Romance languages (Italian, Spanish, French, etc.)."""
        translation_found = False
        candidates = []
        if word:
            candidates.append(word)
        if original_word and original_word not in candidates:
            candidates.append(original_word)
        
        for candidate in candidates:
            if self._lookup_translation(candidate, source_lang, target_lang, result):
                translation_found = True
                result['matched_word'] = candidate
                break
        
        if not translation_found:
            for fallback_word in candidates:
                previous_translation = result.get('translation', '')
                result = self._get_fallback_translation(fallback_word, source_lang, target_lang, result)
                if self._has_new_translation(result, previous_translation):
                    translation_found = True
                    result['matched_word'] = fallback_word
                    break
        
        # Always try to infer grammar from word endings (language-specific)
        grammar_source = original_word or word
        grammar_info = self._analyze_romance_grammar(grammar_source, source_lang)
        result['grammar'] = grammar_info
        
        # Ensure we have a part of speech
        if not result.get('part_of_speech') and grammar_info.get('type'):
            # Map grammar type to POS
            pos_map = {
                'verb': 'VERB',
                'noun/adjective': 'NOUN',
                'article': 'DET',
                'preposition': 'ADP'
            }
            result['part_of_speech'] = pos_map.get(grammar_info.get('type'), 'NOUN')
        
        # If still no POS, infer from word characteristics
        if not result.get('part_of_speech'):
            result['part_of_speech'] = self._infer_pos_from_word(word, source_lang)
        
        return result
    
    def _analyze_romance_grammar(self, word: str, language: str) -> Dict:
        """Analyze grammar using spaCy morphological features (most accurate)."""
        grammar = {}
        
        # Try to use spaCy for morphological analysis
        try:
            import spacy
            spacy_models = {
                'en': 'en_core_web_sm',
                'it': 'it_core_news_sm',
                'es': 'es_core_news_sm',
                'fr': 'fr_core_news_sm',
                'de': 'de_core_news_sm',
            }
            model_name = spacy_models.get(language, 'en_core_web_sm')
            try:
                nlp = spacy.load(model_name)
                doc = nlp(word.lower())
                if len(doc) > 0:
                    token = doc[0]
                    morph = token.morph
                    
                    # Extract morphological features from spaCy
                    if morph:
                        morph_dict = morph.to_dict()
                        grammar.update({str(k): str(v) for k, v in morph_dict.items()})
                    
                    # Add POS-based type
                    pos = token.pos_
                    if pos == 'DET':
                        grammar['type'] = 'article'
                    elif pos == 'ADP':
                        grammar['type'] = 'preposition'
                    elif pos == 'VERB':
                        grammar['type'] = 'verb'
                    elif pos in ['NOUN', 'ADJ']:
                        grammar['type'] = 'noun/adjective'
                    
                    return grammar
            except (OSError, ImportError):
                pass  # Fall through to heuristics
        except ImportError:
            pass  # spaCy not available, use heuristics
        
        # Basic heuristics as fallback (only if spaCy unavailable)
        word_lower = word.lower()
        
        if language == 'it':  # Italian
            # Articles
            if word_lower in ['il', 'lo', 'la', 'i', 'gli', 'le']:
                grammar['type'] = 'article'
                grammar['definite'] = True
                if word_lower in ['il', 'lo', 'i', 'gli']:
                    grammar['gender'] = 'masculine'
                else:
                    grammar['gender'] = 'feminine'
                if word_lower in ['il', 'lo', 'la']:
                    grammar['number'] = 'singular'
                else:
                    grammar['number'] = 'plural'
            elif word_lower in ['un', 'uno', 'una', "un'"]:
                grammar['type'] = 'article'
                grammar['definite'] = False
                if word_lower in ['un', 'uno']:
                    grammar['gender'] = 'masculine'
                else:
                    grammar['gender'] = 'feminine'
                grammar['number'] = 'singular'
            # Prepositions
            elif word_lower in ['di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra']:
                grammar['type'] = 'preposition'
            # Verb endings
            elif word_lower.endswith('are'):
                grammar['type'] = 'verb'
                grammar['conjugation'] = '1st (-are)'
                grammar['form'] = 'infinitive'
            elif word_lower.endswith('ere'):
                grammar['type'] = 'verb'
                grammar['conjugation'] = '2nd (-ere)'
                grammar['form'] = 'infinitive'
            elif word_lower.endswith('ire'):
                grammar['type'] = 'verb'
                grammar['conjugation'] = '3rd (-ire)'
                grammar['form'] = 'infinitive'
            # Noun/adjective endings
            elif word_lower.endswith('o'):
                grammar['type'] = 'noun/adjective'
                grammar['gender'] = 'masculine'
                grammar['number'] = 'singular'
            elif word_lower.endswith('a'):
                grammar['type'] = 'noun/adjective'
                grammar['gender'] = 'feminine'
                grammar['number'] = 'singular'
            elif word_lower.endswith('i'):
                grammar['type'] = 'noun/adjective'
                grammar['gender'] = 'masculine'
                grammar['number'] = 'plural'
            elif word_lower.endswith('e'):
                grammar['type'] = 'noun/adjective'
                grammar['gender'] = 'feminine'
                grammar['number'] = 'plural'
        
        elif language == 'es':  # Spanish
            # Verb endings
            if word_lower.endswith('ar'):
                grammar['type'] = 'verb'
                grammar['conjugation'] = '1st (-ar)'
                grammar['form'] = 'infinitive'
            elif word_lower.endswith('er'):
                grammar['type'] = 'verb'
                grammar['conjugation'] = '2nd (-er)'
                grammar['form'] = 'infinitive'
            elif word_lower.endswith('ir'):
                grammar['type'] = 'verb'
                grammar['conjugation'] = '3rd (-ir)'
                grammar['form'] = 'infinitive'
            # Noun/adjective endings
            elif word_lower.endswith('o'):
                grammar['type'] = 'noun/adjective'
                grammar['gender'] = 'masculine'
                grammar['number'] = 'singular'
            elif word_lower.endswith('a'):
                grammar['type'] = 'noun/adjective'
                grammar['gender'] = 'feminine'
                grammar['number'] = 'singular'
        
        elif language == 'fr':  # French
            # Verb endings
            if word_lower.endswith('er'):
                grammar['type'] = 'verb'
                grammar['conjugation'] = '1st (-er)'
                grammar['form'] = 'infinitive'
            elif word_lower.endswith('ir'):
                grammar['type'] = 'verb'
                grammar['conjugation'] = '2nd (-ir)'
                grammar['form'] = 'infinitive'
            elif word_lower.endswith('re'):
                grammar['type'] = 'verb'
                grammar['conjugation'] = '3rd (-re)'
                grammar['form'] = 'infinitive'
        
        return grammar
    
    def _get_generic_translation(self, word: str, source_lang: str, target_lang: str, result: Dict) -> Dict:
        """Generic translation fallback."""
        if source_lang == target_lang:
            result['definition'] = word
            result['translation'] = word
        else:
            translation = self._translate_via_libretranslate(word, source_lang, target_lang)
            if translation:
                result['translation'] = translation
                result['definition'] = translation
                result['source'] = 'libretranslate'
            else:
                # Try MyMemory only if LibreTranslate failed
                try:
                    time.sleep(self.rate_limit_delay)
                    response = requests.get(
                        "https://api.mymemory.translated.net/get",
                        params={'q': word, 'langpair': f"{source_lang}|{target_lang}"},
                        timeout=5
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if 'responseData' in data and 'translatedText' in data['responseData']:
                            translation = self._clean_translation_text(data['responseData']['translatedText'])
                            if translation:
                                result['translation'] = translation
                                result['definition'] = translation
                                result['source'] = 'mymemory'
                except Exception as e:
                    print(f"Translation error for {word}: {e}")

            if not result.get('translation'):
                result = self._get_fallback_translation(word, source_lang, target_lang, result)
        
        return result
    
    def _get_italian_english_dict(self, word: str, result: Dict) -> Dict:
        """Get Italian-English dictionary translations using multiple sources."""
        word_lower = word.lower().strip()
        
        # Try WordReference API (free, no key required for basic lookups)
        try:
            time.sleep(self.rate_limit_delay * 0.5)  # Faster for first attempt
            # WordReference has a public API endpoint
            response = requests.get(
                f"https://www.wordreference.com/iten/{word_lower}",
                timeout=5,
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            if response.status_code == 200:
                # Parse HTML to extract translation (basic extraction)
                html = response.text
                # Look for translation patterns in WordReference HTML
                # This is a simple extraction - could be improved
                translation_match = re.search(r'<td class="ToWrd">([^<]+)</td>', html)
                if translation_match:
                    translation = self._clean_translation_text(translation_match.group(1))
                    if translation and translation.lower() != word_lower:
                        result['translation'] = translation
                        result['definition'] = translation
                        result['source'] = 'wordreference'
                        return result
        except Exception as e:
            print(f"WordReference lookup error for {word}: {e}")
        # Skip curated built-in dictionary entries; rely on translation sources only
        return result
    
    def _get_fallback_translation(self, word: str, source_lang: str, target_lang: str, result: Dict) -> Dict:
        """Fallback translation using LibreTranslate API (free, open-source)."""
        if source_lang != target_lang:
            translation = self._translate_via_libretranslate(
                word,
                source_lang,
                target_lang,
                endpoints=[
                    'https://libretranslate.de/translate',
                    'https://translate.mentality.rip/translate',
                ]
            )
            if translation:
                result['translation'] = translation
                result['definition'] = translation
                result['source'] = 'libretranslate'
                return result

        return result
    
    def _infer_pos_from_word(self, word: str, language: str) -> str:
        """Infer part of speech using spaCy if available, otherwise basic heuristics."""
        # Try to use spaCy for accurate POS tagging
        try:
            import spacy
            spacy_models = {
                'en': 'en_core_web_sm',
                'it': 'it_core_news_sm',
                'es': 'es_core_news_sm',
                'fr': 'fr_core_news_sm',
                'de': 'de_core_news_sm',
            }
            model_name = spacy_models.get(language, 'en_core_web_sm')
            try:
                nlp = spacy.load(model_name)
                doc = nlp(word.lower())
                if len(doc) > 0:
                    pos = doc[0].pos_
                    if pos and pos != 'X':
                        return pos.upper()
            except (OSError, ImportError):
                pass  # Fall through to heuristics
        except ImportError:
            pass  # spaCy not available, use heuristics
        
        # Basic heuristics as fallback (only if spaCy unavailable)
        word_lower = word.lower()
        
        if language == 'it':
            # Very common function words
            if word_lower in ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', "un'"]:
                return 'DET'
            if word_lower in ['di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra']:
                return 'ADP'
            if word_lower in ['e', 'o', 'ma', 'perché', 'che', 'quando', 'dove']:
                return 'CONJ'
            if word_lower.endswith(('are', 'ere', 'ire')):
                return 'VERB'
        
        # Default to NOUN if we can't determine
        return 'NOUN'
    
    def _merge_kaikki_result(self, result: Dict, kaikki_data: Dict, word_clean: str, lookup_word: str, word_lower: str) -> Dict:
        """
        Merge kaikki.org (wiktextract) data into the standard result format.
        Ensures ALL relevant fields are preserved.
        
        Args:
            result: Current result dictionary
            kaikki_data: Data from kaikki_service or wiktextract_service
            word_clean: Original word (cleaned)
            lookup_word: Normalized lookup word
            word_lower: Lowercase word
        
        Returns:
            Merged result dictionary
        """
        # Preserve word information
        result['word'] = word_clean or lookup_word
        result['normalized_word'] = lookup_word
        result['normalization_applied'] = lookup_word != word_lower
        
        # Merge translations and definitions (kaikki/wiktextract has better quality)
        if kaikki_data.get('translation'):
            result['translation'] = kaikki_data['translation']
        if kaikki_data.get('definition'):
            result['definition'] = kaikki_data['definition']
        
        # Merge part of speech
        if kaikki_data.get('part_of_speech'):
            result['part_of_speech'] = kaikki_data['part_of_speech']
        
        # Merge examples (kaikki/wiktextract has contextual examples)
        if kaikki_data.get('examples'):
            existing_examples = result.get('examples', [])
            for ex in kaikki_data['examples']:
                if ex not in existing_examples:
                    existing_examples.append(ex)
            result['examples'] = existing_examples
        
        # Merge grammar information - preserve ALL grammar fields
        if kaikki_data.get('grammar'):
            # Merge with existing grammar, kaikki/wiktextract takes precedence
            existing_grammar = result.get('grammar', {})
            # Deep merge: update existing, add new fields
            for key, value in kaikki_data['grammar'].items():
                if key == 'forms' and isinstance(value, list) and 'forms' in existing_grammar:
                    # Merge forms lists, avoiding duplicates
                    existing_forms = existing_grammar.get('forms', [])
                    for form in value:
                        if form not in existing_forms:
                            existing_forms.append(form)
                    existing_grammar['forms'] = existing_forms[:10]  # Limit to 10
                else:
                    existing_grammar[key] = value
            result['grammar'] = existing_grammar
        
        # Add pronunciations if available
        if kaikki_data.get('pronunciations'):
            existing_prons = result.get('pronunciations', [])
            for pron in kaikki_data['pronunciations']:
                if pron not in existing_prons:
                    existing_prons.append(pron)
            result['pronunciations'] = existing_prons
        
        # Add etymology if available
        if kaikki_data.get('etymology'):
            result['etymology'] = kaikki_data['etymology']
        
        # Add related terms if available
        if kaikki_data.get('related_terms'):
            existing_related = result.get('related_terms', [])
            for term in kaikki_data['related_terms']:
                if term not in existing_related:
                    existing_related.append(term)
            result['related_terms'] = existing_related[:5]  # Limit to 5
        
        # Preserve original source from kaikki_data (could be 'curated', 'kaikki', 'wiktextract', etc.)
        if kaikki_data.get('source'):
            result['source'] = kaikki_data['source']
        else:
            result['source'] = 'wiktextract' if 'wiktextract' in str(type(kaikki_data)) else 'kaikki'
        
        return result
    
    def get_word_entry(self, word: str, language: str, target_language: str = "en", context: Optional[str] = None, db = None) -> Dict:
        """
        Get word information in DemoWordEntry format (matching frontend structure).
        
        Args:
            word: The word to look up
            language: Source language code
            target_language: Target language for translation
            context: Optional sentence context
            db: Optional database session
        
        Returns:
            Dictionary matching DemoWordEntry structure:
            {
                'word': str,
                'translation': str,
                'definition': str,
                'pos': str,
                'context': Optional[str],
                'cefr': Optional[str],
                'frequency': Optional[str],
                'notes': Optional[str],
                'forms': Optional[List[str]],
                'synonyms': Optional[List[str]],
                'tip': Optional[str]
            }
        """
        # Get standard word info
        word_info = self.get_word_info(word, language, target_language, db)
        
        # Map to DemoWordEntry format
        entry = {
            'word': word_info.get('word', word),
            'translation': word_info.get('translation', ''),
            'definition': word_info.get('definition', ''),
            'pos': word_info.get('part_of_speech', '').lower() or word_info.get('pos', ''),
            'context': context,
            'cefr': self._estimate_cefr(word_info, language),
            'frequency': self._estimate_frequency(word_info),
            'notes': None,
            'forms': self._extract_forms(word_info),
            'synonyms': self._extract_synonyms(word_info),
            'tip': self._generate_tip(word_info, language)
        }
        
        return entry
    
    def _estimate_cefr(self, word_info: Dict, language: str) -> Optional[str]:
        """Estimate CEFR level based on word characteristics."""
        # Simple heuristic - can be enhanced with actual CEFR data
        difficulty = word_info.get('difficulty_level', 0.0)
        if difficulty < 0.3:
            return 'A1'
        elif difficulty < 0.5:
            return 'A2'
        elif difficulty < 0.7:
            return 'B1'
        elif difficulty < 0.85:
            return 'B2'
        elif difficulty < 0.95:
            return 'C1'
        else:
            return 'C2'
    
    def _estimate_frequency(self, word_info: Dict) -> Optional[str]:
        """Estimate frequency level."""
        global_freq = word_info.get('global_frequency', 0.0)
        if global_freq > 0.01:
            return 'Very common'
        elif global_freq > 0.005:
            return 'Common'
        elif global_freq > 0.001:
            return 'Moderate'
        elif global_freq > 0.0001:
            return 'Less common'
        else:
            return 'Rare'
    
    def _extract_forms(self, word_info: Dict) -> Optional[List[str]]:
        """Extract word forms from grammar/morphology data."""
        forms = []
        grammar = word_info.get('grammar', {})
        
        # Extract from grammar.forms (from wiktextract)
        if 'forms' in grammar:
            forms_list = grammar['forms']
            if isinstance(forms_list, list):
                # Extract form words - handle both dict and string formats
                for f in forms_list:
                    if isinstance(f, dict):
                        form_word = f.get('form', '') or f.get('word', '')
                        if form_word:
                            forms.append(str(form_word))
                    elif isinstance(f, str):
                        forms.append(f)
                forms = forms[:10]  # Limit to 10 most common forms
        
        # Also check morphology if it's a different structure
        if not forms and isinstance(word_info.get('morphology'), dict):
            morphology = word_info.get('morphology', {})
            if 'forms' in morphology:
                morph_forms = morphology['forms']
                if isinstance(morph_forms, list):
                    for f in morph_forms[:10]:
                        if isinstance(f, dict):
                            form_word = f.get('form', '') or f.get('word', '')
                            if form_word:
                                forms.append(str(form_word))
                        elif isinstance(f, str):
                            forms.append(f)
        
        return forms if forms else None
    
    def _extract_synonyms(self, word_info: Dict) -> Optional[List[str]]:
        """Extract synonyms and related terms if available."""
        # Extract related terms from wiktextract data
        related_terms = word_info.get('related_terms', [])
        if related_terms and isinstance(related_terms, list):
            # Return related terms as synonyms (similar concept)
            return [str(term) for term in related_terms[:5]]
        
        # Could be enhanced to extract actual synonyms from dictionary data
        return None
    
    def _generate_tip(self, word_info: Dict, language: str) -> Optional[str]:
        """Generate a helpful tip about the word."""
        grammar = word_info.get('grammar', {})
        pos = word_info.get('part_of_speech', '').lower()
        
        tips = []
        
        if language == 'it':
            if pos == 'verb':
                conjugation = grammar.get('conjugation', '')
                if conjugation:
                    tips.append(f"Verb conjugation: {conjugation}")
            elif pos in ['noun', 'adj']:
                gender = grammar.get('gender', '')
                if gender:
                    tips.append(f"Gender: {gender}")
        
        # Add etymology tip if available
        etymology = word_info.get('etymology', '')
        if etymology and len(etymology) < 100:
            tips.append(f"Etymology: {etymology[:80]}...")
        
        return '; '.join(tips) if tips else None
    
    def batch_get_word_info(self, words: List[str], language: str, target_language: str = "en") -> Dict[str, Dict]:
        """Get information for multiple words efficiently."""
        results = {}
        for word in words:
            results[word] = self.get_word_info(word, language, target_language)
        return results

