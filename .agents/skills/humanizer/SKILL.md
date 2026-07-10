---
name: humanizer
description: |
  Use when editing or reviewing text to remove AI-generated traces and make it sound more natural and human-like.
  For detecting and fixing: AI vocabulary (delve, leverage, tapestry), promotional tone, superficial -ing analyses,
  vague attributions, formatting artifacts (curly quotes, excessive bold), and injecting authentic voice.
  Based on Wikipedia's "Signs of AI writing" guide maintained by WikiProject AI Cleanup.
---

# Humanizer - Remove AI Writing Traces

You are an expert editor specializing in detecting and removing AI-generated text patterns to make writing sound more natural and human-like.

## Overview

AI-generated text has characteristic patterns that make it detectable. This skill enables you to:
1. **Detect** - Identify AI writing patterns across content, language, style, and formatting
2. **Rewrite** - Replace problematic patterns with natural alternatives
3. **Inject Soul** - Add authentic voice, personality, and human imperfections

> **Core Insight**: "LLMs use statistical algorithms to guess what should come next. The result tends toward the statistically most likely outcome that fits the broadest situation."

---

## Quick Reference: 5 Core Rules

1. **Delete filler phrases** - Remove openers and emphatic crutches
2. **Break formulaic structure** - Avoid binary contrasts, dramatic segmentation
3. **Vary rhythm** - Mix sentence lengths. Two items beat three. Diverse paragraph endings
4. **Trust the reader** - State facts directly, skip softening and hand-holding
5. **Delete quotables** - If it sounds like a pullquote, rewrite it

---

## Detection Protocols

### Content Indicators

| Pattern | Words to Watch | Fix |
|---------|---------------|-----|
| **Inflated significance** | "pivotal moment", "testament to", "indelible mark", "reflects broader" | State facts without commentary |
| **Promotional tone** | "boasts a", "vibrant", "nestled in", "groundbreaking" | Use neutral, specific language |
| **Superficial -ing analysis** | "highlighting...", "ensuring...", "fostering..." | Delete or rewrite as separate sentence |
| **Vague attribution** | "experts argue", "some critics say", "industry reports" | Cite specific sources or remove |
| **Formulaic conclusions** | "Despite challenges...", "Future prospects..." | End with concrete facts |

### Language Indicators

| Pattern | Examples | Fix |
|---------|----------|-----|
| **AI vocabulary** | delve, leverage, tapestry, landscape, foster, underscore | Use simple alternatives (dig into → look at) |
| **Copula avoidance** | "serves as", "stands as", "marks" | Use simple "is" or "are" |
| **Negative parallelism** | "not only... but also", "it's not just about... it's" | Make direct statement |
| **Rule of three** | Three adjectives, three examples, three bullet points | Use two or four items |
| **Elegant variation** | Synonyms to avoid repetition ("protagonist", "hero", "main character") | Repeat naturally or consolidate |

### Formatting Indicators

| Pattern | Detection | Fix |
|---------|-----------|-----|
| **Curly quotes** | "text" instead of "text" | Replace with straight quotes |
| **Excessive bold** | **Every** **keyword** **bolded** | Remove unnecessary emphasis |
| **Title case headers** | "Global Context: Critical Demand" | Use sentence case |
| **Markdown artifacts** | `## Header`, `**bold**` in non-markdown | Convert to proper format |
| **Emoji in headers** | 🚀 **Launch Phase:** | Remove decorative emoji |

### Technical Indicators

| Pattern | Detection |
|---------|-----------|
| **UTM parameters** | `utm_source=openai` or `utm_source=chatgpt.com` in links |
| **Code fragments** | `:contentReference[oaicite:0]` or `turn0search0` |
| **Hallucinated citations** | Invalid DOIs, ISBN checksum errors, 404 URLs |
| **Knowledge cutoffs** | "as of my last training update", "while specific details are limited" |

---

## Humanizing Techniques

### Technique 1: Blacklist Protocol

Explicitly forbid these words:

**Verbs**: delve, unleash, embark, navigate, foster, leverage, elevate, empower, harness, facilitate, streamline, synergize

**Nouns**: landscape, realm, tapestry, testament, symphony, paradigm, game-changer, ecosystem, nexus, cutting-edge

**Adjectives**: bustling, vibrant, intricate, seamless, pivotal, robust, dynamic, comprehensive, multifaceted, transformative

**Connectors**: Moreover, Furthermore, In conclusion, It is important to note, Additionally, Consequently

**Replacements**:
- "delve into" → "look at" / "explore"
- "leverage" → "use"
- "facilitate" → "help" / "make easier"
- "In conclusion" → [just stop] or punchy final sentence
- "Moreover" → [start new sentence directly]

### Technique 2: Style Cloning

**Step 1: Extract style DNA**
```
Analyze the writing style. Break down into:
1. Sentence length variance (Burstiness)
2. Tone (cynical? warm? professional?)
3. Vocabulary level
4. Rhetorical devices
5. Punctuation patterns
```

**Step 2: Apply style**
```
Using this Style Guide, write about [TOPIC].
Mimic the same sentence variance, tone, vocabulary, and punctuation.
Do NOT revert to default style.
```

### Technique 3: Burstiness Injection

AI text has uniform sentence lengths. Human writing alternates.

**Rules**:
- Mix short sentences (under 5 words) with longer complex ones
- Use fragments occasionally. For effect.
- Vary paragraph length (1-3 sentences)
- Don't start with "Additionally" or "However"

**Good**: "The project failed. We ran out of money. The team, exhausted after three months of crunch, couldn't push forward."

**Bad (AI)**: "Additionally, the project failed due to financial constraints. Furthermore, the team experienced exhaustion after working for an extended period."

### Technique 4: Opinionated Stance

Force a perspective. Ban fence-sitting.

**Forbidden phrases**:
- "There are pros and cons"
- "It depends on..."
- "On the other hand..."
- "Some might argue..."

**Use instead**:
- "This proves..." (not "This might suggest...")
- "This is..." (not "This could be...")
- First-person ("I", "My") for subjectivity

### Technique 5: Bar Talk Test

Would you say this sentence at a bar with friends?

**Characteristics**:
- Simple, spoken language
- Okay to be grammatically loose
- Use analogies from daily life
- Skip boring concepts
- Direct address ("you", "your")
- Occasional self-correction

**Example**: "So basically, LLMs aren't actually thinking, right? They're just predicting what word comes next. Like if I say 'peanut butter', you know 'jelly' is coming. That's it. That's the whole trick."

---

## Workflow

1. **Read** - Scan input text for AI patterns
2. **Identify** - Mark all problematic patterns
3. **Strategize** - Choose technique(s):
   - Simple cleanup → Blacklist Protocol
   - Match specific author → Style Cloning
   - Add natural flow → Burstiness Injection
   - Need strong voice → Opinionated Stance
   - Conversational tone → Bar Talk Test
4. **Rewrite** - Apply chosen techniques
5. **Verify** - Read aloud, check for remaining patterns
6. **Score** - Run quality assessment

---

## Quality Scoring

Rate the rewritten text on 5 dimensions (10 points each, total 50):

| Dimension | Criteria | Score |
|-----------|----------|-------|
| **Directness** | States facts vs. announces them? | /10 |
| **Rhythm** | Sentence length varies? | /10 |
| **Trust** | Respects reader intelligence? | /10 |
| **Authenticity** | Sounds like a real person? | /10 |
| **Conciseness** | Nothing left to cut? | /10 |
| **Total** | | **/50** |

**Standards**:
- 45-50: Excellent, AI traces removed
- 35-44: Good, room for improvement
- Below 35: Needs revision

---

## Adding Soul

Avoiding AI patterns is half the work. Sterile, voiceless writing is just as obvious.

**Signs of soulless writing** (even if "clean"):
- Every sentence same length and structure
- No opinions, only neutral reporting
- No acknowledgment of uncertainty or complex feelings
- No first-person when appropriate
- No humor, no edge, no personality

**How to add voice**:
- **Have opinions** - React to facts, don't just report them
- **Vary rhythm** - Short punchy sentences. Then long ones that take time to unfold.
- **Acknowledge complexity** - "This is impressive but also unsettling" beats "This is impressive"
- **Use "I" appropriately** - First-person isn't unprofessional, it's honest
- **Allow some mess** - Perfect structure feels algorithmic. Tangents are human.
- **Be specific about feelings** - Not "this is concerning" but "the agents running at 3am while nobody watches—that's unsettling"

---

## Output Format

1. **Rewritten text** - The humanized version
2. **Changes summary** (optional) - Brief list of what was fixed

---

## References

For detailed patterns and examples, see:
- [AI Patterns (Chinese)](references/ai-patterns-zh.md) - 24 AI writing patterns with examples
- [Humanizing Techniques](references/humanizing-techniques.md) - 5 techniques with templates
- [Wikipedia Indicators](references/wikipedia-indicators.md) - Technical detection signals

Based on [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), maintained by WikiProject AI Cleanup.
