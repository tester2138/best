"""
Assigns sequential scores to all 'basic' dataQualityStage brands in directory.ts

Rules:
- Brands with dataQualityStage: 'basic' are the batch-added brands (no existing scores)
- Oldest batch brands (first in file) -> score 1.0
- Newest batch brands (last in file) -> score 4.5
- Score increments by 0.1 steps, distributed evenly across all batch brands
- Top 15 brokers in brokers.ts are untouched (they have their own scores)
"""

import re

FILE_PATH = '/vercel/share/v0-project/data/directory.ts'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all positions of dataQualityStage: 'basic'
pattern = "dataQualityStage: 'basic'"
positions = []
start = 0
while True:
    idx = content.find(pattern, start)
    if idx == -1:
        break
    positions.append(idx)
    start = idx + 1

total_brands = len(positions)
print(f"Found {total_brands} brands with dataQualityStage: 'basic'")

if total_brands == 0:
    print("No brands to process. Exiting.")
    exit(0)

# Score distribution function
def get_score(index, total):
    if total == 1:
        return 1.0
    fraction = index / (total - 1)  # 0.0 to 1.0
    raw_score = 1.0 + fraction * 3.5  # 1.0 to 4.5
    return round(raw_score * 10) / 10

# Show distribution summary
score_counts = {}
for i in range(total_brands):
    s = f"{get_score(i, total_brands):.1f}"
    score_counts[s] = score_counts.get(s, 0) + 1

print("\nScore distribution plan:")
for s in sorted(score_counts.keys(), key=lambda x: float(x)):
    print(f"  Score {s}: {score_counts[s]} brands")

print(f"\nFirst brand score: {get_score(0, total_brands):.1f}")
print(f"Last brand score: {get_score(total_brands - 1, total_brands):.1f}")

# Now insert scores into the content
# Process in reverse order to preserve indices
modified_content = content

for i in range(total_brands - 1, -1, -1):
    score = get_score(i, total_brands)
    score_str = f"\n    scores: {{ overall: {score:.1f} }},"
    
    # Find the i-th occurrence of the pattern in modified_content
    target_pos = -1
    search_start = 0
    for j in range(i + 1):
        idx = modified_content.find(pattern, search_start)
        if idx == -1:
            break
        if j == i:
            target_pos = idx
        search_start = idx + 1
    
    if target_pos == -1:
        print(f"Warning: could not find brand {i}")
        continue
    
    # Find sourceUrls after this position
    source_urls_idx = modified_content.find("sourceUrls:", target_pos)
    if source_urls_idx == -1:
        print(f"Warning: no sourceUrls found for brand {i}")
        continue
    
    # Find end of sourceUrls array '],'
    closing_bracket = modified_content.find('],', source_urls_idx)
    if closing_bracket == -1:
        print(f"Warning: no closing bracket for brand {i}")
        continue
    after_source_urls = closing_bracket + 2  # after '],'
    
    # Find the '\n  },' that closes this brand object
    closing_brace = modified_content.find('\n  },', after_source_urls)
    if closing_brace == -1:
        print(f"Warning: no closing brace for brand {i}")
        continue
    
    # Insert the score before the closing brace
    modified_content = modified_content[:closing_brace] + score_str + modified_content[closing_brace:]

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(modified_content)

print(f"\nDone! Scores assigned to {total_brands} brands.")
