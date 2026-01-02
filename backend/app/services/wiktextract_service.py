"""
Wiktextract service for parsing Wiktionary pages directly.
Uses wiktextract Python library to extract structured data from Wiktionary.
"""
import requests
from typing import Dict, List, Optional
import time
import json

# Try to import wiktextract
try:
    import wiktextract
    from wiktextract import parse_wiktionary
    WIKTEXTRACT_AVAILABLE = True
except ImportError:
    WIKTEXTRACT_AVAILABLE = False
    print("[WiktextractService] wiktextract not installed. Install with: pip install wiktextract")


class WiktextractService:
    """
    Service for fetching Wiktionary data using wiktextract library.
    Fetches Wiktionary pages and parses them with wiktextract.
    """
    
    WIKTIONARY_API_URL = "https://{lang}.wiktionary.org/w/api.php"
    
    # Language code to Wiktionary language code mapping
    LANGUAGE_MAP = {
        'it': 'it',  # Italian
        'en': 'en',  # English
        'es': 'es',  # Spanish
        'fr': 'fr',  # French
        'de': 'de',  # German
        'pt': 'pt',  # Portuguese
        'ru': 'ru',  # Russian
        'ja': 'ja',  # Japanese
        'zh': 'zh',  # Chinese
        'ar': 'ar',  # Arabic
        'nl': 'nl',  # Dutch
        'pl': 'pl',  # Polish
        'sv': 'sv',  # Swedish
        'da': 'da',  # Danish
        'no': 'no',  # Norwegian
        'fi': 'fi',  # Finnish
        'el': 'el',  # Greek
        'he': 'he',  # Hebrew
        'tr': 'tr',  # Turkish
    }
    
    def __init__(self, timeout: int = 10, rate_limit_delay: float = 0.5):
        """
        Initialize WiktextractService.
        
        Args:
            timeout: Request timeout in seconds
            rate_limit_delay: Delay between requests to be respectful (seconds)
        """
        self.timeout = timeout
        self.rate_limit_delay = rate_limit_delay
        self._cache = {}
        
        if not WIKTEXTRACT_AVAILABLE:
            print("[WiktextractService] wiktextract library not available")
    
    def get_word(self, word: str, language: str, target_language: str = "en") -> Optional[Dict]:
        """
        Get word data from Wiktionary using wiktextract.
        
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
        
        # Fetch from English Wiktionary by default.
        #
        # Reason: non-English Wiktionary editions use localized language headers
        # (e.g. it.wiktionary uses "==Italiano=="), which breaks our simple
        # extractor that expects English language section titles ("==Italian==").
        # English Wiktionary contains sections for many source languages and is
        # the most consistent target for cross-language lookups.
        wiktionary_lang = "en"
        
        try:
            # Be respectful with rate limiting
            time.sleep(self.rate_limit_delay)
            
            # Fetch Wiktionary page content
            page_content = self._fetch_wiktionary_page(word, wiktionary_lang)
            if not page_content:
                return None
            
            # Parse using wiktextract when available; otherwise fall back to
            # lightweight wikitext extraction.
            if WIKTEXTRACT_AVAILABLE:
                parsed_data = self._parse_with_wiktextract(page_content, word, language, target_language)
            else:
                parsed_data = self._simple_extract_from_wikitext(page_content, word, language, target_language)
            
            if parsed_data:
                self._cache[cache_key] = parsed_data
                return parsed_data
                
        except Exception as e:
            print(f"[WiktextractService] Error processing {word} ({language}): {e}")
            return None
        
        return None
    
    def _fetch_wiktionary_page(self, word: str, lang: str) -> Optional[str]:
        """
        Fetch Wiktionary page content using MediaWiki API.
        
        Args:
            word: Word to look up
            lang: Wiktionary language code
        
        Returns:
            Page wikitext content or None
        """
        try:
            api_url = self.WIKTIONARY_API_URL.format(lang=lang)
            
            # First, get the page content
            params = {
                'action': 'query',
                'format': 'json',
                'titles': word,
                'prop': 'revisions',
                'rvprop': 'content',
                'rvslots': 'main',
            }
            
            response = requests.get(
                api_url,
                params=params,
                timeout=self.timeout,
                headers={
                    # Wiktionary is more reliable with an explicit UA; some
                    # requests may be blocked/throttled without it.
                    "User-Agent": "tuttora-app/1.0 (dictionary lookup)"
                },
            )
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            pages = data.get('query', {}).get('pages', {})
            
            # Get the first (and usually only) page
            for page_id, page_data in pages.items():
                if page_id == '-1':  # Page doesn't exist
                    return None
                
                revisions = page_data.get('revisions', [])
                if revisions:
                    main_slot = revisions[0].get('slots', {}).get('main', {}) or {}
                    # MediaWiki has used multiple keys over time:
                    # - legacy: ["*"]
                    # - newer: ["content"]
                    content = main_slot.get('*') or main_slot.get('content')
                    if content:
                        return content
                    # Extremely old format (no slots)
                    if '*' in revisions[0]:
                        return revisions[0].get('*')
            
            return None
            
        except Exception as e:
            print(f"[WiktextractService] Error fetching page for {word}: {e}")
            return None
    
    def _parse_with_wiktextract(self, wikitext: str, word: str, language: str, target_language: str) -> Optional[Dict]:
        """
        Parse Wiktionary wikitext using wiktextract library.
        
        Note: wiktextract is designed for dump files, but we can use it to parse
        individual pages by creating a minimal context.
        
        Args:
            wikitext: Raw wikitext content
            word: Original word
            language: Source language
            target_language: Target language
        
        Returns:
            Parsed dictionary data or None
        """
        if not WIKTEXTRACT_AVAILABLE:
            return None
        
        try:
            # Try to use wiktextract's page parsing
            # The library has functions to parse individual pages
            from wiktextract.wiktionary import parse_wiktionary_page
            from wiktextract.config import WiktionaryConfig
            
            # Create config for the language
            config = WiktionaryConfig()
            config.language = language
            
            # Parse the page - this should work for individual pages
            parsed = parse_wiktionary_page(word, wikitext, config)
            
            if parsed and len(parsed) > 0:
                # Convert to our standard format
                return self._convert_to_standard_format(parsed, word, language, target_language)
            
        except ImportError as e:
            # If the specific function doesn't exist, try alternative approach
            print(f"[WiktextractService] Import error: {e}")
        except Exception as e:
            print(f"[WiktextractService] Parse error for {word}: {e}")
        
        # Fallback: Simple extraction from wikitext
        return self._simple_extract_from_wikitext(wikitext, word, language, target_language)
    
    def _simple_extract_from_wikitext(self, wikitext: str, word: str, language: str, target_language: str) -> Optional[Dict]:
        """
        Enhanced extraction from wikitext when full wiktextract parsing fails.
        Extracts ALL relevant information: definitions, translations, forms, conjugations, related terms.
        """
        import re
        
        result = {
            'word': word,
            'translation': '',
            'definition': '',
            'part_of_speech': '',
            'grammar': {},
            'examples': [],
            'pronunciations': [],
            'related_terms': [],
            'source': 'wiktextract'
        }
        
        # Extract language section
        lang_section = self._extract_language_section(wikitext, language)
        if not lang_section:
            return None
        
        # Extract pronunciations (IPA notation)
        ipa_pattern = r'IPA.*?:.*?/([^/\]]+)/'
        ipa_matches = re.finditer(ipa_pattern, lang_section, re.IGNORECASE)
        for match in ipa_matches:
            ipa = match.group(1).strip()
            if ipa and ipa not in result['pronunciations']:
                result['pronunciations'].append(ipa)
        
        def _strip_wikitext_markup(text: str) -> str:
            """Light cleanup for wikitext -> displayable text."""
            if not text:
                return ""
            cleaned = text
            # Keep display text from links
            cleaned = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", cleaned)
            cleaned = re.sub(r"\[\[([^\]]+)\]\]", r"\1", cleaned)
            # Drop HTML comments
            cleaned = re.sub(r"<!--.*?-->", "", cleaned, flags=re.DOTALL)
            # Remove some common formatting
            cleaned = cleaned.replace("''", "")
            cleaned = re.sub(r"\s+", " ", cleaned).strip()
            return cleaned

        def _humanize_inflection_template(raw_defn: str) -> Optional[str]:
            """
            Convert common en.wiktionary inflection templates into a readable English gloss.
            Example:
              {{inflection of|it|fare||1|p|impf|ind}}
              -> "inflection of fare (first-person plural imperfect indicative)"
            """
            if not raw_defn:
                return None
            m = re.search(r"\{\{inflection of\|([^|}]+)\|([^|}]+)([^}]*)\}\}", raw_defn, re.IGNORECASE)
            if not m:
                m = re.search(r"\{\{infl of\|([^|}]+)\|([^|}]+)([^}]*)\}\}", raw_defn, re.IGNORECASE)
            if not m:
                return None
            # lang_code = (m.group(1) or "").strip().lower()
            lemma = (m.group(2) or "").strip()
            rest = (m.group(3) or "")
            # Split remaining params (dropping leading '|')
            params = [p for p in rest.split("|") if p]

            # Minimal mapping for common person/number/tense/mood codes.
            code_map = {
                "1": "first-person",
                "2": "second-person",
                "3": "third-person",
                "s": "singular",
                "p": "plural",
                "impf": "imperfect",
                "pres": "present",
                "past": "past",
                "fut": "future",
                "ind": "indicative",
                "sub": "subjunctive",
                "cond": "conditional",
                "imp": "imperative",
            }
            # Keep only recognizable tags (skip empty/positional blanks)
            tags: List[str] = []
            for p in params:
                p_clean = p.strip().lower()
                if not p_clean:
                    continue
                mapped = code_map.get(p_clean)
                if mapped and mapped not in tags:
                    tags.append(mapped)

            tag_str = " ".join(tags).strip()
            if tag_str:
                return f"inflection of {lemma} ({tag_str})"
            return f"inflection of {lemma}"

        # Detect "form of" / "inflection of" templates to avoid bad MT fallbacks.
        # Example pages like "facevamo" are typically "verb form" entries whose
        # best English output is the grammatical description (tense/person),
        # not a machine translation.
        base_lemma: Optional[str] = None
        inflection_gloss: Optional[str] = None
        # Common templates used on en.wiktionary for inflected forms
        infl_patterns = [
            r"\{\{infl of\|[^|}]+\|([^|}]+)",   # {{infl of|it|fare|...}}
            r"\{\{inflection of\|[^|}]+\|([^|}]+)",
            r"\{\{form of\|[^|}]+\|([^|}]+)",
        ]
        for pat in infl_patterns:
            m = re.search(pat, lang_section, re.IGNORECASE)
            if m:
                base_lemma = (m.group(1) or "").strip()
                break

        # Extract definitions (look for # or #* patterns)
        definitions = []
        def_pattern = r'^#+\s*:?\s*(.+?)(?=\n#|\n\||\n==|$)'
        for match in re.finditer(def_pattern, lang_section, re.MULTILINE):
            raw_defn = (match.group(1) or "").strip()

            # Capture a decent gloss for inflected forms (keep some of the template meaning)
            if inflection_gloss is None and re.search(r"\{\{(infl of|inflection of|form of)\b", raw_defn, re.IGNORECASE):
                inflection_gloss = _humanize_inflection_template(raw_defn) or _strip_wikitext_markup(raw_defn)

            # Extract text from translation templates embedded in definitions (rare but useful)
            trans_in_def = re.findall(r"\{\{t\|" + re.escape(target_language) + r"\|([^}]+)\}\}", raw_defn, re.IGNORECASE)
            if trans_in_def:
                for trans in trans_in_def:
                    trans_clean = (trans.split("|")[0] or "").strip()
                    if trans_clean and trans_clean not in definitions:
                        definitions.append(trans_clean)
                continue

            # Otherwise: strip templates and keep readable text
            defn = raw_defn
            defn = re.sub(r"\{\{t\|[^}]+\}\}", "", defn)  # remove translation templates
            defn = re.sub(r"\{\{[^}]*\}\}", "", defn)     # remove other templates
            defn = _strip_wikitext_markup(defn)
            defn = re.sub(r"\([^)]*\)", "", defn).strip()
            if defn and len(defn) > 3 and defn not in definitions:
                definitions.append(defn)
        
        if definitions:
            result['definition'] = '; '.join(definitions[:5])  # Combine up to 5 definitions

        # If this looks like an inflected-form entry, prefer the inflection gloss as the
        # main definition to prevent misleading machine-translation fallbacks.
        if inflection_gloss and (not result.get('definition') or len(result.get('definition', '')) < 4):
            result['definition'] = inflection_gloss

        if base_lemma:
            result["grammar"]["base_lemma"] = base_lemma
        
        # Extract translations (look for translation templates)
        trans_pattern = r'\{\{t\|' + re.escape(target_language) + r'\|([^}]+)\}\}'
        trans_matches = re.finditer(trans_pattern, lang_section, re.IGNORECASE)
        translation_words = []
        for match in trans_matches:
            trans_text = match.group(1).split('|')[0].strip()
            if trans_text and trans_text not in translation_words:
                translation_words.append(trans_text)
        
        if translation_words:
            result['translation'] = ', '.join(translation_words[:3])  # Show up to 3 translations
            # If no definition, use translation as definition
            if not result['definition']:
                result['definition'] = result['translation']
        
        # Extract part of speech (look for ===Noun===, ===Verb===, etc.)
        # Skip non-POS subheaders like Etymology/Pronunciation/References.
        pos_pattern = r'===\s*([^=]+?)\s*==='
        skip_headers = {
            'etymology', 'pronunciation', 'references', 'anagrams', 'see also',
            'further reading', 'alternative forms', 'derived terms', 'related terms',
        }
        for pos_match in re.finditer(pos_pattern, lang_section):
            pos_text = pos_match.group(1).strip()
            pos_lower = pos_text.lower()
            if pos_lower in skip_headers:
                continue
            # Normalize POS
            if pos_lower == 'adverb' or pos_lower == 'adv' or pos_lower.endswith(' adverb'):
                result['part_of_speech'] = 'ADV'
            elif pos_lower == 'verb' or pos_lower.endswith(' verb'):
                result['part_of_speech'] = 'VERB'
            elif pos_lower == 'noun' or pos_lower.endswith(' noun'):
                result['part_of_speech'] = 'NOUN'
            elif pos_lower == 'adjective' or pos_lower == 'adj' or pos_lower.endswith(' adjective'):
                result['part_of_speech'] = 'ADJ'
            elif 'preposition' in pos_lower:
                result['part_of_speech'] = 'ADP'
            elif 'conjunction' in pos_lower:
                result['part_of_speech'] = 'CONJ'
            elif 'interjection' in pos_lower:
                result['part_of_speech'] = 'INTJ'
            else:
                result['part_of_speech'] = pos_text.upper()
            break
        
        # Extract forms/conjugations (look for conjugation tables or {{it-verb}} templates)
        forms_list = []
        
        # For Italian reflexive verbs, look for conjugation patterns
        if language == 'it' and (word.endswith('si') or word.endswith('rsi')):
            result['grammar']['reflexive'] = True
            result['grammar']['conjugation_type'] = 'reflexive'
        
        # Try to extract forms from conjugation templates
        # Look for patterns like "mi vèsto", "ti vèsti" in the wikitext
        form_pattern = r'(?:mi|ti|si|ci|vi)\s+([a-zàèéìíîòóùú]+)'
        form_matches = re.finditer(form_pattern, lang_section, re.IGNORECASE)
        for match in form_matches:
            form_word = match.group(1).strip()
            if form_word and form_word not in forms_list and len(form_word) > 2:
                forms_list.append(form_word)
        
        # Also look for explicit form listings
        form_list_pattern = r'\{\{form of\|[^|]+\|([^}]+)\}\}'
        form_list_matches = re.finditer(form_list_pattern, lang_section, re.IGNORECASE)
        for match in form_list_matches:
            form_text = match.group(1).strip()
            if form_text and form_text not in forms_list:
                forms_list.append(form_text)
        
        if forms_list:
            result['grammar']['forms'] = forms_list[:10]  # Limit to 10 forms
        
        # Extract related terms (look for "Related terms" section)
        related_pattern = r'(?:Related terms|See also).*?:\s*\*\s*\[\[([^\]]+)\]\]'
        related_matches = re.finditer(related_pattern, lang_section, re.IGNORECASE | re.DOTALL)
        for match in related_matches:
            related_word = match.group(1).split('|')[-1].strip()  # Handle [[word|display]] format
            if related_word and related_word not in result['related_terms']:
                result['related_terms'].append(related_word)
        
        # Extract grammar info (conjugation type for verbs)
        if language == 'it' and result.get('part_of_speech') == 'VERB':
            if word.endswith('are') or any('are' in str(f) for f in forms_list):
                result['grammar']['conjugation'] = '1st (-are)'
            elif word.endswith('ere') or any('ere' in str(f) for f in forms_list):
                result['grammar']['conjugation'] = '2nd (-ere)'
            elif word.endswith('ire') or word.endswith('irsi') or any('ire' in str(f) for f in forms_list):
                result['grammar']['conjugation'] = '3rd (-ire)'
        
        return result if (result.get('translation') or result.get('definition')) else None
    
    def _extract_language_section(self, wikitext: str, language: str) -> Optional[str]:
        """Extract the section for the target language from wikitext."""
        # Look for language header (e.g., "==Italian==" or "=={{lang|it|Italian}}==")
        lang_name_map = {
            'it': 'Italian',
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
        }
        
        lang_name = lang_name_map.get(language.lower(), language.capitalize())
        
        # Simple regex to find language section
        import re
        pattern = rf'==\s*{re.escape(lang_name)}\s*=='
        match = re.search(pattern, wikitext, re.IGNORECASE)
        
        if match:
            # Extract section content
            start = match.end()
            # Find the next *language* header (level-2: "==Language==").
            # Don't stop on POS/subheaders like "===Verb===" which also start with "==".
            next_header = re.search(r'\n==[^=]', wikitext[start:])
            if next_header:
                return wikitext[start:start + next_header.start()]
            return wikitext[start:]
        
        return None
    
    def _convert_to_standard_format(self, parsed_data: List[Dict], word: str, language: str, target_language: str) -> Optional[Dict]:
        """
        Convert wiktextract parsed data to our standard format.
        Extracts ALL relevant information: definitions, translations, forms, conjugations, related terms, grammar.
        
        Args:
            parsed_data: List of word entries from wiktextract
            word: Original word
            language: Source language
            target_language: Target language
        
        Returns:
            Standard format dictionary
        """
        if not parsed_data or len(parsed_data) == 0:
            return None
        
        # Get first entry (usually the main one)
        entry = parsed_data[0]
        
        result = {
            'word': word,
            'translation': '',
            'definition': '',
            'part_of_speech': entry.get('pos', ''),
            'grammar': {},
            'examples': [],
            'pronunciations': [],
            'etymology': entry.get('etymology_text', ''),
            'related_terms': [],
            'source': 'wiktextract'
        }
        
        # Extract translations - collect all translations for target language
        translations = entry.get('translations', [])
        translation_words = []
        for trans in translations:
            if isinstance(trans, dict):
                code = trans.get('code', '').lower()
                if code == target_language.lower():
                    word_trans = trans.get('word', '')
                    if word_trans and word_trans not in translation_words:
                        translation_words.append(word_trans)
        
        # Use first translation as primary, combine multiple if available
        if translation_words:
            result['translation'] = translation_words[0]
            if len(translation_words) > 1:
                result['translation'] = ', '.join(translation_words[:3])  # Show up to 3 translations
        
        # Extract definitions from senses - collect ALL definitions
        senses = entry.get('senses', [])
        definitions = []
        for sense in senses:
            glosses = sense.get('glosses', [])
            for gloss in glosses:
                if isinstance(gloss, str) and gloss.strip():
                    # Clean up gloss text
                    clean_gloss = gloss.strip()
                    # Remove extra formatting
                    clean_gloss = clean_gloss.replace('(reflexive)', '').replace('(transitive)', '').strip()
                    if clean_gloss and clean_gloss not in definitions:
                        definitions.append(clean_gloss)
            
            # Extract examples
            examples = sense.get('examples', [])
            for ex in examples:
                if isinstance(ex, dict):
                    text = ex.get('text', '')
                    if text and text not in result['examples']:
                        result['examples'].append(text)
                elif isinstance(ex, str) and ex not in result['examples']:
                    result['examples'].append(ex)
        
        # Combine all definitions with semicolon separator
        if definitions:
            result['definition'] = '; '.join(definitions[:5])  # Limit to 5 most important
        
        # If no definition but we have translation, use translation as definition
        if not result['definition'] and result['translation']:
            result['definition'] = result['translation']
        
        # Extract pronunciations
        pronunciations = entry.get('pronunciations', [])
        for pron in pronunciations:
            if isinstance(pron, dict):
                ipa = pron.get('ipa', '')
                if ipa and ipa not in result['pronunciations']:
                    result['pronunciations'].append(ipa)
        
        # Extract ALL forms (conjugations, inflections, etc.)
        forms_list = []
        if entry.get('forms'):
            for form_entry in entry['forms']:
                if isinstance(form_entry, dict):
                    form_word = form_entry.get('form', '')
                    if form_word and form_word not in forms_list:
                        forms_list.append(form_word)
                elif isinstance(form_entry, str) and form_entry not in forms_list:
                    forms_list.append(form_entry)
        
        if forms_list:
            result['grammar']['forms'] = forms_list
        
        # Extract grammar/morphological features
        # Check for tags (reflexive, transitive, etc.)
        tags = entry.get('tags', [])
        if tags:
            result['grammar']['tags'] = tags
            # Check if reflexive
            if any('reflexive' in str(tag).lower() for tag in tags):
                result['grammar']['reflexive'] = True
        
        # Extract inflection/conjugation information
        if entry.get('inflection_template'):
            result['grammar']['inflection_template'] = entry['inflection_template']
        
        # Extract related terms (from related words section)
        related = entry.get('related', [])
        if related:
            related_terms = []
            for rel in related:
                if isinstance(rel, dict):
                    rel_word = rel.get('word', '')
                    if rel_word and rel_word not in related_terms:
                        related_terms.append(rel_word)
                elif isinstance(rel, str) and rel not in related_terms:
                    related_terms.append(rel)
            if related_terms:
                result['related_terms'] = related_terms
        
        # Extract conjugation type (for verbs)
        if language == 'it' and entry.get('pos', '').lower() == 'verb':
            # Check if it's a reflexive verb (ends in -si)
            if word.endswith('si') or word.endswith('rsi'):
                result['grammar']['reflexive'] = True
                result['grammar']['conjugation_type'] = 'reflexive'
            
            # Extract conjugation class from forms or tags
            if 'forms' in result.get('grammar', {}):
                # Check for typical Italian verb endings
                if any('are' in str(f) for f in result['grammar']['forms']):
                    result['grammar']['conjugation'] = '1st (-are)'
                elif any('ere' in str(f) for f in result['grammar']['forms']):
                    result['grammar']['conjugation'] = '2nd (-ere)'
                elif any('ire' in str(f) for f in result['grammar']['forms']):
                    result['grammar']['conjugation'] = '3rd (-ire)'
        
        return result if (result.get('translation') or result.get('definition')) else None

