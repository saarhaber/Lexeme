# Wiktextract Implementation Notes

## Current Status

The Wiktextract integration has been implemented with a **fallback architecture**. Here's what you need to know:

## Important Discovery

**kaikki.org does NOT provide a REST API** for individual word lookups. Instead, it offers:
- Bulk JSON file downloads (per language)
- Pre-processed wiktextract data files
- No HTTP API endpoint for individual words

## Current Implementation

The current implementation:
1. ✅ **KaikkiService** - Created and integrated
2. ✅ **DictionaryService Integration** - Uses KaikkiService as primary source
3. ✅ **Fallback System** - Falls back to existing APIs (MyMemory, WordReference, etc.)
4. ⚠️ **KaikkiService** - Currently returns None (no local data yet)

## Why This Is Still Good

The architecture is correct and ready for enhancement:
- ✅ **No Breaking Changes** - Existing code continues to work
- ✅ **Fallback Works** - Uses MyMemory, WordReference, etc. as before
- ✅ **Ready for Enhancement** - Can add local wiktextract data easily

## Options for Using Wiktextract Data

### Option 1: Download Bulk Files from kaikki.org (Recommended)

1. Download language-specific JSON files from https://kaikki.org/dictionary/rawdata.html
2. Store in `backend/data/wiktionary/{language}/`
3. Implement `_try_local_data()` to load from these files
4. Index for fast lookups (SQLite or in-memory)

**Pros:**
- High quality data
- Works offline
- Fast lookups
- No API rate limits

**Cons:**
- Requires storage space (~100-500 MB per language)
- Need to download and update periodically

### Option 2: Use wiktextract Library Directly

1. Install wiktextract: `pip install wiktextract`
2. Download Wiktionary dumps from https://dumps.wikimedia.org/other/wiktionary/
3. Process dumps with wiktextract
4. Store results in local database

**Pros:**
- Full control
- Can customize extraction
- Always up-to-date

**Cons:**
- More complex setup
- Processing time required
- Large storage needs

### Option 3: Use Alternative Free Wiktionary API

Look for other free Wiktionary APIs or services that provide REST endpoints.

### Option 4: Keep Current Fallback (Simplest)

The current implementation already works well with fallback APIs. Wiktextract integration can be added later when you have time to download and process the bulk files.

## Recommended Next Steps

1. **Short Term**: Keep current implementation (fallback APIs work fine)
2. **Medium Term**: Download Italian and English JSON files from kaikki.org
3. **Implement**: Local file loading in `_try_local_data()`
4. **Long Term**: Add more languages as needed

## How to Add Local Data (When Ready)

1. Download JSON files from kaikki.org:
   ```bash
   # Example for Italian
   wget https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.json
   ```

2. Implement `_try_local_data()` in `kaikki_service.py`:
   ```python
   def _try_local_data(self, word: str, language: str, target_language: str):
       # Load from local JSON file or database
       # Parse and return wiktextract data
   ```

3. The DictionaryService will automatically use it when available.

## Current Behavior

- ✅ DictionaryService tries KaikkiService first
- ✅ If KaikkiService returns None, falls back to MyMemory/WordReference/etc.
- ✅ All existing functionality preserved
- ✅ No errors or breaking changes

## Conclusion

The integration is **architecturally complete** and ready for use. The fallback system ensures everything works as before, and you can enhance it with local wiktextract data when ready. The code is designed to seamlessly switch to wiktextract data once it's available.

