#!/usr/bin/env python3
"""
Test script for Wiktextract integration via kaikki.org.
Tests the new KaikkiService and its integration with DictionaryService.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.kaikki_service import KaikkiService
from app.services.dictionary_service import DictionaryService

def test_kaikki_service():
    """Test KaikkiService directly."""
    print("=" * 60)
    print("Testing KaikkiService (Wiktextract via kaikki.org)")
    print("=" * 60)
    
    kaikki = KaikkiService()
    
    test_words = [
        ('casa', 'it', 'en'),  # Italian: house
        ('libro', 'it', 'en'),  # Italian: book
        ('mangiare', 'it', 'en'),  # Italian: to eat
        ('casa', 'es', 'en'),  # Spanish: house
        ('book', 'en', 'it'),  # English: book
    ]
    
    for word, lang, target in test_words:
        print(f"\nTesting: '{word}' ({lang} -> {target})")
        result = kaikki.get_word(word, lang, target)
        if result:
            print(f"  ✓ Found!")
            print(f"  Translation: {result.get('translation', 'N/A')}")
            print(f"  Definition: {result.get('definition', 'N/A')[:100]}...")
            print(f"  POS: {result.get('part_of_speech', 'N/A')}")
            print(f"  Examples: {len(result.get('examples', []))} found")
            print(f"  Source: {result.get('source', 'N/A')}")
        else:
            print(f"  ✗ Not found")
    
    print("\n" + "=" * 60)

def test_dictionary_service():
    """Test DictionaryService with Wiktextract integration."""
    print("\n" + "=" * 60)
    print("Testing DictionaryService (with Wiktextract integration)")
    print("=" * 60)
    
    dict_service = DictionaryService()
    
    test_words = [
        ('casa', 'it', 'en'),
        ('libro', 'it', 'en'),
        ('mangiare', 'it', 'en'),
        ('bello', 'it', 'en'),
        ('casa', 'es', 'en'),
        ('maison', 'fr', 'en'),
    ]
    
    for word, lang, target in test_words:
        print(f"\nTesting: '{word}' ({lang} -> {target})")
        result = dict_service.get_word_info(word, lang, target)
        print(f"  Translation: {result.get('translation', 'N/A')}")
        print(f"  Definition: {result.get('definition', 'N/A')[:100]}...")
        print(f"  POS: {result.get('part_of_speech', 'N/A')}")
        print(f"  Source: {result.get('source', 'N/A')}")
        print(f"  Examples: {len(result.get('examples', []))} found")
        if result.get('examples'):
            print(f"    Example: {result['examples'][0][:80]}...")
    
    print("\n" + "=" * 60)

def test_comparison():
    """Compare old vs new translation quality."""
    print("\n" + "=" * 60)
    print("Quality Comparison: Wiktextract vs Fallback APIs")
    print("=" * 60)
    
    dict_service = DictionaryService()
    
    # Test words that should have rich definitions
    test_words = [
        ('casa', 'it', 'en'),
        ('mangiare', 'it', 'en'),
    ]
    
    for word, lang, target in test_words:
        print(f"\nWord: '{word}' ({lang} -> {target})")
        result = dict_service.get_word_info(word, lang, target)
        
        print(f"  Source: {result.get('source', 'unknown')}")
        print(f"  Translation: {result.get('translation', 'N/A')}")
        print(f"  Definition: {result.get('definition', 'N/A')}")
        print(f"  Has Examples: {len(result.get('examples', [])) > 0}")
        print(f"  Has Etymology: {bool(result.get('etymology'))}")
        print(f"  Has Pronunciations: {len(result.get('pronunciations', [])) > 0}")
    
    print("\n" + "=" * 60)

if __name__ == '__main__':
    print("\n🧪 Testing Wiktextract Integration\n")
    
    try:
        # Test 1: KaikkiService directly
        test_kaikki_service()
        
        # Test 2: DictionaryService integration
        test_dictionary_service()
        
        # Test 3: Quality comparison
        test_comparison()
        
        print("\n✅ All tests completed!")
        print("\nNote: Some words may not be found in Wiktionary.")
        print("This is normal - the service will fall back to other APIs.")
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

