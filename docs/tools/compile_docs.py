import os
from datetime import datetime

def main():
    # Корень репозитория — на два уровня выше каталога docs/tools/
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    docs_dir = os.path.join(base_dir, "docs")
    output_file = os.path.join(docs_dir, "Сводная_пояснительная_записка.md")
    
    # Порядок файлов важен для логики чтения жюри (от бизнес-целей к технике и ИБ)
    files_to_compile = [
        "market_analysis.md",
        "economics.md",
        "requirements.md",
        "solution_architecture.md",
        "infrastructure.md",
        "security_threat_model.md",
        "ai_architecture.md"
    ]
    
    print(f"Начинаем сборку пояснительной записки. Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    with open(output_file, "w", encoding="utf-8") as outfile:
        outfile.write("# Сводная Пояснительная Записка к КТК ЭЛОУ-АВТ\n\n")
        outfile.write(f"**Сгенерировано автоматически:** {datetime.now().strftime('%d.%m.%Y')}\n\n")
        outfile.write("---\n\n")
        
        for filename in files_to_compile:
            filepath = os.path.join(docs_dir, filename)
            if not os.path.exists(filepath):
                print(f"⚠️ ПРЕДУПРЕЖДЕНИЕ: Файл {filename} не найден!")
                continue
                
            print(f"Добавляем файл: {filename}")
            outfile.write(f"<!-- Начало раздела: {filename} -->\n")
            
            with open(filepath, "r", encoding="utf-8") as infile:
                content = infile.read()
                outfile.write(content)
                
            outfile.write("\n\n---\n\n")  # Разделитель между документами
            outfile.write("<div style='page-break-after: always;'></div>\n\n") # Разрыв страницы при печати в PDF
            
    print(f"✅ Сборка успешно завершена! Файл сохранен по пути:\n{output_file}")
    print("Для конвертации в PDF откройте его в VSCode и используйте плагин 'Markdown PDF'.")

if __name__ == "__main__":
    main()
