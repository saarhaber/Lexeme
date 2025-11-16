"""
Enhanced NLP processor using spaCy for better accuracy and multi-language support.
"""
import re
from typing import Dict, List, Optional, Tuple
from collections import Counter
import sys
sys.path.append('..')

class SpacyProcessor:
    """
    Advanced NLP processor using spaCy.
    Falls back to TextBlob/NLTK if spaCy models not available.
    """
    
    def __init__(self, language: str = "en"):
        self.language = language
        self.nlp = None
        self.fallback_processor = None
        
        # Try to load spaCy
        self._initialize_spacy()
        
        # Initialize fallback
        if not self.nlp:
            self._initialize_fallback()
    
    def _initialize_spacy(self):
        """Initialize spaCy model for the language."""
        try:
            import spacy
            
            # Map language codes to spaCy models
            spacy_models = {
                'en': 'en_core_web_sm',
                'it': 'it_core_news_sm',
                'es': 'es_core_news_sm',
                'fr': 'fr_core_news_sm',
                'de': 'de_core_news_sm',
                'pt': 'pt_core_news_sm',
                'ru': 'ru_core_news_sm',
                'nl': 'nl_core_news_sm',
                'el': 'el_core_news_sm',
                'zh': 'zh_core_web_sm',
                'ja': 'ja_core_news_sm',
            }
            
            model_name = spacy_models.get(self.language, 'en_core_web_sm')
            
            try:
                self.nlp = spacy.load(model_name)
                print(f"✅ Loaded spaCy model: {model_name}")
            except OSError:
                print(f"⚠️  spaCy model {model_name} not found. Install with: python -m spacy download {model_name}")
                print("   Falling back to TextBlob/NLTK")
                self.nlp = None
                
        except ImportError:
            print("⚠️  spaCy not installed. Install with: pip install spacy")
            print("   Falling back to TextBlob/NLTK")
            self.nlp = None
    
    def _initialize_fallback(self):
        """Initialize fallback NLP processors."""
        try:
            from ..services.nlp_processor import VocabularyProcessor
            self.fallback_processor = VocabularyProcessor()
            print("✅ Using TextBlob/NLTK fallback processor")
        except Exception as e:
            print(f"⚠️  Could not initialize fallback processor: {e}")
    
    def process_text(self, text: str) -> Dict:
        """
        Process text with spaCy or fallback.
        Returns comprehensive NLP analysis.
        """
        if self.nlp:
            return self._process_with_spacy(text)
        elif self.fallback_processor:
            return self.fallback_processor.extract_vocabulary(text, self.language)
        else:
            return self._basic_processing(text)
    
    def _process_with_spacy(self, text: str) -> Dict:
        """Process text using spaCy."""
        doc = self.nlp(text)
        
        # Extract tokens and lemmas
        tokens = []
        lemmas = []
        pos_tags = Counter()
        
        for token in doc:
            if not token.is_punct and not token.is_space:
                tokens.append(token.text)
                lemmas.append(token.lemma_.lower())
                pos_tags[token.pos_] += 1
        
        # Extract named entities
        entities = []
        for ent in doc.ents:
            entities.append({
                'text': ent.text,
                'label': ent.label_,
                'start': ent.start_char,
                'end': ent.end_char
            })
        
        # Extract noun phrases
        noun_phrases = [chunk.text for chunk in doc.noun_chunks]
        
        # Calculate statistics
        lemma_counts = Counter(lemmas)
        sentences = list(doc.sents)
        
        # Calculate complexity
        avg_sentence_length = len(tokens) / len(sentences) if sentences else 0
        avg_word_length = sum(len(token) for token in tokens) / len(tokens) if tokens else 0
        
        complexity_score = (
            avg_sentence_length / 20.0 +
            avg_word_length / 8.0 +
            len(entities) / len(tokens) * 10 if tokens else 0
        ) / 3.0
        
        return {
            'word_count': len(tokens),
            'sentence_count': len(sentences),
            'unique_lemmas': len(lemma_counts),
            'lemma_frequencies': dict(lemma_counts.most_common(200)),
            'pos_tags': dict(pos_tags),
            'named_entities': entities[:50],  # Limit to 50
            'noun_phrases': noun_phrases[:50],
            'avg_word_length': avg_word_length,
            'avg_sentence_length': avg_sentence_length,
            'complexity_score': min(complexity_score, 1.0),
            'language': self.language,
            'processor': 'spacy'
        }
    
    def _basic_processing(self, text: str) -> Dict:
        """Basic text processing fallback."""
        words = re.findall(r'\b\w+\b', text.lower())
        word_counts = Counter(words)
        sentences = re.split(r'[.!?]+', text)
        
        return {
            'word_count': len(words),
            'sentence_count': len([s for s in sentences if s.strip()]),
            'unique_lemmas': len(word_counts),
            'lemma_frequencies': dict(word_counts.most_common(200)),
            'pos_tags': {},
            'named_entities': [],
            'noun_phrases': [],
            'avg_word_length': sum(len(w) for w in words) / len(words) if words else 0,
            'avg_sentence_length': len(words) / len(sentences) if sentences else 0,
            'complexity_score': 0.5,
            'language': self.language,
            'processor': 'basic'
        }
    
    def extract_mwe(self, text: str) -> List[Dict]:
        """
        Extract Multi-Word Expressions (MWEs) using spaCy.
        Includes idioms, phrasal verbs, collocations.
        """
        if not self.nlp:
            return []
        
        doc = self.nlp(text)
        mwe_list = []
        
        # Extract noun phrases (potential MWEs)
        for chunk in doc.noun_chunks:
            if len(chunk) >= 2:  # At least 2 words
                mwe_list.append({
                    'text': chunk.text,
                    'type': 'noun_phrase',
                    'start': chunk.start_char,
                    'end': chunk.end_char,
                    'confidence': 0.7
                })
        
        # Extract verb + preposition patterns (phrasal verbs)
        for token in doc:
            if token.pos_ == 'VERB' and token.head.pos_ == 'ADP':
                mwe_list.append({
                    'text': f"{token.text} {token.head.text}",
                    'type': 'phrasal_verb',
                    'start': token.idx,
                    'end': token.head.idx + len(token.head.text),
                    'confidence': 0.6
                })
        
        # Remove duplicates
        seen = set()
        unique_mwe = []
        for mwe in mwe_list:
            key = mwe['text'].lower()
            if key not in seen:
                seen.add(key)
                unique_mwe.append(mwe)
        
        return unique_mwe[:50]  # Limit to 50
    
    def get_word_context(self, text: str, word: str, context_window: int = 50) -> List[str]:
        """
        Get context sentences containing a word.
        Uses spaCy for better sentence segmentation.
        """
        if self.nlp:
            doc = self.nlp(text)
            contexts = []
            word_lower = word.lower()
            
            for sent in doc.sents:
                sent_text = sent.text.lower()
                if word_lower in sent_text:
                    contexts.append(sent.text.strip())
                    if len(contexts) >= 5:  # Limit to 5 contexts
                        break
            
            return contexts
        else:
            # Fallback: simple sentence splitting
            sentences = re.split(r'[.!?]+', text)
            contexts = []
            word_lower = word.lower()
            
            for sent in sentences:
                if word_lower in sent.lower():
                    contexts.append(sent.strip())
                    if len(contexts) >= 5:
                        break
            
            return contexts

