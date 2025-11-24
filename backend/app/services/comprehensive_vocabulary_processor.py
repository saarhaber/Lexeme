import re
import json
import requests
from typing import Dict, List, Tuple, Optional, Set
from collections import Counter, defaultdict
from sqlalchemy.orm import Session
import sys
sys.path.append('..')
from ..models.lemma import Lemma
from ..models.phrase import Phrase
from ..models.book import Book
from .book_processor import BookMetadataExtractor
import inflect
import textstat
from wordfreq import zipf_frequency
import fuzzywuzzy
from fuzzywuzzy import fuzz

class ComprehensiveVocabularyProcessor:
    """Advanced vocabulary processor that extracts ALL words, groups families, and provides comprehensive analysis."""
    
    def __init__(self):
        self.book_processor = BookMetadataExtractor()
        self.p = inflect.engine()
        self.nlp_tools = self.book_processor.nlp_tools
        
        # Create comprehensive word database for different languages
        self.language_patterns = {
            'it': self._italian_patterns,
            'en': self._english_patterns,
            'es': self._spanish_patterns,
            'fr': self._french_patterns,
            'de': self._german_patterns
        }
        
        # Translation cache
        self.translation_cache = {}
        
        # Word family patterns (will be expanded with linguistic analysis)
        self.word_families = {}
        
    def _italian_patterns(self) -> Dict[str, List[str]]:
        """Italian morphological patterns for word family grouping."""
        return {
            'article': ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una'],
            'preposition': ['a', 'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle', 'nel', 'nello', 'nella', 'nei', 'negli', 'nelle', 'col', 'collo', 'colla', 'coi', 'colle', 'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle', 'pel', 'pello', 'pella', 'pei', 'pelle'],
            'verb_endings': {
                'are': ['amo', 'ai', 'a', 'iamo', 'ate', 'ano'],
                'ere': ['o', 'i', 'e', 'iamo', 'ete', 'ono'],
                'ire': ['o', 'i', 'e', 'iamo', 'ite', 'ono']
            }
        }
    
    def _english_patterns(self) -> Dict[str, List[str]]:
        """English morphological patterns for word family grouping."""
        return {
            'article': ['the', 'a', 'an'],
            'preposition': ['in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'about', 'of', 'into'],
            'verb_endings': {
                'ing': ['ing'],
                'ed': ['ed', 'd'],
                's': ['s', 'es']
            }
        }
    
    def _spanish_patterns(self) -> Dict[str, List[str]]:
        """Spanish morphological patterns for word family grouping."""
        return {
            'article': ['el', 'la', 'los', 'las', 'un', 'uno', 'una', 'unos', 'unas'],
            'preposition': ['a', 'de', 'en', 'por', 'para', 'con', 'sin', 'sobre', 'hasta', 'desde', 'al', 'del']
        }
    
    def _french_patterns(self) -> Dict[str, List[str]]:
        """French morphological patterns for word family grouping."""
        return {
            'article': ['le', 'la', 'les', 'un', 'une', 'des'],
            'preposition': ['de', 'à', 'dans', 'pour', 'avec', 'sans', 'sur', 'par', 'en']
        }
    
    def _german_patterns(self) -> Dict[str, List[str]]:
        """German morphological patterns for word family grouping."""
        return {
            'article': ['der', 'die', 'das', 'ein', 'eine', 'einen', 'einem', 'einer'],
            'preposition': ['in', 'auf', 'an', 'bei', 'mit', 'nach', 'von', 'zu', 'für', 'durch', 'über', 'unter']
        }
    
    def extract_all_vocabulary(self, text: str, language: str = "en") -> Dict:
        """
        Extract ALL vocabulary from text without any filtering.
        Returns comprehensive analysis including translations and word families.
        OPTIMIZED: Batch processes text for faster extraction.
        """
        print(f"Extracting comprehensive vocabulary for language: {language}")
        
        # Use professional NLP analysis
        nlp_analysis = self.book_processor.analyze_text_nlp(text, language)
        
        # Get enhanced stop words from NLP libraries
        enhanced_stop_words = self._get_enhanced_stop_words(language)
        
        # Extract ALL words without filtering
        all_words = self._extract_all_words(text, language)
        
        # Group words into families
        word_families = self._group_word_families(all_words, language)
        
        # OPTIMIZED: Count frequencies efficiently using Counter
        word_counter = Counter(word.lower() for word in all_words if word.isalpha() and len(word) >= 2)
        
        # OPTIMIZED: Build positions map efficiently
        positions_map = defaultdict(list)
        for i, word in enumerate(all_words):
            word_lower = word.lower()
            if word.isalpha() and len(word) >= 2 and word_lower not in enhanced_stop_words:
                positions_map[word_lower].append(i)
        
        # OPTIMIZED: Analyze words in batch - skip expensive operations
        word_analysis = {}
        total_vocabulary_count = 0
        
        for word_lower, frequency in word_counter.items():
            # Skip stop words
            if word_lower in enhanced_stop_words:
                continue
            
            # Get original form (first occurrence)
            original = next((w for w in all_words if w.lower() == word_lower), word_lower)
            
            word_analysis[word_lower] = {
                'original': original,
                'frequency': frequency,
                'positions': positions_map.get(word_lower, [])[:100],  # Limit positions to 100
                'language': language,
                'family': word_families.get(word_lower, word_lower),
                'grammar': {},  # Will be filled by spaCy batch processing later
                'translations': [],  # Skip expensive translation lookups here
                'difficulty': 0.0,  # Skip expensive difficulty calculation
                'contexts': [],  # Skip expensive context extraction
                'morphology': {}  # Will be filled by spaCy batch processing later
            }
            total_vocabulary_count += 1
        
        # Get comprehensive statistics
        stats = self._calculate_comprehensive_stats(text, word_analysis, language)
        
        # Calculate total_words from original text (count ALL tokens, including single-char words)
        # This matches the word_count calculation in book_processor.extract_text()
        total_words_count = len(text.split())
        
        return {
            "total_words": total_words_count,
            "unique_words": total_vocabulary_count,
            "vocabulary": word_analysis,
            "word_families": word_families,
            "statistics": stats,
            "language": language,
            "complexity_metrics": nlp_analysis
        }
    
    def _extract_all_words(self, text: str, language: str) -> List[str]:
        """Extract ALL words from text without filtering. Improved to prevent broken words."""
        # Use spaCy for better tokenization if available (preserves word boundaries)
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
                # Process in chunks to avoid memory issues
                words = []
                chunk_size = 10000  # Process 10k chars at a time
                for i in range(0, len(text), chunk_size):
                    chunk = text[i:i+chunk_size]
                    doc = nlp(chunk)
                    # Handle Italian/French contractions that may be split by spaCy
                    # Merge tokens like "nell'" + "'" + "estate" back to "nell'estate"
                    tokens = list(doc)
                    j = 0
                    while j < len(tokens):
                        token = tokens[j]
                        # Check if this is a contraction pattern (word + apostrophe + word)
                        if (j + 2 < len(tokens) and 
                            token.is_alpha and 
                            tokens[j+1].text == "'" and 
                            tokens[j+2].is_alpha):
                            # Merge contraction: "nell'" + "'" + "estate" -> "nell'estate"
                            merged = token.text + "'" + tokens[j+2].text
                            # Preserve capitalization for proper nouns
                            if token.pos_ == 'PROPN' or tokens[j+2].pos_ == 'PROPN':
                                words.append(merged.strip())
                            else:
                                words.append(merged.lower().strip())
                            j += 3
                        elif not token.is_punct and not token.is_space:
                            # Regular token - include if it's alphabetic or contains apostrophe
                            # Preserve capitalization for proper nouns (PROPN)
                            if token.pos_ == 'PROPN':
                                # Keep original capitalization for proper nouns
                                token_text = token.text.strip()
                            else:
                                token_text = token.text.lower().strip()
                            if len(token_text.replace("'", "")) >= 2 and (token.is_alpha or "'" in token_text):
                                words.append(token_text)
                            j += 1
                        else:
                            j += 1
                # Fix incorrectly split words from PDF extraction (e.g., "pubbl icato" -> "pubblicato")
                words = self._merge_split_words(words, language)
                return words
            except (OSError, ImportError):
                pass  # Fall through to regex method
        except ImportError:
            pass  # spaCy not available, use regex method
        
        # Fallback: regex-based extraction (improved to preserve word boundaries)
        # Preserve capitalization for proper nouns - don't lowercase the entire text
        # Replace punctuation with spaces, but preserve apostrophes within words (e.g., "l'italiano", "nell'estate")
        if language == 'it':
            # Italian-specific: preserve apostrophes within words
            # Don't lowercase - preserve capitalization for proper nouns like "Einaudi"
            text_clean = re.sub(r'([^\w\s\'])', ' ', text)
            # Split on whitespace, but keep apostrophes
            words = text_clean.split()
            # Clean each word: remove non-alphabetic chars except apostrophes - preserve case
            words = [re.sub(r'[^a-zA-ZàèìòùáéíóúäëïöüßñçÀÈÌÒÙÁÉÍÓÚÄËÏÖÜ\']', '', word) for word in words if len(word) > 0]
            # Preserve capitalization - proper nouns will keep their capital letters
        elif language in ['fr']:
            # French also uses apostrophes in contractions (l'école, d'accord)
            text_clean = re.sub(r'([^\w\s\'])', ' ', text)
            words = text_clean.split()
            words = [re.sub(r'[^a-zA-ZàèìòùáéíóúäëïöüßñçÀÈÌÒÙÁÉÍÓÚÄËÏÖÜ\']', '', word) for word in words if len(word) > 0]
        else:
            # Standard processing for other languages - preserve capitalization
            text_clean = re.sub(r'[^\w\s]', ' ', text)
            words = text_clean.split()
            # Additional processing for languages with special characters
            if language in ['es', 'de']:
                words = [re.sub(r'[^a-zA-ZàèìòùáéíóúäëïöüßñçÀÈÌÒÙÁÉÍÓÚÄËÏÖÜ]', '', word) for word in words if len(word) > 0]
        
        # Filter out single-character words but allow apostrophes in words
        # Preserve original capitalization - proper nouns will keep their capital letters
        words = [word for word in words if len(word.replace("'", "")) >= 2 and (word.replace("'", "").isalpha() or any(c.isalpha() for c in word))]
        
        # Fix incorrectly split words from PDF extraction (e.g., "pubbl icato" -> "pubblicato")
        words = self._merge_split_words(words, language)
        
        return words
    
    def _merge_split_words(self, words: List[str], language: str) -> List[str]:
        """
        Merge words that were incorrectly split during PDF extraction.
        For example: "pubbl icato" -> "pubblicato"
        """
        if not words or language != 'it':
            # Only apply merging for Italian (can be extended to other languages)
            return words
        
        merged_words = []
        i = 0
        
        while i < len(words):
            current_word = words[i].lower()
            should_merge = False
            
            if i + 1 < len(words):
                next_word = words[i + 1].lower()
                merged = current_word + next_word
                
                # Only merge if the combined word is a reasonable length
                if 6 <= len(merged) <= 20:
                    # Pattern 1: Specific known split patterns
                    # "pubbl" + "icato" -> "pubblicato"
                    known_splits = [
                        ('pubbl', 'icato'), ('pubbli', 'cato'),
                        ('comun', 'icato'), ('comuni', 'cato'),
                        ('partic', 'olare'), ('partico', 'lare'),
                        ('appl', 'icato'), ('appli', 'cato'),
                        ('espl', 'icato'), ('espli', 'cato'),
                        ('impl', 'icato'), ('impli', 'cato'),
                        ('compl', 'icato'), ('compli', 'cato'),
                        ('sempl', 'icato'), ('semplic', 'ato'),
                        ('multipl', 'icato'), ('multipli', 'cato'),
                    ]
                    
                    for prefix, suffix in known_splits:
                        if current_word.endswith(prefix) and next_word.startswith(suffix):
                            should_merge = True
                            break
                    
                    # Pattern 2: Generic pattern - word ending in common prefix + word starting with "icato"/"icito"/"icuto"
                    if not should_merge:
                        common_prefixes = ['pubbl', 'comun', 'partic', 'appl', 'espl', 'impl', 'compl', 'sempl']
                        if (any(current_word.endswith(prefix) for prefix in common_prefixes) and
                            (next_word.startswith('icato') or next_word.startswith('icito') or 
                             next_word.startswith('icuto') or next_word.startswith('licato') or
                             next_word.startswith('licito') or next_word.startswith('licuto'))):
                            should_merge = True
                    
                    # Pattern 3: Use spaCy validation if available (most reliable)
                    if should_merge:
                        try:
                            import spacy
                            spacy_models = {
                                'en': 'en_core_web_sm',
                                'it': 'it_core_news_sm',
                                'es': 'es_core_news_sm',
                                'fr': 'fr_core_news_sm',
                                'de': 'de_core_news_sm',
                            }
                            model_name = spacy_models.get(language, 'it_core_news_sm')
                            try:
                                nlp = spacy.load(model_name)
                                doc = nlp(merged)
                                # If spaCy recognizes it as a single valid token, merge it
                                if len(doc) == 1 and doc[0].is_alpha and len(doc[0].text) == len(merged):
                                    should_merge = True
                                else:
                                    # If spaCy splits it differently, don't merge
                                    should_merge = False
                            except (OSError, ImportError):
                                pass  # Keep should_merge decision if spaCy not available
                        except ImportError:
                            pass  # Keep should_merge decision if spaCy not available
            
            if should_merge and i + 1 < len(words):
                # Merge the words, preserving capitalization from first word if it was capitalized
                first_word = words[i]
                second_word = words[i + 1]
                
                # Preserve capitalization: if first word starts with capital, keep it
                if first_word and first_word[0].isupper():
                    merged_word = first_word + second_word.lower()
                else:
                    merged_word = first_word.lower() + second_word.lower()
                
                merged_words.append(merged_word)
                i += 2  # Skip both words
            else:
                merged_words.append(words[i])
                i += 1
        
        return merged_words
    
    def _group_word_families(self, words: List[str], language: str) -> Dict[str, str]:
        """
        Group words into families based on morphological patterns.
        Returns word -> root mapping, NOT word -> category mapping.
        This is used for grouping conjugations/forms, not for categorizing words.
        """
        word_families = {}
        word_counts = Counter(words)
        
        patterns = self.language_patterns.get(language, self._english_patterns)()
        
        for word, count in word_counts.items():
            # Don't assign category names - just find the root/lemma
            # The root should be an actual word form, not a category name
            family = self._find_word_family_root(word, language, patterns)
            # Ensure we never return category names - always return a word form
            if family in ['article', 'preposition', 'conjunction', 'pronoun']:
                # If we got a category, just use the word itself
                word_families[word] = word
            else:
                word_families[word] = family
        
        return word_families
    
    def _find_word_family_root(self, word: str, language: str, patterns: Dict) -> str:
        """Find the root of a word family using morphological analysis."""
        word = word.lower()
        
        # Remove common endings to find root
        endings = []
        if 'verb_endings' in patterns:
            endings.extend(patterns['verb_endings'].get('are', []))
            endings.extend(patterns['verb_endings'].get('ere', []))
            endings.extend(patterns['verb_endings'].get('ire', []))
            endings.extend(patterns['verb_endings'].get('ing', []))
            endings.extend(patterns['verb_endings'].get('ed', []))
            endings.extend(patterns['verb_endings'].get('s', []))
        
        # Try removing endings
        for ending in sorted(endings, key=len, reverse=True):
            if word.endswith(ending) and len(word) > len(ending):
                root = word[:-len(ending)]
                if len(root) >= 2:  # Keep root if it's meaningful
                    return root
        
        # Use fuzzy matching to find similar roots
        potential_roots = set()
        for other_word, family in self.word_families.items():
            if fuzz.ratio(word, other_word) > 70 and len(other_word) > 2:
                potential_roots.add(family)
        
        if potential_roots:
            return list(potential_roots)[0]
        
        return word  # Return original if no family found
    
    def _analyze_word_grammar(self, word: str, language: str, text: str) -> Dict:
        """Analyze grammatical information for a word."""
        analysis = {
            'part_of_speech': 'UNKNOWN',
            'conjugation': None,
            'number': None,
            'gender': None,
            'tense': None,
            'complexity_score': 0.0
        }
        
        if 'textblob' in self.nlp_tools:
            try:
                from textblob import TextBlob
                blob = TextBlob(text)
                
                # Find the word in sentences and analyze
                for sentence in blob.sentences:
                    if word in str(sentence).lower():
                        tags = sentence.tags
                        for w, tag in tags:
                            if w.lower() == word:
                                analysis['part_of_speech'] = tag
                                analysis['complexity_score'] = self._get_pos_complexity_score(tag, language)
                                break
            except Exception as e:
                print(f"Grammar analysis failed: {e}")
        
        # Language-specific analysis
        if language == 'it':
            analysis.update(self._italian_grammar_analysis(word))
        elif language == 'en':
            analysis.update(self._english_grammar_analysis(word))
        
        return analysis
    
    def _italian_grammar_analysis(self, word: str) -> Dict:
        """Italian-specific grammatical analysis."""
        analysis = {}
        
        # Check for verb endings
        if word.endswith('are'):
            analysis['conjugation'] = '1st_group'
            analysis['tense'] = 'infinitive'
        elif word.endswith('ere'):
            analysis['conjugation'] = '2nd_group'
            analysis['tense'] = 'infinitive'
        elif word.endswith('ire'):
            analysis['conjugation'] = '3rd_group'
            analysis['tense'] = 'infinitive'
        
        # Check gender for nouns/adjectives
        if word.endswith('o'):
            analysis['gender'] = 'masculine'
            analysis['part_of_speech'] = analysis.get('part_of_speech', 'NOUN')
        elif word.endswith('a'):
            analysis['gender'] = 'feminine'
            analysis['part_of_speech'] = analysis.get('part_of_speech', 'NOUN')
        
        # Check plural forms
        if word.endswith('i'):
            analysis['number'] = 'plural'
        elif word.endswith('o') or word.endswith('a'):
            analysis['number'] = 'singular'
        
        return analysis
    
    def _english_grammar_analysis(self, word: str) -> Dict:
        """English-specific grammatical analysis."""
        analysis = {}
        
        # Verb tense detection
        if word.endswith('ing'):
            analysis['tense'] = 'present_participle'
            analysis['part_of_speech'] = 'VERB'
        elif word.endswith('ed'):
            analysis['tense'] = 'past_tense'
            analysis['part_of_speech'] = 'VERB'
        elif word.endswith('s') and len(word) > 3:
            analysis['tense'] = 'present_3rd_singular'
            analysis['part_of_speech'] = 'VERB'
        
        return analysis
    
    def _get_pos_complexity_score(self, pos_tag: str, language: str) -> float:
        """Calculate complexity score based on part of speech."""
        complexity_map = {
            'NOUN': 1.0,
            'VERB': 2.0,
            'ADJ': 1.5,
            'ADV': 2.5,
            'PRON': 0.5,
            'DET': 0.3,
            'ADP': 0.2,
            'CONJ': 0.8,
            'NUM': 1.2,
            'PART': 0.7,
            'INTJ': 2.8,
            'PUNCT': 0.1,
            'SYM': 1.8,
            'X': 2.0
        }
        
        # Use first letter for TextBlob compatibility
        if pos_tag and len(pos_tag) > 0:
            return complexity_map.get(pos_tag[0], 1.0)
        
        return 1.0
    
    def _get_word_translations(self, word: str, target_language: str = "en") -> List[str]:
        """Get translations for a word using multiple sources. Returns ONLY English translations, not morphological variations."""
        cache_key = f"{word}_{target_language}"
        if cache_key in self.translation_cache:
            return self.translation_cache[cache_key]
        
        translations = []
        
        # Try multiple translation approaches
        try:
            # Method 1: Use NLTK wordnet if available
            if 'nltk' in self.nlp_tools:
                translations.extend(self._get_nltk_translations(word, target_language))
            
            # Method 2: Use common dictionary patterns
            translations.extend(self._get_dictionary_translations(word, target_language))
            
            # DON'T use inflections - they return morphological variations, not translations
            
        except Exception as e:
            print(f"Translation failed for {word}: {e}")
        
        # Clean and deduplicate translations - filter out morphological info
        cleaned_translations = []
        for t in translations:
            t_str = t.strip()
            # Skip morphological variations
            if t_str and not t_str.startswith(('plural:', 'feminine:', 'masculine:')):
                cleaned_translations.append(t_str)
        
        cleaned_translations = list(set(cleaned_translations))
        
        self.translation_cache[cache_key] = cleaned_translations
        return cleaned_translations
    
    def _get_nltk_translations(self, word: str, target_language: str) -> List[str]:
        """Get translations using NLTK wordnet."""
        translations = []
        try:
            import nltk
            ensure_nltk_resource('wordnet', 'corpora/wordnet')
            ensure_nltk_resource('omw-1.4', 'corpora/omw-1.4')
            
            from nltk.corpus import wordnet
            
            # Get synsets for the word
            synsets = wordnet.synsets(word)
            for synset in synsets[:3]:  # Limit to first 3 synsets
                lemma_names = synset.lemma_names()
                for lemma_name in lemma_names:
                    if lemma_name != word and lemma_name.isalpha():
                        translations.append(lemma_name)
            
        except Exception as e:
            print(f"NLTK translation failed: {e}")
        
        return translations
    
    def _get_dictionary_translations(self, word: str, target_language: str) -> List[str]:
        """Get translations using common dictionary patterns."""
        translations = []
        
        # Basic translation database (can be expanded)
        translation_db = {
            'it': {
                'il': 'the', 'la': 'the', 'è': 'is', 'di': 'of', 'a': 'to', 'e': 'and', 'per': 'for',
                'libro': 'book', 'casa': 'house', 'mare': 'sea', 'mangiare': 'to eat', 'bere': 'to drink'
            },
            'en': {
                'the': 'the', 'book': 'book', 'house': 'house', 'water': 'water'
            }
        }
        
        if word.lower() in translation_db.get(target_language, {}):
            translations.append(translation_db[target_language][word.lower()])
        
        return translations
    
    def _get_inflection_translations(self, word: str, target_language: str) -> List[str]:
        """Get translations using inflections (basic linguistic analysis)."""
        translations = []
        
        # Use inflect library for basic linguistic transformations
        try:
            if target_language == 'it':
                # Get plural for Italian
                plural = self.p.plural(word)
                if plural != word:
                    translations.append(f"plural: {plural}")
                
                # Get adjective form (basic)
                if word.endswith('o'):
                    feminine = word[:-1] + 'a'
                    translations.append(f"feminine: {feminine}")
        
        except Exception as e:
            print(f"Inflection translation failed: {e}")
        
        return translations
    
    def _calculate_difficulty(self, word: str, text: str, language: str) -> float:
        """
        Calculate difficulty score for a word.
        
        Updated to rely primarily on robust corpus frequencies from `wordfreq`
        (Zipf scale) with lightweight local heuristics as a supplement.
        """
        word_lower = word.lower()
        
        # 1) Global frequency from large corpora (Zipf 0–8; higher = more common)
        try:
            zipf = zipf_frequency(word_lower, language, wordlist='best')
        except Exception:
            zipf = 0.0
        
        # Map Zipf to a 0–1 "ease" score (common words easier).
        # Typical content words are ~2–6; clamp to that range.
        zipf_clamped = max(1.0, min(zipf, 7.0))
        ease_from_frequency = (zipf_clamped - 1.0) / (7.0 - 1.0)  # 0 (rarest) .. 1 (most common)
        
        # 2) Local factors as light modifiers
        length = len(word_lower)
        length_penalty = min(max((length - 5) / 10.0, 0.0), 0.5)  # long words slightly harder
        
        morphological_complexity = self._calculate_morphological_complexity(word_lower, language)
        
        # Combine: start from frequency-based ease, subtract penalties, then invert to difficulty
        ease_score = ease_from_frequency - 0.3 * length_penalty - 0.3 * morphological_complexity
        ease_score = max(0.0, min(ease_score, 1.0))
        
        difficulty = 1.0 - ease_score
        return max(0.0, min(difficulty, 1.0))
    
    def _calculate_morphological_complexity(self, word: str, language: str) -> float:
        """Calculate morphological complexity of a word."""
        complexity = 0.0
        
        # Check for affixes
        prefixes = ['anti', 'auto', 'bio', 'co', 'con', 'de', 'dis', 'en', 'ex', 'in', 'mid', 'mis', 'non', 'over', 'pre', 're', 'sub', 'super', 'trans', 'un']
        suffixes = ['able', 'al', 'ed', 'en', 'er', 'est', 'ful', 'hood', 'ing', 'ion', 'ish', 'ism', 'ist', 'ity', 'less', 'ly', 'ment', 'ness', 'ous', 'ship', 'sion', 'tion', 'ward', 'wise']
        
        for prefix in prefixes:
            if word.lower().startswith(prefix):
                complexity += 0.2
        
        for suffix in suffixes:
            if word.lower().endswith(suffix):
                complexity += 0.2
        
        # Check for compound words (simple heuristic)
        if word.lower().count('-') > 0:
            complexity += 0.3
        
        # Check for special characters
        special_chars = len(re.findall(r'[àèìòùáéíóúäëïöüßñç]', word.lower()))
        complexity += special_chars * 0.1
        
        return min(complexity, 1.0)
    
    def _calculate_word_rarity(self, word: str, language: str) -> float:
        """
        Backwards-compatible rarity helper.
        
        Kept for legacy callers, but now derived from `wordfreq` Zipf values
        when available, falling back to a simple length-based heuristic.
        """
        word_lower = word.lower()
        try:
            zipf = zipf_frequency(word_lower, language, wordlist='best')
            # Low Zipf → rare (~0–3), high → common (~5–7).
            # Convert to 0–1 rarity score where rarer words are closer to 1.
            zipf_clamped = max(1.0, min(zipf, 7.0))
            rarity = 1.0 - (zipf_clamped - 1.0) / (7.0 - 1.0)
            return max(0.0, min(rarity, 1.0))
        except Exception:
            # Fallback: longer words are slightly rarer
            return min(len(word) / 15.0, 1.0)
    
    def _extract_contexts(self, word: str, text: str) -> List[str]:
        """Extract context sentences containing the word."""
        contexts = []
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            if word.lower() in sentence.lower():
                contexts.append(sentence.strip())
        
        return contexts[:5]  # Limit to first 5 contexts
    
    def _analyze_morphology(self, word: str, language: str) -> Dict:
        """Analyze morphological features of a word."""
        morphology = {
            'root': word,
            'prefixes': [],
            'suffixes': [],
            'derivations': [],
            'inflections': []
        }
        
        # Simple morphological analysis
        word_lower = word.lower()
        
        # Check for common affixes
        prefixes = ['anti', 'auto', 'bio', 'co', 'de', 'dis', 'en', 'ex', 'in', 'pre', 're', 'un']
        suffixes = ['able', 'al', 'ed', 'en', 'er', 'ful', 'ing', 'ion', 'ish', 'ism', 'ist', 'ity', 'less', 'ly', 'ment', 'ness', 'ous', 'sion', 'tion']
        
        for prefix in prefixes:
            if word_lower.startswith(prefix):
                morphology['prefixes'].append(prefix)
                morphology['root'] = word_lower[len(prefix):]
        
        for suffix in suffixes:
            if word_lower.endswith(suffix):
                morphology['suffixes'].append(suffix)
                morphology['root'] = word_lower[:-len(suffix)]
        
        return morphology
    
    def _calculate_comprehensive_stats(self, text: str, vocabulary: Dict, language: str) -> Dict:
        """Calculate comprehensive statistics for the text."""
        stats = {
            'total_words': len(text.split()),
            'unique_words': len(vocabulary),
            'vocabulary_density': 0,
            'average_word_length': 0,
            'sentence_count': len(re.split(r'[.!?]+', text)) - 1,
            'difficulty_distribution': {
                'easy': 0,
                'medium': 0,
                'hard': 0,
                'very_hard': 0
            },
            'word_families': {},
            'parts_of_speech': {},
            'unknown_words': list(vocabulary.keys()),  # All words are unknown initially
            'complexity_metrics': {}
        }
        
        # Calculate vocabulary density
        stats['vocabulary_density'] = len(vocabulary) / len(text.split()) if text.split() else 0
        
        # Calculate average word length
        if vocabulary:
            total_length = sum(len(word) for word in vocabulary.keys())
            stats['average_word_length'] = total_length / len(vocabulary)
        
        # Analyze difficulty distribution
        for word_data in vocabulary.values():
            difficulty = word_data.get('difficulty', 0)
            if difficulty < 0.25:
                stats['difficulty_distribution']['easy'] += 1
            elif difficulty < 0.5:
                stats['difficulty_distribution']['medium'] += 1
            elif difficulty < 0.75:
                stats['difficulty_distribution']['hard'] += 1
            else:
                stats['difficulty_distribution']['very_hard'] += 1
        
        # Analyze word families
        family_counts = Counter()
        pos_counts = Counter()
        
        for word_data in vocabulary.values():
            family = word_data.get('family', 'unknown')
            pos = word_data.get('grammar', {}).get('part_of_speech', 'UNKNOWN')
            
            family_counts[family] += 1
            pos_counts[pos] += 1
        
        stats['word_families'] = dict(family_counts.most_common(10))
        stats['parts_of_speech'] = dict(pos_counts.most_common(10))
        
        return stats
    
    def _get_enhanced_stop_words(self, language: str) -> set:
        """Get enhanced stop words using NLTK."""
        enhanced_stop_words = set()
        
        if 'nltk' in self.nlp_tools:
            try:
                import nltk
                
                # Ensure stopwords resource is present once
                ensure_nltk_resource('stopwords', 'corpora/stopwords')
                
                from nltk.corpus import stopwords
                
                # Get stop words for the detected language
                if language in stopwords.fileids():
                    enhanced_stop_words = set(stopwords.words(language))
                    print(f"Using NLTK stop words for language: {language}")
                else:
                    # Fallback to English
                    enhanced_stop_words = set(stopwords.words('english'))
                    print(f"Using English NLTK stop words as fallback for: {language}")
                    
            except Exception as e:
                print(f"Could not load NLTK stop words: {e}")
                print("Using basic stop words only")
        
        return enhanced_stop_words
    
    def save_comprehensive_analysis(self, analysis: Dict, book_id: int, db: Session):
        """Save comprehensive vocabulary analysis to database."""
        # Save enhanced lemmas
        for word, data in analysis['vocabulary'].items():
            lemma_record = Lemma(
                lemma=data['original'],
                language=data['language'],
                pos=data['grammar'].get('part_of_speech', 'NOUN'),
                definition='; '.join(data.get('translations', [])),
                morphology=data.get('morphology', {}),
                global_frequency=len(data.get('contexts', [])),
                difficulty_level=data.get('difficulty', 0.5)
            )
            
            # Check if exists
            existing = db.query(Lemma).filter(Lemma.lemma == data['original']).first()
            if existing:
                # Update existing
                existing.pos = lemma_record.pos
                existing.definition = lemma_record.definition
                existing.morphology = lemma_record.morphology
                existing.global_frequency = lemma_record.global_frequency
                existing.difficulty_level = lemma_record.difficulty_level
            else:
                # Add new
                db.add(lemma_record)
        
        db.commit()
        print(f"Saved {len(analysis['vocabulary'])} vocabulary entries")
    
    def save_comprehensive_analysis_with_lemmatization(
        self, 
        analysis: Dict, 
        book_id: int, 
        language: str, 
        db: Session,
        dictionary_service=None  # Optional - not used anymore for speed
    ):
        """
        Save vocabulary analysis with proper lemmatization using spaCy.
        Groups words with same root/conjugation together.
        OPTIMIZED: Batch processes text with spaCy for much faster processing.
        """
        from ..models.lemma import Token
        
        # Try to use spaCy for proper lemmatization
        spacy_nlp = None
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
                spacy_nlp = spacy.load(model_name)
                print(f"✅ Using spaCy model {model_name} for batch lemmatization")
            except OSError:
                print(f"⚠️  spaCy model {model_name} not available, using basic lemmatization")
        except ImportError:
            print("⚠️  spaCy not installed, using basic lemmatization")
        
        # OPTIMIZED: Batch process all unique words at once with spaCy
        unique_words = list(analysis['vocabulary'].keys())
        print(f"Batch processing {len(unique_words)} unique words with spaCy...")
        
        # Create a mapping of word -> spaCy info using batch processing
        word_to_spacy = {}
        if spacy_nlp:
            # Process words in batches to avoid memory issues
            batch_size = 1000
            for i in range(0, len(unique_words), batch_size):
                batch = unique_words[i:i+batch_size]
                # Create a simple text with all words separated by spaces
                batch_text = ' '.join(batch)
                try:
                    doc = spacy_nlp(batch_text)
                    for token in doc:
                        word_lower = token.text.lower().strip()
                        if word_lower in unique_words:
                            # Preserve original capitalization for proper nouns
                            word_original = token.text.strip()
                            lemma = token.lemma_.lower().strip() if token.lemma_ else word_lower
                            # For proper nouns, preserve capitalization in lemma too
                            if token.pos_ == 'PROPN' and token.lemma_:
                                lemma = token.lemma_.strip()
                            morph_dict = {}
                            if token.morph:
                                morph_dict = {str(k): str(v) for k, v in token.morph.to_dict().items()}
                            word_to_spacy[word_lower] = {
                                'pos': token.pos_,
                                'tag': token.tag_,
                                'morph': morph_dict,
                                'lemma': lemma if lemma else word_lower,
                                'original': word_original  # Store original capitalization
                            }
                except Exception as e:
                    print(f"Error batch processing words: {e}")
                    # Fallback to individual processing for this batch
                    for word in batch:
                        try:
                            doc = spacy_nlp(word.lower())
                            if len(doc) > 0:
                                token = doc[0]
                                lemma = token.lemma_.lower().strip() if token.lemma_ else word.lower()
                                morph_dict = {}
                                if token.morph:
                                    morph_dict = {str(k): str(v) for k, v in token.morph.to_dict().items()}
                                word_to_spacy[word.lower()] = {
                                    'pos': token.pos_,
                                    'tag': token.tag_,
                                    'morph': morph_dict,
                                    'lemma': lemma if lemma else word.lower()
                                }
                        except:
                            pass
        
        # Group words by lemma using batch-processed spaCy info
        # IMPORTANT: Normalize clitic forms (e.g., "conocerla" -> "conocere") before grouping
        lemma_groups = {}  # lemma -> list of (word, data, spacy_info)
        
        # Import dictionary service for normalization (handles clitics properly)
        from .dictionary_service import DictionaryService
        dict_normalizer = DictionaryService()
        
        for word, data in analysis['vocabulary'].items():
            word_lower = word.lower().strip()
            
            # Skip empty or single-character words
            if not word_lower or len(word_lower) < 2:
                continue
            
            # CRITICAL: Normalize clitic forms BEFORE getting spaCy lemma
            # This ensures "conocerla" -> "conocere" before grouping
            normalized_word = dict_normalizer.normalize_word_form(word_lower, language)
            
            # Get spaCy info from batch processing (use normalized word for lookup if available)
            spacy_lookup_key = normalized_word if normalized_word in word_to_spacy else word_lower
            if spacy_lookup_key in word_to_spacy:
                spacy_info = word_to_spacy[spacy_lookup_key]
                lemma = spacy_info['lemma']
                
                # Validate lemma: if it's too short or seems broken, use normalized word
                # spaCy sometimes returns incomplete lemmas (e.g., "scus" instead of "scusare")
                if not lemma or len(lemma) < 3 or lemma == normalized_word[:len(lemma)]:
                    # Use normalized word as lemma if spaCy's lemma is broken
                    lemma = normalized_word
            else:
                # Fallback: use normalized word (not original word)
                lemma = normalized_word
                # Try to get spaCy info for normalized word
                if normalized_word != word_lower and normalized_word in word_to_spacy:
                    spacy_info = word_to_spacy[normalized_word]
                else:
                    # Create minimal spacy_info for words with clitics
                    spacy_info = {'pos': 'X', 'tag': 'X', 'morph': {}, 'lemma': lemma}
            
            # CRITICAL: Use normalized form as lemma to ensure clitic forms are grouped together
            # For example: "conocerla", "conocerlo", "conocerle" all group under "conocere"
            lemma = normalized_word
            
            # Skip empty lemmas or category names (not actual words)
            if not lemma or len(lemma) < 2:
                continue
            
            # Skip if lemma is a grammatical category name (not an actual word)
            category_names = {'article', 'preposition', 'conjunction', 'pronoun', 'adverb', 'adjective', 'noun', 'verb'}
            if lemma.lower() in category_names:
                # Use the normalized word itself instead of the category
                lemma = normalized_word
                
            if lemma not in lemma_groups:
                lemma_groups[lemma] = []
            lemma_groups[lemma].append((word, data, spacy_info))
        
        print(f"Grouped {len(analysis['vocabulary'])} words into {len(lemma_groups)} lemmas")
        
        # OPTIMIZED: Skip dictionary lookups for very common words (articles, prepositions, etc.)
        common_words_skip_dict = {
            'it': {'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'e', 'che', 'è', 'sono'},
            'en': {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were'},
            'es': {'el', 'la', 'los', 'las', 'un', 'una', 'de', 'a', 'en', 'con', 'por', 'para'},
            'fr': {'le', 'la', 'les', 'un', 'une', 'de', 'à', 'dans', 'pour', 'avec'},
            'de': {'der', 'die', 'das', 'ein', 'eine', 'in', 'auf', 'an', 'mit'}
        }
        skip_dict_lookup = common_words_skip_dict.get(language, set())
        
        # Save lemmas with dictionary information
        saved_count = 0
        token_count = 0
        lemma_records = []  # Batch collect lemma records
        token_records = []  # Batch collect token records
        token_to_lemma_map = {}  # Map original_token -> lemma for ID resolution
        
        for lemma, word_list in lemma_groups.items():
            try:
                # CRITICAL: Prefer base/infinitive form as canonical, even if less frequent
                # This ensures "conocerla" appears under "conocere", not as separate entry
                # Sort by: 1) base form (infinitive/lemma) if it exists, 2) frequency
                def sort_key(x):
                    word_key, word_data, _ = x
                    word_lower = word_key.lower().strip()
                    freq = word_data.get('frequency', 0)
                    
                    # Prefer the lemma itself if it appears in the word list
                    if word_lower == lemma:
                        return (0, -freq)  # Base form first, then by frequency
                    
                    # For verbs, prefer infinitive forms (ends with -are, -ere, -ire for Italian)
                    if language in ['it', 'es', 'fr']:
                        if language == 'it' and word_lower.endswith(('are', 'ere', 'ire', 'irsi', 'arsi', 'ersi')):
                            # Prefer infinitives, especially non-reflexive ones
                            if word_lower.endswith(('are', 'ere', 'ire')):
                                return (1, -freq)  # Non-reflexive infinitives
                            else:
                                return (2, -freq)  # Reflexive infinitives
                        elif language == 'es' and word_lower.endswith(('ar', 'er', 'ir')):
                            return (1, -freq)
                        elif language == 'fr' and word_lower.endswith(('er', 'ir', 're')):
                            return (1, -freq)
                    
                    # Otherwise, sort by frequency (higher frequency first)
                    return (3, -freq)
                
                word_list.sort(key=sort_key)
                canonical_word_key, canonical_data, canonical_spacy = word_list[0]
                
                # Use the ORIGINAL capitalization from the data, not the lowercase key
                # This preserves proper nouns like "Ginzburg" instead of "ginzburg"
                canonical_word = canonical_data.get('original', canonical_word_key)
                canonical_word_lower = canonical_word.lower().strip()
                canonical_frequency = canonical_data.get('frequency', 0)
                
                # Check if this is a proper noun - preserve capitalization (e.g., "Einaudi", "Ginzburg")
                # Proper nouns are detected by: spaCy PROPN tag OR majority of word forms start with capital
                # Check original forms, not lowercase keys
                original_forms = [d.get('original', w) for w, d, _ in word_list]
                capitalized_count = len([w for w in original_forms if w and w[0].isupper()])
                total_count = len(original_forms)
                
                # More robust proper noun detection:
                # 1. spaCy PROPN tag (most reliable)
                # 2. Canonical word starts with capital AND majority of forms are capitalized
                # 3. If canonical word starts with capital and appears frequently, likely a proper noun
                is_proper_noun = (
                    canonical_spacy.get('pos') == 'PROPN' or
                    (canonical_word and canonical_word[0].isupper() and 
                     (capitalized_count > total_count * 0.5 or 
                      (capitalized_count > 0 and canonical_frequency > 5)))  # If it appears capitalized and frequently, likely proper noun
                )
                
                # Check if the lemma actually appears in the word list
                # If spaCy is correct, the lemma (e.g., "scusare") should be in the list
                lemma_in_list = False
                lemma_frequency = 0
                all_word_forms = [d.get('original', w[0]).lower().strip() for w, d, _ in word_list]
                
                for w, d, _ in word_list:
                    original_form = d.get('original', w)
                    if original_form.lower().strip() == lemma:
                        lemma_in_list = True
                        lemma_frequency = d.get('frequency', 0)
                        break
                
                # If lemma doesn't appear in the word list, it's likely broken/incomplete
                # Check if any word form is longer and starts with the lemma (e.g., "scus" -> "scusare")
                if not lemma_in_list:
                    longest_form = max(all_word_forms, key=len) if all_word_forms else canonical_word_lower
                    
                    # If lemma is significantly shorter and longest form starts with it, use most frequent form
                    if (len(lemma) < len(longest_form) - 2 and 
                        longest_form.startswith(lemma) and
                        len(longest_form) >= 4):  # Only for words 4+ chars
                        # Use the most frequent word form as the lemma
                        old_lemma = lemma
                        lemma = canonical_word_lower
                        print(f"Fixed broken lemma: using most frequent form '{lemma}' (freq: {canonical_frequency}) instead of '{old_lemma}'")
                
                # If lemma is in list but much less frequent than canonical, prefer canonical if it's the infinitive
                # (This handles cases where "scusare" appears but "scusi" is more frequent)
                elif lemma_in_list and canonical_frequency > lemma_frequency * 3:
                    # Check if canonical word looks like an infinitive (ends with -are, -ere, -ire for Italian)
                    if language == 'it' and canonical_word_lower.endswith(('are', 'ere', 'ire')):
                        # Prefer the infinitive form even if less frequent
                        lemma = canonical_word_lower
                        print(f"Using infinitive form '{lemma}' as lemma (canonical freq: {canonical_frequency} vs lemma freq: {lemma_frequency})")
                
                # Use spaCy POS if available (most reliable)
                spacy_pos = canonical_spacy.get('pos', 'X')
                spacy_tag = canonical_spacy.get('tag', 'X')
                spacy_morph = canonical_spacy.get('morph', {})
                
                # SMART dictionary lookup: Check database first, only call APIs for new words
                # This way the dictionary grows organically - once a word is looked up, it's reused!
                dict_info = {}
                if dictionary_service:
                    try:
                        # Pass db session - DictionaryService will check database first
                        # If word exists in DB with definition, no API call needed!
                        dict_info = dictionary_service.get_word_info(lemma, language, "en", db=db)
                    except Exception as e:
                        print(f"Dictionary lookup failed for '{lemma}': {e}")
                        dict_info = {}
                # Note: Dictionary lookups are now smart - they check DB first
                # Only new words trigger API calls, making it much faster
                #     # Check if we should skip this word (common function words)
                #     common_words_skip_dict = {
                #         'it': {'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'e', 'che', 'è', 'sono'},
                #         'en': {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were'},
                #         'es': {'el', 'la', 'los', 'las', 'un', 'una', 'de', 'a', 'en', 'con', 'por', 'para'},
                #         'fr': {'le', 'la', 'les', 'un', 'une', 'de', 'à', 'dans', 'pour', 'avec'},
                #         'de': {'der', 'die', 'das', 'ein', 'eine', 'in', 'auf', 'an', 'mit'}
                #     }
                #     skip_dict_lookup = common_words_skip_dict.get(language, set())
                #     
                #     if lemma not in skip_dict_lookup:
                #         try:
                #             # Only lookup dictionary for meaningful words (not articles/prepositions)
                #             dict_info = dictionary_service.get_word_info(lemma, language, "en")
                #         except Exception as e:
                #             print(f"Dictionary lookup failed for '{lemma}': {e}")
                #             dict_info = {}
                
                # Combine all frequencies from all word forms
                total_frequency = sum(d[1].get('frequency', 0) for d in word_list)
                
                # Build definition prioritizing English translation ONLY
                definition_parts = []
                # First priority: dictionary translation (English)
                if dict_info.get('translation'):
                    translation = str(dict_info['translation']).strip()
                    # Only add if it's actually a translation (not morphological info, not the same as lemma)
                    if (translation and 
                        translation.lower() != lemma.lower() and 
                        not translation.startswith(('plural:', 'feminine:', 'masculine:', 'root:', 'prefix:', 'suffix:')) and
                        len(translation) > 0):
                        definition_parts.append(translation)
                # Second priority: dictionary definition (if it's English)
                if dict_info.get('definition'):
                    defn = str(dict_info['definition']).strip()
                    # Only add if it's not morphological info and different from translation
                    if (defn and 
                        defn not in definition_parts and 
                        not defn.startswith(('plural:', 'feminine:', 'masculine:', 'root:', 'prefix:', 'suffix:')) and
                        defn.lower() != lemma.lower()):
                        definition_parts.append(defn)
                
                # Use English translation as definition (for Italian words, show English)
                # If no translation found, leave empty - don't show morphological info
                definition = definition_parts[0] if definition_parts else ''
                
                # Build morphology with ONLY proper grammar info (no morphological breakdown)
                morphology = {}
                
                # Exclude morphological breakdown fields
                exclude_fields = {'root', 'prefixes', 'suffixes', 'derivations', 'inflections'}
                
                # Use spaCy morphological features if available (filter out breakdown)
                if spacy_morph:
                    for k, v in spacy_morph.items():
                        if k not in exclude_fields:
                            morphology[k] = v
                
                # Add dictionary grammar info as supplementary (proper grammar only)
                if isinstance(dict_info.get('grammar'), dict):
                    for k, v in dict_info['grammar'].items():
                        if k not in exclude_fields and k not in morphology:
                            morphology[k] = v
                
                # Don't add word analysis morphology (it contains root/prefixes/suffixes breakdown)
                # Only add proper grammar fields if they exist
                if canonical_data.get('grammar') and isinstance(canonical_data['grammar'], dict):
                    for k, v in canonical_data['grammar'].items():
                        if k not in exclude_fields and k not in morphology and k in ('type', 'gender', 'number', 'conjugation', 'form', 'tense', 'definite'):
                            morphology[k] = v
                
                # Add all word forms to morphology for grouped words
                if len(word_list) > 1:
                    morphology['forms'] = [w[0] for w in word_list]
                    morphology['form_count'] = len(word_list)
                
                # Get POS from spaCy (most reliable), then fallback to dictionary
                pos = 'NOUN'  # Default fallback
                if spacy_pos and spacy_pos != 'X':
                    # Map spaCy universal POS to our format
                    pos = spacy_pos.upper()[:20]
                elif dict_info.get('part_of_speech'):
                    pos = str(dict_info['part_of_speech']).upper()[:20]
                elif canonical_data.get('grammar', {}).get('part_of_speech'):
                    pos = str(canonical_data['grammar']['part_of_speech']).upper()[:20]
                
                # For proper nouns, use the capitalized form instead of lowercase
                lemma_to_save = lemma
                if is_proper_noun and canonical_word and canonical_word[0].isupper():
                    # Use the capitalized canonical form for proper nouns
                    lemma_to_save = canonical_word.strip()
                    # Also update lemma variable for consistency in lookups
                    lemma = lemma_to_save.lower()  # Keep lowercase for grouping/comparison
                
                # Check if lemma already exists (batch query optimization)
                # Check both lowercase and capitalized forms for proper nouns
                existing = db.query(Lemma).filter(
                    Lemma.lemma == lemma_to_save,
                    Lemma.language == language
                ).first()
                
                # Also check lowercase version if we're saving capitalized
                if not existing and lemma_to_save != lemma:
                    existing = db.query(Lemma).filter(
                        Lemma.lemma == lemma,
                        Lemma.language == language
                    ).first()
                
                if existing:
                    # Update existing lemma - preserve capitalization if it's a proper noun
                    if is_proper_noun and canonical_word and canonical_word[0].isupper():
                        existing.lemma = lemma_to_save  # Update to capitalized form
                    if pos:
                        existing.pos = pos
                    if definition:
                        existing.definition = definition
                    if morphology:
                        existing.morphology = morphology
                    existing.global_frequency = max(existing.global_frequency or 0, total_frequency)
                    lemma_id = existing.id
                else:
                    # Create new lemma (collect for batch insert)
                    lemma_records.append({
                        'lemma': lemma_to_save,  # Use capitalized form for proper nouns
                        'language': language,
                        'pos': pos,
                        'definition': definition,
                        'morphology': morphology,
                        'global_frequency': total_frequency,
                        'difficulty_level': 0.0
                    })
                    lemma_id = None  # Will be set after flush
                
                # Store mapping for token ID resolution
                # word_list contains tuples of (word_form, word_data, spacy_info)
                for word_form, word_data, _ in word_list:
                    token_to_lemma_map[str(word_form)] = lemma_id if existing else lemma
                
                # OPTIMIZED: Collect tokens for batch insert (limit tokens per word)
                # Only create tokens for the most frequent word form to reduce DB writes
                # NOTE: we already selected the canonical form above as (canonical_word, canonical_data, canonical_spacy)
                canonical_word_form = canonical_word
                canonical_word_data = canonical_data
                positions = canonical_word_data.get('positions', [])
                frequency = canonical_word_data.get('frequency', 1)
                
                # Limit tokens per lemma to prevent excessive database writes
                # Only store a sample of positions, not all occurrences
                max_tokens_per_lemma = min(frequency, 20)  # Max 20 tokens per lemma (reduced from 50)
                
                if positions and len(positions) > 0:
                    # Use actual positions, but limit count - sample evenly
                    step = max(1, len(positions) // max_tokens_per_lemma)
                    sampled_positions = positions[::step][:max_tokens_per_lemma]
                    for pos_idx in sampled_positions:
                        token_records.append({
                            'book_id': book_id,
                            'lemma_id': lemma_id,  # None if new, will be resolved after flush
                            'position': pos_idx,
                            'original_token': str(canonical_word_form),
                            'sentence_context': ''  # Skip context extraction for speed
                        })
                else:
                    # Create tokens based on frequency (sample)
                    for i in range(min(max_tokens_per_lemma, 5)):  # Max 5 if no positions
                        token_records.append({
                            'book_id': book_id,
                            'lemma_id': lemma_id,
                            'position': i,
                            'original_token': str(canonical_word_form),
                            'sentence_context': ''
                        })
                
                saved_count += 1
                
                # OPTIMIZED: Batch commit every 100 lemmas for incremental vocabulary availability
                # Reduced commit frequency for better performance with large books (30k+ words)
                # This allows vocabulary to appear while processing, not all at once at the end
                if saved_count % 100 == 0:
                    # First flush any pending lemmas to get IDs
                    if lemma_records:
                        for lr in lemma_records:
                            lemma_record = Lemma(**lr)
                            db.add(lemma_record)
                        db.flush()
                        # Update lemma_id in token records using the mapping
                        for tr in token_records:
                            if tr['lemma_id'] is None:
                                lemma_text = token_to_lemma_map.get(tr['original_token'])
                                if lemma_text:
                                    found_lemma = db.query(Lemma).filter(
                                        Lemma.lemma == lemma_text,
                                        Lemma.language == language
                                    ).first()
                                    if found_lemma:
                                        tr['lemma_id'] = found_lemma.id
                        lemma_records = []
                    
                    # Batch insert tokens
                    if token_records:
                        # Filter out tokens without lemma_id
                        valid_tokens = [tr for tr in token_records if tr['lemma_id'] is not None]
                        for tr in valid_tokens:
                            token = Token(**tr)
                            db.add(token)
                        token_count += len(valid_tokens)
                        token_records = []
                    
                    db.commit()
                    progress_pct = int((saved_count / max(len(lemma_groups), 1)) * 100)
                    print(f"  ✅ Committed batch: {saved_count}/{len(lemma_groups)} lemmas ({progress_pct}%), {token_count} tokens")
                    
                    # Update book progress in database for real-time tracking
                    try:
                        book_update = db.query(Book).filter(Book.id == book_id).first()
                        if book_update:
                            # Update unique_lemmas count as we process
                            book_update.unique_lemmas = saved_count
                            db.commit()
                            print(f"  📊 Progress updated: {saved_count} lemmas processed")
                    except Exception as e:
                        print(f"  Warning: Could not update book progress: {e}")
                    
            except Exception as e:
                print(f"Error processing lemma '{lemma}': {e}")
                import traceback
                traceback.print_exc()
                continue
        
        # Final flush of remaining records
        if lemma_records:
            for lr in lemma_records:
                lemma_record = Lemma(**lr)
                db.add(lemma_record)
            db.flush()
        
        if token_records:
            # Update lemma IDs for remaining tokens using the mapping
            for tr in token_records:
                if tr['lemma_id'] is None:
                    lemma_text = token_to_lemma_map.get(tr['original_token'])
                    if lemma_text:
                        found_lemma = db.query(Lemma).filter(
                            Lemma.lemma == lemma_text,
                            Lemma.language == language
                        ).first()
                        if found_lemma:
                            tr['lemma_id'] = found_lemma.id
            
            valid_tokens = [tr for tr in token_records if tr['lemma_id'] is not None]
            for tr in valid_tokens:
                token = Token(**tr)
                db.add(token)
            token_count += len(valid_tokens)
        
        db.commit()
        print(f"✅ Saved {saved_count} lemmas and {token_count} tokens with optimized batch processing")