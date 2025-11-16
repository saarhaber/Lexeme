"""
Dictionary service for fetching translations and grammar information.
Uses multiple free APIs and fallback methods.
"""
import requests
from typing import Dict, List, Optional
import json
import time

class DictionaryService:
    """Service for fetching word definitions, translations, and grammar information."""
    
    def __init__(self):
        self.cache = {}
        self.rate_limit_delay = 0.05  # Reduced delay for faster processing (was 0.1)
    
    def get_word_info(self, word: str, language: str, target_language: str = "en") -> Dict:
        """
        Get comprehensive word information including translation and grammar breakdown.
        
        Args:
            word: The word to look up
            language: Source language code (e.g., 'it', 'en', 'es')
            target_language: Target language for translation (default: 'en')
        
        Returns:
            Dictionary with definition, translation, grammar info, etc.
        """
        word_lower = word.lower().strip()
        cache_key = f"{word_lower}_{language}_{target_language}"
        
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        result = {
            'word': word,
            'definition': '',
            'translation': '',
            'part_of_speech': '',
            'grammar': {},
            'examples': [],
            'source': 'none'
        }
        
        # Try different dictionary sources based on language
        if language == 'en':
            result = self._get_english_definition(word_lower, result)
        elif language in ['it', 'es', 'fr', 'de', 'pt']:
            result = self._get_romance_language_info(word_lower, language, target_language, result)
        else:
            # Generic fallback
            result = self._get_generic_translation(word_lower, language, target_language, result)
        
        self.cache[cache_key] = result
        return result
    
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
    
    def _get_romance_language_info(self, word: str, source_lang: str, target_lang: str, result: Dict) -> Dict:
        """Get information for Romance languages (Italian, Spanish, French, etc.)."""
        # For Italian, try multiple dictionary sources
        if source_lang == 'it' and target_lang == 'en':
            # Try Italian-specific dictionary sources first
            result = self._get_italian_english_dict(word, result)
            if result.get('translation'):
                translation_found = True
            else:
                translation_found = False
        else:
            translation_found = False
        
        # Try MyMemory Translation API for translations (if not already found)
        if not translation_found:
            try:
                time.sleep(self.rate_limit_delay)
                if source_lang != target_lang:
                    response = requests.get(
                        f"https://api.mymemory.translated.net/get?q={word}&langpair={source_lang}|{target_lang}",
                        timeout=5
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if 'responseData' in data and 'translatedText' in data['responseData']:
                            translation = data['responseData']['translatedText']
                            # Validate translation quality (not just the same word, not empty)
                            if (translation and 
                                translation.lower() != word.lower() and 
                                len(translation.strip()) > 0 and
                                not translation.startswith('[')):  # Skip API error messages
                                result['translation'] = translation.strip()
                                result['definition'] = translation.strip()
                                result['source'] = 'mymemory'
                                translation_found = True
            except Exception as e:
                print(f"Translation API error for {word}: {e}")
        
        # If no translation found, try fallback dictionary
        if not translation_found:
            result = self._get_fallback_translation(word, source_lang, target_lang, result)
        
        # Always try to infer grammar from word endings (language-specific)
        grammar_info = self._analyze_romance_grammar(word, source_lang)
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
            # Try MyMemory for any language pair
            try:
                time.sleep(self.rate_limit_delay)
                response = requests.get(
                    f"https://api.mymemory.translated.net/get?q={word}&langpair={source_lang}|{target_lang}",
                    timeout=5
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'responseData' in data and 'translatedText' in data['responseData']:
                        translation = data['responseData']['translatedText']
                        result['translation'] = translation
                        result['definition'] = translation
                        result['source'] = 'mymemory'
            except Exception as e:
                print(f"Translation error for {word}: {e}")
        
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
                import re
                html = response.text
                # Look for translation patterns in WordReference HTML
                # This is a simple extraction - could be improved
                translation_match = re.search(r'<td class="ToWrd">([^<]+)</td>', html)
                if translation_match:
                    translation = translation_match.group(1).strip()
                    if translation and translation.lower() != word_lower:
                        result['translation'] = translation
                        result['definition'] = translation
                        result['source'] = 'wordreference'
                        return result
        except Exception as e:
            print(f"WordReference lookup error for {word}: {e}")
        
        # Try a comprehensive Italian-English dictionary database (common words)
        italian_dict = {
            'casa': 'house', 'libro': 'book', 'mare': 'sea', 'sole': 'sun', 'luna': 'moon',
            'acqua': 'water', 'terra': 'earth', 'uomo': 'man', 'donna': 'woman', 'bambino': 'child',
            'mangiare': 'to eat', 'bere': 'to drink', 'dormire': 'to sleep', 'camminare': 'to walk',
            'parlare': 'to speak', 'vedere': 'to see', 'sentire': 'to hear', 'pensare': 'to think',
            'amare': 'to love', 'volere': 'to want', 'dovere': 'must', 'potere': 'can',
            'andare': 'to go', 'venire': 'to come', 'fare': 'to do', 'dire': 'to say',
            'essere': 'to be', 'avere': 'to have', 'stare': 'to stay', 'sapere': 'to know',
            'bello': 'beautiful', 'buono': 'good', 'cattivo': 'bad', 'grande': 'big',
            'piccolo': 'small', 'nuovo': 'new', 'vecchio': 'old', 'giovane': 'young',
            'rosso': 'red', 'verde': 'green', 'blu': 'blue', 'bianco': 'white', 'nero': 'black',
            'giorno': 'day', 'notte': 'night', 'mattina': 'morning', 'sera': 'evening',
            'tempo': 'time', 'anno': 'year', 'mese': 'month', 'settimana': 'week',
            'oggi': 'today', 'domani': 'tomorrow', 'ieri': 'yesterday',
            'qui': 'here', 'là': 'there', 'dove': 'where', 'quando': 'when',
            'chi': 'who', 'cosa': 'what', 'perché': 'why', 'come': 'how'
        }
        
        if word_lower in italian_dict:
            result['translation'] = italian_dict[word_lower]
            result['definition'] = italian_dict[word_lower]
            result['source'] = 'builtin_dict'
            return result
        
        return result
    
    def _get_fallback_translation(self, word: str, source_lang: str, target_lang: str, result: Dict) -> Dict:
        """Fallback translation using LibreTranslate API (free, open-source)."""
        # Try LibreTranslate API (free, no API key required)
        try:
            time.sleep(self.rate_limit_delay)
            if source_lang != target_lang:
                # Try multiple LibreTranslate instances
                libre_translate_urls = [
                    'https://libretranslate.com/translate',
                    'https://translate.argosopentech.com/translate'
                ]
                
                for url in libre_translate_urls:
                    try:
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
                            if 'translatedText' in data:
                                translation = data['translatedText'].strip()
                                if translation and translation.lower() != word.lower():
                                    result['translation'] = translation
                                    result['definition'] = translation
                                    result['source'] = 'libretranslate'
                                    return result
                    except Exception:
                        continue  # Try next URL
        except Exception as e:
            print(f"LibreTranslate fallback error for {word}: {e}")
        
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
    
    def batch_get_word_info(self, words: List[str], language: str, target_language: str = "en") -> Dict[str, Dict]:
        """Get information for multiple words efficiently."""
        results = {}
        for word in words:
            results[word] = self.get_word_info(word, language, target_language)
        return results

