#!/usr/bin/env python3
"""
Pr Analyzer
Automated tool for code reviewer tasks
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional

class PrAnalyzer:
    """Main class for pr analyzer functionality"""
    
    def __init__(self, target_path: str, verbose: bool = False):
        self.target_path = Path(target_path)
        self.verbose = verbose
        self.results = {}
    
    def run(self) -> Dict:
        """Execute the main functionality"""
        print(f"🚀 Running {self.__class__.__name__}...")
        print(f"📁 Target: {self.target_path}")
        
        try:
            self.validate_target()
            self.analyze()
            self.generate_report()
            
            print("✅ Completed successfully!")
            return self.results
            
        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)
    
    def validate_target(self):
        """Validate the target path exists and is accessible"""
        if not self.target_path.exists():
            raise ValueError(f"Target path does not exist: {self.target_path}")
        
        if self.verbose:
            print(f"✓ Target validated: {self.target_path}")
    
    def analyze(self):
        """Perform the main analysis or operation"""
        if self.verbose:
            print("📊 Analyzing files for project guidelines violations...")
        
        self.results['status'] = 'success'
        self.results['target'] = str(self.target_path)
        self.results['findings'] = []
        
        findings = []
        exclude_dirs = {'.git', 'node_modules', 'dist', '__pycache__', '.agents', '.gemini', 'venv', 'env'}
        
        for root, dirs, files in os.walk(self.target_path):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                file_path = Path(root) / file
                if file.endswith('.py'):
                    self.analyze_python_file(file_path, findings)
                elif file.endswith(('.ts', '.tsx')):
                    self.analyze_ts_file(file_path, findings)
                    
        self.results['findings'] = findings
        if any(f['severity'] == 'error' for f in findings):
            self.results['status'] = 'failed'
        
        if self.verbose:
            print(f"✓ Analysis complete: {len(findings)} findings found.")

    def analyze_python_file(self, path: Path, findings: List[Dict]):
        """Сканирует Python файлы на локальные импорты и использование print."""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except Exception as e:
            if self.verbose:
                print(f"Could not read file {path}: {e}")
            return

        in_function = False
        func_indent = 0
        
        for idx, line in enumerate(lines, 1):
            stripped = line.strip()
            if not stripped or stripped.startswith('#'):
                continue
                
            if stripped.startswith('def ') or stripped.startswith('async def '):
                in_function = True
                func_indent = len(line) - len(line.lstrip())
                continue
                
            if in_function:
                current_indent = len(line) - len(line.lstrip())
                if current_indent <= func_indent and stripped:
                    in_function = False
                else:
                    if stripped.startswith('import ') or stripped.startswith('from '):
                        findings.append({
                            'file': str(path.relative_to(self.target_path)),
                            'line': idx,
                            'type': 'LOCAL_IMPORT',
                            'severity': 'error',
                            'message': f"Локальный импорт '{stripped}' внутри функции. Все импорты должны быть в начале файла."
                        })
            
            if 'print(' in line and not stripped.startswith('#') and 'print(' not in stripped.split('#')[0]:
                if 'code-reviewer' not in str(path) and 'test' not in str(path):
                    findings.append({
                        'file': str(path.relative_to(self.target_path)),
                        'line': idx,
                        'type': 'PRINT_USAGE',
                        'severity': 'warning',
                        'message': "Использование print(). Используйте logging вместо print."
                    })

    def analyze_ts_file(self, path: Path, findings: List[Dict]):
        """Сканирует TS/TSX файлы на наличие any, fetch и inline-стилей."""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except Exception as e:
            if self.verbose:
                print(f"Could not read file {path}: {e}")
            return
            
        for idx, line in enumerate(lines, 1):
            stripped = line.strip()
            if not stripped or stripped.startswith('//') or stripped.startswith('*'):
                continue
                
            code_part = stripped.split('//')[0]
            
            if ': any' in code_part or 'as any' in code_part or '<any>' in code_part:
                if not str(path).endswith('test.ts') and 'any' in code_part:
                    findings.append({
                        'file': str(path.relative_to(self.target_path)),
                        'line': idx,
                        'type': 'ANY_TYPE',
                        'severity': 'error',
                        'message': "Использование типа 'any'. Объявите строгий TypeScript-интерфейс."
                    })
                    
            if 'style={{' in code_part:
                findings.append({
                    'file': str(path.relative_to(self.target_path)),
                    'line': idx,
                    'type': 'INLINE_STYLE',
                    'severity': 'error',
                    'message': "Использование inline-стилей 'style={{...}}'. Вынесите стили в styled-components (*.styles.ts)."
                })
                
            if 'fetch(' in code_part and 'api.ts' not in str(path) and 'apiService' not in code_part:
                findings.append({
                    'file': str(path.relative_to(self.target_path)),
                    'line': idx,
                    'type': 'DIRECT_FETCH',
                    'severity': 'error',
                    'message': "Прямой вызов fetch(). Перенесите HTTP-запросы в central apiService (src/services/api.ts)."
                })

    def generate_report(self):
        """Generate and display the report"""
        print("\n" + "="*70)
        print("CODE QUALITY COMPLIANCE REPORT")
        print("="*70)
        print(f"Target: {self.results.get('target')}")
        print(f"Status: {self.results.get('status').upper()}")
        print(f"Total Violations: {len(self.results.get('findings', []))}")
        print("="*70)
        
        for finding in self.results.get('findings', []):
            sev_icon = "❌" if finding['severity'] == 'error' else "⚠️"
            print(f"{sev_icon} [{finding['type']}] {finding['file']}:{finding['line']}")
            print(f"   Detail: {finding['message']}")
            print("-" * 70)
        print()

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Pr Analyzer"
    )
    parser.add_argument(
        'target',
        help='Target path to analyze or process'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose output'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results as JSON'
    )
    parser.add_argument(
        '--output', '-o',
        help='Output file path'
    )
    
    args = parser.parse_args()
    
    tool = PrAnalyzer(
        args.target,
        verbose=args.verbose
    )
    
    results = tool.run()
    
    if args.json:
        output = json.dumps(results, indent=2)
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
            print(f"Results written to {args.output}")
        else:
            print(output)

if __name__ == '__main__':
    main()
