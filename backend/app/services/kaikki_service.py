"""
Wiktionary service using multiple free sources.
Attempts to use wiktextract data sources, falls back gracefully.
Note: kaikki.org provides bulk downloads, not a REST API.
This service can be extended to use local wiktextract data or other free sources.
"""
import requests
from typing import Dict, List, Optional
import time
import json


class KaikkiService:
    """
    Service for fetching Wiktionary data.
    
    Note: kaikki.org doesn't provide a REST API for individual lookups.
    It offers bulk JSON file downloads. This service can be extended to:
    1. Use local wiktextract-processed data
    2. Use other free Wiktionary APIs
    3. Process Wiktionary dumps locally
    
    For now, this is a placeholder that can be extended with local data.
    """
    
    BASE_URL = "https://kaikki.org/dictionary"
    
    # Language code to Wiktionary language name mapping
    LANGUAGE_MAP = {
        'it': 'Italian',
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ja': 'Japanese',
        'zh': 'Chinese',
        'ar': 'Arabic',
        'nl': 'Dutch',
        'pl': 'Polish',
        'sv': 'Swedish',
        'da': 'Danish',
        'no': 'Norwegian',
        'fi': 'Finnish',
        'el': 'Greek',
        'he': 'Hebrew',
        'tr': 'Turkish',
        'cs': 'Czech',
        'hu': 'Hungarian',
        'ro': 'Romanian',
        'uk': 'Ukrainian',
        'bg': 'Bulgarian',
        'hr': 'Croatian',
        'sr': 'Serbian',
        'sk': 'Slovak',
        'sl': 'Slovenian',
        'et': 'Estonian',
        'lv': 'Latvian',
        'lt': 'Lithuanian',
        'ga': 'Irish',
        'cy': 'Welsh',
        'is': 'Icelandic',
        'mk': 'Macedonian',
        'sq': 'Albanian',
        'mt': 'Maltese',
    }
    
    def __init__(self, timeout: int = 5, rate_limit_delay: float = 0.1):
        """
        Initialize KaikkiService.
        
        Args:
            timeout: Request timeout in seconds
            rate_limit_delay: Delay between requests to be respectful (seconds)
        """
        self.timeout = timeout
        self.rate_limit_delay = rate_limit_delay
        self._cache = {}
    
    def get_word(self, word: str, language: str, target_language: str = "en") -> Optional[Dict]:
        """
        Get word data from Wiktionary sources.
        
        Note: kaikki.org doesn't provide a REST API. This method can be extended to:
        - Load local wiktextract JSON files
        - Use other free Wiktionary APIs
        - Process Wiktionary dumps locally
        
        Args:
            word: The word to look up
            language: Source language code (e.g., 'it', 'en', 'es')
            target_language: Target language for translations (default: 'en')
        
        Returns:
            Dictionary with parsed wiktextract data, or None if not found
        """
        if not word or not language:
            return None
        
        # Check cache
        cache_key = f"{word.lower()}_{language}_{target_language}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # Try to load from local data if available
        # This can be extended to load from downloaded kaikki.org JSON files
        result = self._try_local_data(word, language, target_language)
        if result:
            self._cache[cache_key] = result
            return result
        
        # kaikki.org doesn't have a REST API, so we return None
        # The DictionaryService will fall back to other APIs
        # To use wiktextract data, download bulk files from kaikki.org
        # and implement _try_local_data() to load from those files
        
        return None
    
    def _try_local_data(self, word: str, language: str, target_language: str) -> Optional[Dict]:
        """
        Try to load word data from local wiktextract JSON files.
        
        This method can be implemented to:
        1. Load from downloaded kaikki.org JSON files
        2. Load from a local database populated with wiktextract data
        3. Use the wiktextract library to process Wiktionary dumps
        
        Returns:
            Parsed word data or None if not available locally
        """
        # TODO: Implement local data loading
        # Example: Load from backend/data/wiktionary/{language}/{word}.json
        # Or query a local SQLite database with wiktextract data
        return None
    
    def _parse_wiktextract_data(self, data: Dict, target_language: str, source_language: str) -> Optional[Dict]:
        """
        Parse wiktextract JSON data to our standard format.
        
        Args:
            data: Raw wiktextract JSON data
            target_language: Target language code for translations
            source_language: Source language code
        
        Returns:
            Parsed dictionary in our standard format
        """
        if not data:
            return None
        
        result = {
            'word': data.get('word', ''),
            'translation': '',
            'definition': '',
            'part_of_speech': data.get('pos', ''),
            'grammar': {},
            'examples': [],
            'pronunciations': [],
            'etymology': data.get('etymology_text', ''),
            'source': 'kaikki'
        }
        
        # Extract translations
        translations = data.get('translations', [])
        translation_words = []
        for trans in translations:
            if isinstance(trans, dict):
                code = trans.get('code', '').lower()
                if code == target_language.lower():
                    word = trans.get('word', '')
                    if word:
                        translation_words.append(word)
                        # Use first translation as primary
                        if not result['translation']:
                            result['translation'] = word
        
        # If no direct translation, try to get from senses
        if not result['translation'] and translation_words:
            result['translation'] = translation_words[0]
        
        # Extract definitions from senses
        senses = data.get('senses', [])
        definitions = []
        for sense in senses:
            # Get glosses (definitions)
            glosses = sense.get('glosses', [])
            for gloss in glosses:
                if isinstance(gloss, str) and gloss.strip():
                    definitions.append(gloss.strip())
            
            # Extract examples
            examples = sense.get('examples', [])
            for ex in examples:
                if isinstance(ex, dict):
                    text = ex.get('text', '')
                    if text:
                        result['examples'].append(text)
                elif isinstance(ex, str):
                    result['examples'].append(ex)
        
        # Combine definitions
        if definitions:
            # Remove duplicates while preserving order
            seen = set()
            unique_defs = []
            for defn in definitions:
                defn_lower = defn.lower()
                if defn_lower not in seen:
                    seen.add(defn_lower)
                    unique_defs.append(defn)
            result['definition'] = '; '.join(unique_defs[:5])  # Limit to 5 definitions
        
        # If no definition but we have translation, use translation as definition
        if not result['definition'] and result['translation']:
            result['definition'] = result['translation']
        
        # Extract pronunciations
        pronunciations = data.get('pronunciations', [])
        for pron in pronunciations:
            if isinstance(pron, dict):
                ipa = pron.get('ipa', '')
                if ipa:
                    result['pronunciations'].append(ipa)
        
        # Extract grammar information
        grammar = {}
        
        # Part of speech
        pos = data.get('pos', '')
        if pos:
            grammar['pos'] = pos
            result['part_of_speech'] = pos.upper()
        
        # Morphological features
        forms = data.get('forms', [])
        if forms:
            grammar['forms'] = forms
        
        # Inflection information
        if 'inflection_template' in data:
            grammar['inflection'] = data['inflection_template']
        
        result['grammar'] = grammar
        
        # Only return if we have at least translation or definition
        if result['translation'] or result['definition']:
            return result
        
        return None
    
    def batch_get_words(self, words: List[str], language: str, target_language: str = "en") -> Dict[str, Optional[Dict]]:
        """
        Get data for multiple words efficiently.
        
        Args:
            words: List of words to look up
            language: Source language code
            target_language: Target language code
        
        Returns:
            Dictionary mapping word to its data (or None if not found)
        """
        results = {}
        for word in words:
            results[word] = self.get_word(word, language, target_language)
        return results

