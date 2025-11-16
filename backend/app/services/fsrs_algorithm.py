"""
FSRS (Free Spaced Repetition Scheduler) algorithm implementation.
More accurate than SM-2, with better handling of lapses and adaptive difficulty.
"""
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
import math

class FSRSAlgorithm:
    """
    FSRS algorithm for spaced repetition.
    Based on research by Jarrett Ye and implementation in FSRS-rs.
    """
    
    def __init__(self):
        # FSRS parameters (optimized through research)
        # These are default parameters, can be personalized per user
        self.w = [
            0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14,
            0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61
        ]
    
    def calculate_next_review(
        self,
        stability: float,
        difficulty: float,
        last_review: datetime,
        quality: int,  # 0-5 (0=complete blackout, 5=perfect)
        elapsed_days: Optional[float] = None
    ) -> Dict[str, any]:
        """
        Calculate next review parameters based on FSRS algorithm.
        
        Args:
            stability: Current memory stability (days)
            difficulty: Current item difficulty (0-1)
            last_review: Last review datetime
            quality: Review quality (0-5)
            elapsed_days: Days since last review (calculated if None)
        
        Returns:
            Dictionary with new_stability, new_difficulty, interval, due_date
        """
        if elapsed_days is None:
            elapsed_days = (datetime.utcnow() - last_review).total_seconds() / 86400
        
        # Calculate new stability and difficulty
        new_stability, new_difficulty = self._update_parameters(
            stability, difficulty, quality, elapsed_days
        )
        
        # Calculate next interval
        interval = self._calculate_interval(new_stability, new_difficulty, quality)
        
        # Calculate due date
        due_date = datetime.utcnow() + timedelta(days=interval)
        
        return {
            "stability": new_stability,
            "difficulty": new_difficulty,
            "interval": interval,
            "due_date": due_date,
            "review_count": 0  # Will be incremented by caller
        }
    
    def _update_parameters(
        self,
        stability: float,
        difficulty: float,
        quality: int,
        elapsed_days: float
    ) -> Tuple[float, float]:
        """Update stability and difficulty based on review."""
        # Retrieve from w
        w = self.w
        
        # Calculate new difficulty
        if quality >= 3:
            new_difficulty = difficulty - w[6] * (quality - 3)
        else:
            new_difficulty = difficulty + w[7] * (3 - quality)
        
        # Clamp difficulty
        new_difficulty = max(0.1, min(10.0, new_difficulty))
        
        # Calculate new stability
        if quality >= 3:
            # Successful recall
            if elapsed_days <= stability:
                # On time review
                new_stability = stability * (1 + math.exp(w[8]) * (11 - new_difficulty) * 
                                            math.exp(-w[9] * elapsed_days) * (math.exp((1 - quality) * w[10]) - 1))
            else:
                # Late review
                new_stability = stability * (1 + math.exp(w[8]) * (11 - new_difficulty) * 
                                            math.exp(-w[9] * stability) * (math.exp((1 - quality) * w[10]) - 1))
        else:
            # Failed recall - reset stability
            new_stability = w[11] * math.exp(-w[12] * new_difficulty) * (math.exp((1 - quality) * w[13]) - 1)
        
        # Ensure stability is positive
        new_stability = max(0.1, new_stability)
        
        return new_stability, new_difficulty
    
    def _calculate_interval(self, stability: float, difficulty: float, quality: int) -> int:
        """Calculate next review interval in days."""
        w = self.w
        if quality >= 3:
            # Successful recall - use stability
            interval = stability * (1 + math.exp(w[14]) * (11 - difficulty) * (math.exp((1 - quality) * w[15]) - 1))
        else:
            # Failed recall - short interval
            interval = 1
        
        # Round to nearest day, minimum 1 day
        return max(1, int(round(interval)))
    
    def initialize_new_item(self) -> Dict[str, any]:
        """Initialize parameters for a new item."""
        return {
            "stability": 0.4,  # Initial stability (very short)
            "difficulty": 0.3,  # Initial difficulty (moderate)
            "interval": 1,  # First review in 1 day
            "due_date": datetime.utcnow() + timedelta(days=1),
            "review_count": 0,
            "state": "new"  # new, learning, review, relearning
        }
    
    def get_initial_parameters(self) -> Dict[str, float]:
        """Get initial parameters for a new SRS item."""
        return {
            "stability": 0.4,
            "difficulty": 0.3,
            "interval": 1
        }

