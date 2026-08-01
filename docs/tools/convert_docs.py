import os
import glob
from markitdown import MarkItDown

def get_topic(filename):
    name_lower = filename.lower()
    if "бизнес" in name_lower:
        return "Бизнес_анализ"
    elif "экономик" in name_lower or "ээ_проекта" in name_lower:
        return "Экономика"
    elif "мониторинг" in name_lower:
        return "Умный_мониторинг"
    elif "продукт" in name_lower or "гибкие решения" in name_lower:
        return "Продуктовый_подход"
    elif "архитектур" in name_lower:
        return "ИТ_архитектура"
    elif "кейс" in name_lower or "case" in name_lower:
        return "Кейс"
    elif "ml" in name_lower or "двойник" in name_lower or "мл" in name_lower:
        return "ML_в_цифровых_двойниках"
    else:
        return "Общее_Исходные_данные"

def main():
    print("Инициализация MarkItDown...")
    try:
        md = MarkItDown()
    except Exception as e:
        print(f"Ошибка инициализации MarkItDown: {e}")
        return

    base_dir = r"e:\Git-Projects\elou-avt-smart-tutor"
    
    # Источники файлов
    source_dirs = [
        os.path.join(base_dir, "docs", "presentations"),
        os.path.join(base_dir, "docs", "reference"),
        os.path.join(base_dir, "Исходные данные")
    ]
    
    target_extensions = ['.pdf', '.docx', '.txt', '.xlsx']
    
    files_to_convert = []
    for s_dir in source_dirs:
        if not os.path.exists(s_dir):
            continue
        for ext in target_extensions:
            # Ищем файлы с нужными расширениями
            files_to_convert.extend(glob.glob(os.path.join(s_dir, f"*{ext}")))
            files_to_convert.extend(glob.glob(os.path.join(s_dir, f"*{ext.upper()}")))

    # Убираем дубликаты
    files_to_convert = list(set(files_to_convert))

    if not files_to_convert:
        print("Нет файлов для конвертации.")
        return

    print(f"Найдено файлов для конвертации: {len(files_to_convert)}")

    for file_path in files_to_convert:
        filename = os.path.basename(file_path)
        topic = get_topic(filename)
        
        # Сохраняем все результаты в docs/reference/Сгруппировано_по_темам
        output_dir = os.path.join(base_dir, "docs", "reference", topic)
        os.makedirs(output_dir, exist_ok=True)
        
        output_path = os.path.join(output_dir, filename + ".md")
        
        print(f"Конвертация {filename} в тему {topic}...")
        try:
            result = md.convert(file_path)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(result.text_content)
            print(f"Успешно сохранено в {output_path}")
        except Exception as e:
            print(f"Ошибка при конвертации {filename}: {e}")

    print("Готово! Все файлы сконвертированы и разложены по подпапкам.")

if __name__ == "__main__":
    main()
