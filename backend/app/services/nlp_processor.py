import re
from typing import Dict, List
from collections import Counter
from sqlalchemy.orm import Session
import sys
sys.path.append('..')
from ..models.lemma import Lemma
from ..models.phrase import Phrase
from .book_processor import BookMetadataExtractor

class VocabularyProcessor:
    """Professional vocabulary processor using advanced NLP libraries."""
    
    def __init__(self):
        # Initialize the professional NLP book processor
        self.book_processor = BookMetadataExtractor()
        
        # Common stop words (will be enhanced by NLP libraries)
        self.stop_words = {
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
            'for', 'not', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but',
            'his', 'by', 'from', 'they', 'she', 'or', 'an', 'will', 'my', 'one',
            'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
            'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can',
            'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into',
            'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
            'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
            'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well',
            'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
            'most', 'us', 'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said',
            'did', 'having', 'may', 'should'
        }
        
        # Professional NLP libraries
        self.nlp_tools = self.book_processor.nlp_tools
    
    def extract_vocabulary(self, text: str, language: str = "en") -> Dict:
        """
        Extract vocabulary using professional NLP analysis.
        Uses TextBlob, NLTK, and langdetect - no hardcoded patterns.
        """
        # Use the professional NLP analysis from book processor
        nlp_analysis = self.book_processor.analyze_text_nlp(text, language)
        
        # Get enhanced stop words from NLP libraries
        enhanced_stop_words = self._get_enhanced_stop_words(language)
        all_stop_words = self.stop_words.union(enhanced_stop_words)
        
        # Extract meaningful vocabulary using professional NLP
        word_frequencies = nlp_analysis['lemmas']
        
        # Filter out stop words and non-meaningful words
        filtered_vocabulary = {}
        for word, frequency in word_frequencies.items():
            word_clean = word.lower().strip()
            if (len(word_clean) > 2 and 
                word_clean not in all_stop_words and 
                word_clean.isalpha() and
                not word_clean.isdigit()):
                filtered_vocabulary[word_clean] = frequency
        
        # Sort by frequency
        sorted_words = sorted(filtered_vocabulary.items(), key=lambda x: x[1], reverse=True)
        
        # Get POS distribution for analysis
        pos_distribution = nlp_analysis.get('pos_tags', {})
        
        return {
            "total_words": nlp_analysis['word_count'],
            "unique_lemmas": len(sorted_words),
            "lemma_frequencies": sorted_words,
            "pos_tags": pos_distribution,
            "language": language,
            "complexity_score": nlp_analysis['complexity_score'],
            "avg_word_length": nlp_analysis['avg_word_length'],
            "sentence_count": nlp_analysis['sentence_count']
        }
    
    def _get_enhanced_stop_words(self, language: str) -> set:
        """Get professional stop words using NLTK."""
        enhanced_stop_words = set()
        
        if 'nltk' in self.nlp_tools:
            try:
                import nltk
                
                # Try to download and use NLTK stop words for the detected language
                try:
                    nltk.data.find('corpora/stopwords')
                except LookupError:
                    print("Downloading NLTK stop words...")
                    nltk.download('stopwords', quiet=True)
                
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
    
    def detect_phrases(self, text: str) -> List[Dict]:
        """
        Detect phrases using professional NLP analysis.
        Uses statistical and linguistic methods.
        """
        phrases = []
        
        # Use professional NLP for phrase detection
        if 'textblob' in self.nlp_tools:
            try:
                from textblob import TextBlob
                blob = TextBlob(text)
                
                # Extract noun phrases and other linguistic constructs
                noun_phrases = blob.noun_phrases
                
                # Convert to our format
                for i, phrase in enumerate(noun_phrases[:50]):  # Limit to top 50
                    phrases.append({
                        "text": str(phrase),
                        "start": text.lower().find(str(phrase).lower()),
                        "end": text.lower().find(str(phrase).lower()) + len(str(phrase)),
                        "label": "noun_phrase",
                        "confidence": 0.8
                    })
            except Exception as e:
                print(f"TextBlob phrase detection failed: {e}")
        
        # Fallback: Statistical n-gram analysis
        if not phrases:
            phrases = self._statistical_phrase_detection(text)
        
        # Remove duplicates and sort by confidence
        unique_phrases = {}
        for phrase in phrases:
            key = phrase["text"].lower()
            if key not in unique_phrases or phrase["confidence"] > unique_phrases[key]["confidence"]:
                unique_phrases[key] = phrase
        
        return sorted(unique_phrases.values(), key=lambda x: x["confidence"], reverse=True)[:50]
    
    def _statistical_phrase_detection(self, text: str) -> List[Dict]:
        """Statistical phrase detection using n-grams and frequency analysis."""
        # Clean text and extract words
        words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        phrases = []
        
        # Generate n-grams (2-4 words)
        for n in range(2, 5):
            n_gram_counts = Counter()
            
            for i in range(len(words) - n + 1):
                n_gram = ' '.join(words[i:i+n])
                n_gram_counts[n_gram] += 1
            
            # Filter phrases that appear more than once
            frequent_phrases = {phrase: count for phrase, count in n_gram_counts.items() if count > 1}
            
            for phrase, frequency in frequent_phrases.items():
                # Calculate confidence based on frequency and phrase length
                confidence = min(frequency * 0.2, 0.9)  # Cap at 0.9
                
                # Skip if it's a common word combination that might be a stop phrase
                if not self._is_likely_meaningful_phrase(phrase):
                    continue
                
                phrases.append({
                    "text": phrase,
                    "start": text.lower().find(phrase),
                    "end": text.lower().find(phrase) + len(phrase),
                    "label": f"{n}_gram",
                    "confidence": confidence
                })
        
        return phrases
    
    def _is_likely_meaningful_phrase(self, phrase: str) -> bool:
        """Determine if a phrase is likely meaningful (not just filler)."""
        phrase_words = phrase.split()
        
        # Skip phrases that contain only common stop words
        phrase_word_set = set(phrase_words)
        stop_word_count = len(phrase_word_set.intersection(self.stop_words))
        
        if stop_word_count == len(phrase_words):
            return False  # All words are stop words
        
        if stop_word_count == len(phrase_words) - 1 and len(phrase_words) > 2:
            return False  # Only one content word in a longer phrase
        
        # Skip very common but likely meaningless bigrams
        meaningless_bigrams = {
            'of the', 'in the', 'to the', 'and the', 'that the', 'it was', 'he was',
            'she was', 'they were', 'we have', 'you have', 'there is', 'there are'
        }
        
        if phrase in meaningless_bigrams:
            return False
        
        return True
    
    def analyze_grammar_patterns(self, text: str) -> List[Dict]:
        """
        Analyze grammar patterns using professional NLP.
        Uses TextBlob and NLTK for linguistic analysis.
        """
        patterns = []
        
        if 'textblob' in self.nlp_tools:
            try:
                from textblob import TextBlob
                blob = TextBlob(text)
                
                # Analyze sentence structures
                sentences = blob.sentences
                
                for sentence in sentences:
                    sentence_text = str(sentence)
                    
                    # Analyze sentence types
                    if sentence_text.strip().endswith('?'):
                        patterns.append({
                            "pattern": "question_structure",
                            "description": "Interrogative sentence structure",
                            "frequency": 1,
                            "example": sentence_text[:100]
                        })
                    
                    # Analyze verb patterns using POS tags
                    sentence_tags = sentence.tags
                    
                    # Look for past tense verbs
                    past_tense_words = [word for word, tag in sentence_tags if tag.startswith('VBD')]
                    if past_tense_words:
                        patterns.append({
                            "pattern": "past_tense_usage",
                            "description": "Use of past tense verbs",
                            "frequency": len(past_tense_words),
                            "example": sentence_text[:100]
                        })
                    
                    # Look for passive voice indicators
                    passive_indicators = ['was', 'were', 'been', 'being', 'is', 'are']
                    if any(word in sentence_text.lower() for word in passive_indicators):
                        # Simple heuristic for passive voice
                        if 'by ' in sentence_text.lower():
                            patterns.append({
                                "pattern": "passive_voice",
                                "description": "Use of passive voice constructions",
                                "frequency": 1,
                                "example": sentence_text[:100]
                            })
                
                # Aggregate patterns by type
                pattern_counts = {}
                for pattern in patterns:
                    pattern_type = pattern["pattern"]
                    if pattern_type not in pattern_counts:
                        pattern_counts[pattern_type] = {
                            "pattern": pattern_type,
                            "description": pattern["description"],
                            "frequency": 0,
                            "examples": []
                        }
                    pattern_counts[pattern_type]["frequency"] += pattern["frequency"]
                    if len(pattern_counts[pattern_type]["examples"]) < 3:
                        pattern_counts[pattern_type]["examples"].append(pattern["example"])
                
                return list(pattern_counts.values())
                
            except Exception as e:
                print(f"TextBlob grammar analysis failed: {e}")
        
        # Fallback: Basic pattern detection
        return self._basic_grammar_analysis(text)
    
    def _basic_grammar_analysis(self, text: str) -> List[Dict]:
        """Basic grammar pattern analysis fallback."""
        sentences = re.split(r'[.!?]+', text)
        patterns = []
        
        # Simple pattern detection
        sentence_length_patterns = {}
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            words = len(sentence.split())
            sentence_length_patterns[words] = sentence_length_patterns.get(words, 0) + 1
        
        # Find most common sentence lengths
        if sentence_length_patterns:
            common_lengths = sorted(sentence_length_patterns.items(), key=lambda x: x[1], reverse=True)[:3]
            
            for length, count in common_lengths:
                patterns.append({
                    "pattern": f"sentence_length_{length}_words",
                    "description": f"Common sentence structure with {length} words",
                    "frequency": count,
                    "example": f"Sentences with approximately {length} words"
                })
        
        return patterns
    
    def save_to_database(self, analysis: Dict, phrases: List[Dict], 
                        grammar_patterns: List[Dict], book_id: int, db: Session):
        """
        Save analysis results to database using professional NLP results.
        """
        # Save lemmas with professional NLP analysis
        lemma_frequencies = analysis.get("lemma_frequencies", [])
        pos_tags = analysis.get("pos_tags", {})
        
        for lemma, frequency in lemma_frequencies[:100]:  # Limit to top 100
            # Check if lemma already exists
            existing = db.query(Lemma).filter(Lemma.lemma == lemma).first()
            
            if existing:
                # Update frequency for this book
                existing.global_frequency = frequency
            else:
                # Create new lemma record with NLP analysis
                lemma_record = Lemma(
                    lemma=lemma,
                    language=analysis["language"],
                    pos=pos_tags.get(lemma, "NOUN"),  # Use POS from NLP analysis
                    global_frequency=frequency,  # Use global_frequency (not frequency_in_book)
                    difficulty_level=analysis.get("complexity_score", 0.5)  # Use difficulty_level
                )
                db.add(lemma_record)
                db.commit()
        
        # Save phrases with professional detection
        for phrase_info in phrases[:50]:  # Limit to top 50 phrases
            phrase_text = phrase_info["text"]
            
            # Check if phrase exists
            existing = db.query(Phrase).filter(Phrase.phrase == phrase_text).first()
            
            if not existing:
                phrase_record = Phrase(
                    phrase=phrase_text,
                    language=analysis["language"],
                    confidence=phrase_info["confidence"],
                    phrase_type=phrase_info["label"]  # Use phrase_type instead of label
                )
                db.add(phrase_record)
                db.commit()
