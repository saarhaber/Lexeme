"""
Text utilities for sanitizing and cleaning text content.
"""
import re


def sanitize_text(text: str) -> str:
    """
    Sanitize text by removing invalid Unicode surrogates and ensuring valid UTF-8 encoding.
    
    This function handles cases where PDF extraction or other text sources produce
    invalid Unicode surrogate pairs (like U+D83E) that cannot be encoded to UTF-8.
    
    Args:
        text: Input text that may contain invalid Unicode characters
        
    Returns:
        Sanitized text that can be safely encoded to UTF-8
    """
    if not text:
        return text
    
    # Method 1: Remove invalid surrogates directly
    # Unicode surrogates are in the range U+D800 to U+DFFF
    # These are invalid when not part of a proper surrogate pair
    
    # Filter out lone surrogates (high surrogates 0xD800-0xDBFF and low surrogates 0xDC00-0xDFFF)
    # that are not properly paired
    sanitized_chars = []
    i = 0
    while i < len(text):
        char = text[i]
        code_point = ord(char)
        
        # Check if it's a high surrogate (0xD800-0xDBFF)
        if 0xD800 <= code_point <= 0xDBFF:
            # Check if next character is a low surrogate (0xDC00-0xDFFF)
            if i + 1 < len(text) and 0xDC00 <= ord(text[i + 1]) <= 0xDFFF:
                # Valid surrogate pair - keep both
                sanitized_chars.append(char)
                sanitized_chars.append(text[i + 1])
                i += 2
                continue
            else:
                # Lone high surrogate - skip it
                i += 1
                continue
        # Check if it's a low surrogate without a preceding high surrogate
        elif 0xDC00 <= code_point <= 0xDFFF:
            # Lone low surrogate - skip it
            i += 1
            continue
        else:
            # Valid character
            sanitized_chars.append(char)
            i += 1
    
    sanitized = ''.join(sanitized_chars)
    
    # Method 2: Ensure the result can be encoded to UTF-8
    try:
        # Test encoding
        sanitized.encode('utf-8')
    except UnicodeEncodeError:
        # If encoding still fails, use replace strategy
        sanitized = sanitized.encode('utf-8', errors='replace').decode('utf-8')
    
    # Method 3: Remove any remaining control characters except newlines and tabs
    # This helps clean up any other problematic characters
    sanitized = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', sanitized)
    
    return sanitized


def clean_text_for_database(text: str) -> str:
    """
    Clean text specifically for database storage.
    
    This is an alias for sanitize_text but makes the intent clear.
    """
    return sanitize_text(text)

