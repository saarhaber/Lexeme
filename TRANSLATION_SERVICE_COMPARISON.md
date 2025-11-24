# Translation Service Comparison for Bookabulary

## Quick Decision Matrix

| Feature | Current (MyMemory/etc) | Wiktextract (Kaikki.org) | Wiktextract (Local) | Google Translate API | DeepL API |
|---------|----------------------|-------------------------|-------------------|---------------------|-----------|
| **Cost** | Free | Free | Free | Paid | Paid |
| **Quality** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Coverage** | Limited | Excellent | Excellent | Excellent | Excellent |
| **Rate Limits** | Yes | No (API) / N/A (Local) | No | Yes | Yes |
| **Offline** | No | No (API) / Yes (Local) | Yes | No | No |
| **Setup Complexity** | Low | Medium | High | Low | Low |
| **Rich Data** | No | Yes | Yes | No | No |
| **Multilingual** | Yes | Yes | Yes | Yes | Yes |
| **Definitions** | No | Yes | Yes | No | No |
| **Examples** | No | Yes | Yes | No | No |
| **Etymology** | No | Yes | Yes | No | No |
| **Pronunciation** | No | Yes | Yes | No | No |

## Detailed Comparison

### 1. Current Services (MyMemory, WordReference, etc.)

**Pros:**
- ✅ Already integrated
- ✅ Simple API calls
- ✅ No setup required

**Cons:**
- ❌ Rate limits
- ❌ Inconsistent quality
- ❌ Limited coverage
- ❌ No rich data (just translations)
- ❌ Fragile (HTML scraping)

**Best For:** Quick translations, fallback option

---

### 2. Wiktextract via Kaikki.org API (RECOMMENDED)

**Pros:**
- ✅ High-quality Wiktionary data
- ✅ Rich structured data (definitions, examples, etymology, pronunciations)
- ✅ No rate limits (when used responsibly)
- ✅ Free and open source
- ✅ Easy integration (HTTP API)
- ✅ Regularly updated
- ✅ 100+ languages supported
- ✅ No API keys needed

**Cons:**
- ⚠️ Requires internet connection
- ⚠️ External dependency (but reliable)
- ⚠️ Slightly slower than local (HTTP request)

**Best For:** Production use, quick implementation

**Implementation:** 
- Query: `https://kaikki.org/dictionary/{language}/{word}.json`
- Returns: Full wiktextract JSON structure
- Caching: Recommended for performance

---

### 3. Wiktextract Local Processing

**Pros:**
- ✅ Fully offline
- ✅ Fast lookups (local database/JSON)
- ✅ Complete control
- ✅ No external dependencies
- ✅ Same rich data as API

**Cons:**
- ❌ Large storage requirements (GB per language)
- ❌ Complex initial setup
- ❌ Requires downloading/processing dumps
- ❌ Manual updates needed

**Best For:** Offline mode, high-volume lookups, full control

**Implementation:**
- Download Wiktionary dumps
- Process with wiktextract
- Store in SQLite/JSON files
- Index for fast lookups

---

### 4. Google Translate API

**Pros:**
- ✅ High quality translations
- ✅ Fast
- ✅ Good coverage
- ✅ Easy integration

**Cons:**
- ❌ Paid service (costs per character)
- ❌ Rate limits
- ❌ No definitions/examples
- ❌ Requires API key
- ❌ Privacy concerns

**Best For:** Commercial apps with budget

---

### 5. DeepL API

**Pros:**
- ✅ Excellent translation quality
- ✅ Good for European languages
- ✅ Fast

**Cons:**
- ❌ Paid service (more expensive than Google)
- ❌ Rate limits
- ❌ No definitions/examples
- ❌ Requires API key
- ❌ Limited language pairs

**Best For:** Premium apps, European languages focus

---

## Recommendation: Wiktextract (Kaikki.org API)

### Why Wiktextract is Best for Bookabulary:

1. **Perfect Fit for Vocabulary Learning**
   - Provides definitions, not just translations
   - Includes examples in context
   - Shows etymology (helps memory)
   - Pronunciation guides
   - Grammar information

2. **Cost-Effective**
   - Completely free
   - No API keys
   - No usage limits (when used responsibly)

3. **High Quality**
   - Community-maintained Wiktionary
   - Structured, reliable data
   - Better than machine translation for definitions

4. **Rich Data**
   - More than just translations
   - Helps users understand words deeply
   - Supports spaced repetition learning

5. **Easy Integration**
   - Simple HTTP API
   - JSON format
   - Can be added alongside current services

### Implementation Strategy:

**Phase 1: Add as Primary Source**
- Integrate kaikki.org API
- Use as primary lookup
- Keep current services as fallback

**Phase 2: Enhance with Local Cache**
- Download common words locally
- Fast lookups for frequent words
- API for rare words

**Phase 3: Full Local (Optional)**
- Download full language dumps
- Process and store locally
- Fully offline capability

## Quick Start Recommendation

**Start with Kaikki.org API** because:
1. ✅ Easiest to implement (1-2 days)
2. ✅ No storage requirements
3. ✅ High quality data
4. ✅ Can add local caching later
5. ✅ Works immediately

**Then consider local storage** if:
- You need offline mode
- You have high lookup volume
- You want to reduce external dependencies

## Code Example (Kaikki.org Integration)

```python
import requests
import json

class KaikkiService:
    BASE_URL = "https://kaikki.org/dictionary"
    
    def get_word(self, word: str, language: str, target_lang: str = "en"):
        """Get word data from kaikki.org"""
        try:
            # Normalize language code (it -> Italian, en -> English)
            lang_map = {
                "it": "Italian",
                "en": "English", 
                "es": "Spanish",
                "fr": "French",
                "de": "German"
            }
            lang_name = lang_map.get(language, language)
            
            url = f"{self.BASE_URL}/{lang_name}/{word.lower()}.json"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                return self._parse_wiktextract_data(data, target_lang)
        except Exception as e:
            print(f"Kaikki lookup error: {e}")
        return None
    
    def _parse_wiktextract_data(self, data: dict, target_lang: str):
        """Parse wiktextract JSON to our format"""
        result = {
            "word": data.get("word", ""),
            "translation": "",
            "definition": "",
            "part_of_speech": data.get("pos", ""),
            "examples": [],
            "pronunciations": [],
            "etymology": data.get("etymology_text", "")
        }
        
        # Extract translations
        translations = data.get("translations", [])
        for trans in translations:
            if trans.get("code") == target_lang:
                result["translation"] = trans.get("word", "")
                break
        
        # Extract definitions from senses
        senses = data.get("senses", [])
        definitions = []
        for sense in senses:
            glosses = sense.get("glosses", [])
            if glosses:
                definitions.extend(glosses)
            
            # Extract examples
            examples = sense.get("examples", [])
            for ex in examples:
                if isinstance(ex, dict):
                    result["examples"].append(ex.get("text", ""))
        
        result["definition"] = "; ".join(definitions[:3])
        
        # Extract pronunciations
        pronunciations = data.get("pronunciations", [])
        for pron in pronunciations:
            if "ipa" in pron:
                result["pronunciations"].append(pron["ipa"])
        
        return result
```

## Conclusion

**For Bookabulary, Wiktextract (via Kaikki.org) is the clear winner:**

- ✅ Free and high-quality
- ✅ Rich data perfect for vocabulary learning
- ✅ Easy to integrate
- ✅ No rate limits
- ✅ Better than current services in every way

**Next Step:** Implement kaikki.org API integration as outlined in `WIKTEXTRACT_INTEGRATION_PLAN.md`

