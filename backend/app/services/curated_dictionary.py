"""
Curated high-frequency word dictionary for free tier deployment.
Contains common words with rich definitions, optimized for memory usage.
This provides instant lookups without API calls for the most common words.
"""
from typing import Dict, Optional

# High-frequency words dictionary (optimized for free tier)
# Contains most common words with rich definitions
CURATED_DICTIONARY = {
    # Italian - English (most common words)
    'it': {
        'casa': {
            'translation': 'house',
            'definition': 'house, home; building where people live',
            'pos': 'NOUN',
            'examples': ['La casa è grande', 'Vado a casa'],
            'grammar': {'type': 'noun', 'gender': 'feminine', 'number': 'singular'}
        },
        'libro': {
            'translation': 'book',
            'definition': 'book; printed work consisting of pages bound together',
            'pos': 'NOUN',
            'examples': ['Leggo un libro', 'Il libro è interessante'],
            'grammar': {'type': 'noun', 'gender': 'masculine', 'number': 'singular'}
        },
        'mangiare': {
            'translation': 'to eat',
            'definition': 'to eat; to consume food',
            'pos': 'VERB',
            'examples': ['Voglio mangiare', 'Mangiamo insieme'],
            'grammar': {'type': 'verb', 'conjugation': '1st (-are)', 'form': 'infinitive'}
        },
        'bello': {
            'translation': 'beautiful, nice, handsome',
            'definition': 'beautiful, nice, handsome; pleasing to the eye or mind',
            'pos': 'ADJ',
            'examples': ['Un bel giorno', 'Sei molto bello'],
            'grammar': {'type': 'adjective', 'gender': 'masculine', 'number': 'singular'}
        },
        'buono': {
            'translation': 'good',
            'definition': 'good; of positive quality, beneficial',
            'pos': 'ADJ',
            'examples': ['Buon cibo', 'È una buona idea'],
            'grammar': {'type': 'adjective', 'gender': 'masculine', 'number': 'singular'}
        },
        'andare': {
            'translation': 'to go',
            'definition': 'to go; to move from one place to another',
            'pos': 'VERB',
            'examples': ['Vado al cinema', 'Andiamo insieme'],
            'grammar': {'type': 'verb', 'conjugation': '1st (-are)', 'form': 'infinitive'}
        },
        'venire': {
            'translation': 'to come',
            'definition': 'to come; to move towards the speaker',
            'pos': 'VERB',
            'examples': ['Vieni qui', 'Vengono domani'],
            'grammar': {'type': 'verb', 'conjugation': '3rd (-ire)', 'form': 'infinitive'}
        },
        'fare': {
            'translation': 'to do, to make',
            'definition': 'to do, to make; to perform an action or create something',
            'pos': 'VERB',
            'examples': ['Faccio i compiti', 'Facciamo una festa'],
            'grammar': {'type': 'verb', 'conjugation': '1st (-are)', 'form': 'infinitive'}
        },
        'dire': {
            'translation': 'to say, to tell',
            'definition': 'to say, to tell; to express in words',
            'pos': 'VERB',
            'examples': ['Dico la verità', 'Mi dice sempre'],
            'grammar': {'type': 'verb', 'conjugation': '3rd (-ire)', 'form': 'infinitive'}
        },
        'essere': {
            'translation': 'to be',
            'definition': 'to be; to exist, to have a quality or identity',
            'pos': 'VERB',
            'examples': ['Sono italiano', 'Siamo felici'],
            'grammar': {'type': 'verb', 'form': 'infinitive'}
        },
        'avere': {
            'translation': 'to have',
            'definition': 'to have; to possess, to own',
            'pos': 'VERB',
            'examples': ['Ho un gatto', 'Hanno fame'],
            'grammar': {'type': 'verb', 'form': 'infinitive'}
        },
        'grande': {
            'translation': 'big, large, great',
            'definition': 'big, large, great; of considerable size or importance',
            'pos': 'ADJ',
            'examples': ['Una grande città', 'Grande amico'],
            'grammar': {'type': 'adjective', 'gender': 'masculine', 'number': 'singular'}
        },
        'piccolo': {
            'translation': 'small, little',
            'definition': 'small, little; of reduced size',
            'pos': 'ADJ',
            'examples': ['Un piccolo gatto', 'Piccola casa'],
            'grammar': {'type': 'adjective', 'gender': 'masculine', 'number': 'singular'}
        },
        'nuovo': {
            'translation': 'new',
            'definition': 'new; recently created or discovered',
            'pos': 'ADJ',
            'examples': ['Una nuova macchina', 'Nuovo lavoro'],
            'grammar': {'type': 'adjective', 'gender': 'masculine', 'number': 'singular'}
        },
        'vecchio': {
            'translation': 'old',
            'definition': 'old; having existed for a long time',
            'pos': 'ADJ',
            'examples': ['Un vecchio amico', 'Casa vecchia'],
            'grammar': {'type': 'adjective', 'gender': 'masculine', 'number': 'singular'}
        },
        'vedere': {
            'translation': 'to see',
            'definition': 'to see; to perceive with the eyes',
            'pos': 'VERB',
            'examples': ['Vedo un uccello', 'Non vedo niente'],
            'grammar': {'type': 'verb', 'conjugation': '2nd (-ere)', 'form': 'infinitive'}
        },
        'sentire': {
            'translation': 'to hear, to feel',
            'definition': 'to hear, to feel; to perceive with ears or sense',
            'pos': 'VERB',
            'examples': ['Sento la musica', 'Sento freddo'],
            'grammar': {'type': 'verb', 'conjugation': '3rd (-ire)', 'form': 'infinitive'}
        },
        'pensare': {
            'translation': 'to think',
            'definition': 'to think; to use the mind to consider',
            'pos': 'VERB',
            'examples': ['Penso a te', 'Pensiamo insieme'],
            'grammar': {'type': 'verb', 'conjugation': '1st (-are)', 'form': 'infinitive'}
        },
        'volere': {
            'translation': 'to want',
            'definition': 'to want; to desire, to wish for',
            'pos': 'VERB',
            'examples': ['Voglio mangiare', 'Vuoi venire?'],
            'grammar': {'type': 'verb', 'form': 'infinitive'}
        },
        'dovere': {
            'translation': 'must, to have to',
            'definition': 'must, to have to; to be obliged or required',
            'pos': 'VERB',
            'examples': ['Devo andare', 'Dobbiamo studiare'],
            'grammar': {'type': 'verb', 'form': 'infinitive'}
        },
        'potere': {
            'translation': 'can, to be able to',
            'definition': 'can, to be able to; to have the ability or permission',
            'pos': 'VERB',
            'examples': ['Posso aiutare', 'Puoi venire?'],
            'grammar': {'type': 'verb', 'form': 'infinitive'}
        },
    },
    
    # Spanish - English (most common words)
    'es': {
        'casa': {
            'translation': 'house, home',
            'definition': 'house, home; building where people live',
            'pos': 'NOUN',
            'examples': ['Voy a casa', 'Mi casa es grande'],
            'grammar': {'type': 'noun', 'gender': 'feminine', 'number': 'singular'}
        },
        'libro': {
            'translation': 'book',
            'definition': 'book; printed work',
            'pos': 'NOUN',
            'examples': ['Leo un libro', 'El libro es bueno'],
            'grammar': {'type': 'noun', 'gender': 'masculine', 'number': 'singular'}
        },
        'comer': {
            'translation': 'to eat',
            'definition': 'to eat; to consume food',
            'pos': 'VERB',
            'examples': ['Quiero comer', 'Comemos juntos'],
            'grammar': {'type': 'verb', 'conjugation': '2nd (-er)', 'form': 'infinitive'}
        },
    },
    
    # French - English (most common words)
    'fr': {
        'maison': {
            'translation': 'house, home',
            'definition': 'house, home; building where people live',
            'pos': 'NOUN',
            'examples': ['Je vais à la maison', 'Ma maison est grande'],
            'grammar': {'type': 'noun', 'gender': 'feminine', 'number': 'singular'}
        },
        'livre': {
            'translation': 'book',
            'definition': 'book; printed work',
            'pos': 'NOUN',
            'examples': ['Je lis un livre', 'Le livre est intéressant'],
            'grammar': {'type': 'noun', 'gender': 'masculine', 'number': 'singular'}
        },
        'manger': {
            'translation': 'to eat',
            'definition': 'to eat; to consume food',
            'pos': 'VERB',
            'examples': ['Je veux manger', 'Nous mangeons ensemble'],
            'grammar': {'type': 'verb', 'conjugation': '1st (-er)', 'form': 'infinitive'}
        },
    },
}


class CuratedDictionary:
    """Lightweight curated dictionary for free tier deployment."""
    
    def __init__(self):
        self.dict = CURATED_DICTIONARY
    
    def get_word(self, word: str, language: str, target_language: str = "en") -> Optional[Dict]:
        """
        Get word from curated dictionary.
        
        Args:
            word: The word to look up (lowercase)
            language: Source language code
            target_language: Target language (currently only supports 'en')
        
        Returns:
            Dictionary with word data or None if not found
        """
        if target_language != "en":
            return None  # Currently only supports English translations
        
        word_lower = word.lower().strip()
        lang_dict = self.dict.get(language.lower())
        
        if not lang_dict:
            return None
        
        word_data = lang_dict.get(word_lower)
        if not word_data:
            return None
        
        # Return in standard format
        return {
            'word': word,
            'translation': word_data.get('translation', ''),
            'definition': word_data.get('definition', ''),
            'part_of_speech': word_data.get('pos', ''),
            'grammar': word_data.get('grammar', {}),
            'examples': word_data.get('examples', []),
            'source': 'curated'
        }
    
    def has_word(self, word: str, language: str) -> bool:
        """Check if word exists in curated dictionary."""
        word_lower = word.lower().strip()
        lang_dict = self.dict.get(language.lower())
        return lang_dict is not None and word_lower in lang_dict

