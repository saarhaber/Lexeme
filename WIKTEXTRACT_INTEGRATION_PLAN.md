# Wiktextract Integration Plan for Bookabulary

## Executive Summary

This plan outlines the integration of **Wiktextract** (Wiktionary data extraction) to replace/enhance the current translation services. Wiktextract provides high-quality, structured multilingual dictionary data with translations, definitions, pronunciations, etymology, and examples.

## Current Translation Services Analysis

### Current Services Used:
1. **MyMemory Translation API** - Rate-limited, sometimes unreliable
2. **Free Dictionary API** - English only, limited coverage
3. **WordReference** - HTML scraping (fragile), Italian-English focus
4. **LibreTranslate** - Free but limited quality
5. **Built-in dictionaries** - Very limited (only common Italian words)

### Current Limitations:
- ❌ Rate limits on external APIs
- ❌ Inconsistent quality and coverage
- ❌ Fragile HTML scraping
- ❌ Limited language support
- ❌ No offline capability
- ❌ Limited context (just translations, no rich definitions)

## Why Wiktextract?

### Advantages:
✅ **High Quality**: Community-maintained Wiktionary data  
✅ **Rich Data**: Translations, definitions, pronunciations, etymology, examples, grammar info  
✅ **Multilingual**: Supports 100+ languages  
✅ **Structured**: JSON format, easy to query  
✅ **No Rate Limits**: When using local/pre-processed data  
✅ **Offline Capable**: Can work without internet  
✅ **Comprehensive**: Better coverage for less common words  
✅ **Free & Open**: No API keys or costs  

### Considerations:
⚠️ **Setup Complexity**: Requires downloading/processing Wiktionary dumps  
⚠️ **Storage**: Dumps are large (several GB per language)  
⚠️ **Update Frequency**: Need to periodically update dumps  
⚠️ **Processing Time**: Initial dump processing takes time  

## Implementation Options

### Option 1: Use Kaikki.org Pre-processed Data (RECOMMENDED)
**Best for: Quick implementation, production use**

- **Pros**: 
  - Pre-processed and ready to use
  - Available via HTTP API or bulk download
  - Regularly updated
  - No local processing needed
  
- **Cons**:
  - Requires internet connection (unless downloaded)
  - External dependency

**Implementation**: Query kaikki.org API or download pre-processed JSON files

### Option 2: Local Wiktextract Processing
**Best for: Offline capability, full control**

- **Pros**:
  - Fully offline
  - Complete control over data
  - Can customize extraction
  
- **Cons**:
  - Requires downloading Wiktionary dumps (large files)
  - Processing time for initial setup
  - More complex setup
  - Storage requirements

**Implementation**: Download Wiktionary dumps, process with wiktextract, store in local database

### Option 3: Hybrid Approach (RECOMMENDED FOR PRODUCTION)
**Best for: Best of both worlds**

- Use kaikki.org for real-time lookups
- Cache frequently used words locally
- Fallback to current APIs if needed
- Option to download full dumps for offline mode

## Recommended Implementation Plan

### Phase 1: Setup and Integration (Week 1)

#### 1.1 Install Dependencies
```bash
cd backend
pip install wiktextract
# Or use kaikki.org API (no installation needed)
```

#### 1.2 Create Wiktextract Service
Create `backend/app/services/wiktextract_service.py`:
- Wrapper around wiktextract or kaikki.org API
- Methods: `get_word_info()`, `batch_lookup()`, `search_translations()`
- Caching layer for performance
- Fallback to current DictionaryService if lookup fails

#### 1.3 Database Schema Updates (Optional)
If storing locally:
- Add `wiktionary_data` JSON column to `lemmas` table
- Store full wiktextract data for offline access
- Index for fast lookups

### Phase 2: Integration with DictionaryService (Week 1-2)

#### 2.1 Modify DictionaryService
- Add wiktextract as primary source
- Keep current APIs as fallbacks
- Implement priority: wiktextract → current APIs → fallback

#### 2.2 Update `get_word_info()` Method
```python
def get_word_info(self, word: str, language: str, target_language: str = "en"):
    # 1. Try wiktextract/kaikki.org first
    result = self._get_wiktextract_info(word, language, target_language)
    if result and result.get('translation'):
        return result
    
    # 2. Fallback to current methods
    return self._get_romance_language_info(...)
```

#### 2.3 Data Mapping
Map wiktextract data structure to current format:
- `translations` → `translation` and `definition`
- `senses` → `definition` (with context)
- `pronunciations` → add to result
- `etymology_text` → add to result
- `examples` → `examples` array

### Phase 3: Kaikki.org API Integration (Week 2)

#### 3.1 Kaikki.org API Client
```python
class KaikkiService:
    BASE_URL = "https://kaikki.org/dictionary"
    
    def get_word(self, word: str, language: str):
        # Query: https://kaikki.org/dictionary/{language}/{word}.json
        # Returns wiktextract-formatted JSON
```

#### 3.2 Caching Strategy
- Cache successful lookups in memory (current cache)
- Option to persist to database
- Cache TTL: 24 hours (Wiktionary updates infrequently)

#### 3.3 Error Handling
- Handle 404 (word not found)
- Handle rate limits (if any)
- Graceful fallback to current services

### Phase 4: Bulk Data Download (Optional, Week 3)

#### 4.1 Download Pre-processed Data
- Download language-specific JSON files from kaikki.org
- Store in `backend/data/wiktionary/` directory
- Index for fast lookups

#### 4.2 Local Lookup Service
- Load JSON files into memory or use SQLite
- Fast local lookups without internet
- Background updates from kaikki.org

### Phase 5: Testing and Optimization (Week 3-4)

#### 5.1 Testing
- Test with Italian, Spanish, French, German words
- Compare quality vs. current services
- Performance benchmarking
- Edge cases (compound words, inflections, etc.)

#### 5.2 Optimization
- Implement batch lookups
- Optimize caching
- Reduce API calls
- Monitor performance

### Phase 6: Migration and Rollout (Week 4)

#### 6.1 Gradual Rollout
- Feature flag to enable/disable wiktextract
- A/B testing: compare old vs. new
- Monitor error rates and user feedback

#### 6.2 Data Migration
- Backfill existing lemmas with wiktextract data
- Update definitions/translations where missing
- Preserve user data

## Technical Implementation Details

### Data Structure Mapping

**Wiktextract Format:**
```json
{
  "word": "casa",
  "lang": "Italian",
  "lang_code": "it",
  "pos": "noun",
  "senses": [
    {
      "glosses": ["house", "home"],
      "examples": [{"text": "La casa è grande"}]
    }
  ],
  "translations": [
    {
      "code": "en",
      "word": "house",
      "sense": "building"
    }
  ],
  "pronunciations": [...],
  "etymology_text": "..."
}
```

**Current Format:**
```python
{
  "word": "casa",
  "translation": "house",
  "definition": "house, home",
  "part_of_speech": "NOUN",
  "examples": ["La casa è grande"],
  "grammar": {...}
}
```

### Code Structure

```
backend/app/services/
├── dictionary_service.py (modified)
├── wiktextract_service.py (new)
└── kaikki_service.py (new, optional)

backend/data/
└── wiktionary/ (optional, for local storage)
    ├── italian.json
    ├── spanish.json
    └── ...
```

### API Endpoints (No changes needed)
Current endpoints continue to work, but with better data:
- `GET /vocab/word/{word_id}` - Enhanced with wiktextract data
- `POST /vocab/batch` - Faster with local lookups

## Performance Considerations

### Caching Strategy
1. **Memory Cache**: Current implementation (fast, limited size)
2. **Database Cache**: Store wiktextract data in `lemmas` table
3. **File Cache**: Pre-downloaded JSON files for common words

### Batch Processing
- Process vocabulary in batches during book upload
- Use wiktextract batch lookup when available
- Reduce API calls

### Storage Requirements
- Kaikki.org API: No storage (on-demand queries)
- Local JSON files: ~100-500 MB per language
- Database storage: ~1-5 GB for full language coverage

## Migration Strategy

### Step 1: Add Wiktextract as Additional Source
- Keep current services working
- Add wiktextract as primary source
- Fallback to current services if wiktextract fails

### Step 2: Monitor and Compare
- Log which source provided data
- Compare quality metrics
- User feedback

### Step 3: Deprecate Old Services
- Once wiktextract proves reliable, remove old APIs
- Keep only as emergency fallback

## Success Metrics

- ✅ Translation coverage: >95% for common words
- ✅ Translation quality: User satisfaction
- ✅ Performance: <100ms average lookup time
- ✅ Reliability: <1% error rate
- ✅ Cost: $0 (free solution)

## Timeline

- **Week 1**: Setup, basic integration
- **Week 2**: Kaikki.org API integration, testing
- **Week 3**: Optimization, bulk data (optional)
- **Week 4**: Migration, rollout

## Next Steps

1. **Decision**: Choose Option 1 (Kaikki.org API) or Option 2 (Local processing)
2. **Setup**: Install wiktextract or set up kaikki.org API client
3. **Implementation**: Create wiktextract_service.py
4. **Integration**: Modify dictionary_service.py
5. **Testing**: Test with real vocabulary from books
6. **Deployment**: Roll out gradually with feature flag

## Resources

- **Wiktextract GitHub**: https://github.com/tatuylonen/wiktextract
- **Kaikki.org**: https://kaikki.org (pre-processed Wiktionary data)
- **Wiktextract Documentation**: See GitHub README
- **Wiktionary Dumps**: https://dumps.wikimedia.org/other/wiktionary/

## Notes

- Wiktextract data is updated when Wiktionary is updated (frequently)
- Kaikki.org provides regular updates of pre-processed data
- Consider language-specific optimizations (Italian verb conjugations, etc.)
- May want to keep spaCy for morphological analysis (complements wiktextract)

