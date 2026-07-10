# Code Reviewer

Comprehensive automated code review toolkit for analyzing Pull Requests and enforcing coding standards.

## 🚀 Quick Start

```bash
# Analyze a PR
python .agent/skills/code-reviewer/scripts/pr_analyzer.py <project-path>

# Check Code Quality
python .agent/skills/code-reviewer/scripts/code_quality_checker.py <target-path>
```

## ✨ What It Does

This skill provides a suite of tools to automate the code review process:

1.  **PR Analysis**: Scaffolding checks, structural validation, and best practice enforcement.
2.  **Quality Checking**: Deep static analysis to find performance issues and complex anti-patterns.
3.  **Report Generation**: Creates professional review reports suitable for team consumption.

## 🔧 How It Works

The skill operates through three main scripts located in the `scripts/` directory:

-   `pr_analyzer.py`: Validates PR structure and basic sanity checks.
-   `code_quality_checker.py`: Runs deeper analysis rules.
-   `review_report_generator.py`: Aggregates data into a readable format.

It references rules and standards defined in the `references/` directory:
-   `code_review_checklist.md`: The rulebook for reviews.
-   `coding_standards.md`: The definitive guide for coding style.
-   `common_antipatterns.md`: Examples of what to avoid.

## 🔔 When to Use

-   **Pre-Merge**: Run the `pr_analyzer` on every Pull Request.
-   **Periodic Audit**: Run the `code_quality_checker` on the main branch weekly.
-   **Review Session**: Consult the checklists when performing manual reviews.

## 📝 Examples

### Running a full quality check

```bash
python .agent/skills/code-reviewer/scripts/code_quality_checker.py ./src --verbose
```

### Generating a weekly report

```bash
python .agent/skills/code-reviewer/scripts/review_report_generator.py --format markdown --output weekly-report.md
```

## Tech Stack Support

-   **Languages**: TypeScript, JavaScript, Python, Go, Swift, Kotlin
-   **Frontend**: React, Next.js, React Native, Flutter
-   **Backend**: Node.js, Express, GraphQL, REST APIs
