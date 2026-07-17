import os
import logging

logger = logging.getLogger(__name__)

KB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "knowledge_base"))

class VectorStore:
    def __init__(self):
        self.documents = []
        self.index = None
        self.model = None
        self.is_ready = False
        
        try:
            from sentence_transformers import SentenceTransformer
            import faiss
            # Используем мультиязычную модель для поддержки русского языка
            logger.info("Загрузка модели эмбеддингов для RAG...")
            self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            self.faiss = faiss
            self.build_index()
        except ImportError as e:
            logger.warning(f"Векторный поиск отключен: отсутствуют зависимости ({e}).")
        except Exception as e:
            logger.error(f"Ошибка инициализации VectorStore: {e}")

    def build_index(self):
        if not self.model:
            return

        self.documents = []
        if not os.path.exists(KB_DIR):
            return

        # Читаем все .md файлы
        for filename in os.listdir(KB_DIR):
            if filename.endswith(".md"):
                filepath = os.path.join(KB_DIR, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                    # Примитивное чанкование по пустым строкам
                    chunks = [chunk.strip() for chunk in content.split("\n\n") if len(chunk.strip()) > 30]
                    for chunk in chunks:
                        self.documents.append({
                            "source": filename,
                            "content": chunk
                        })
        
        if not self.documents:
            return

        texts = [doc["content"] for doc in self.documents]
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        
        dim = embeddings.shape[1]
        self.index = self.faiss.IndexFlatL2(dim)
        self.index.add(embeddings)
        self.is_ready = True
        logger.info(f"Векторный индекс построен: {len(self.documents)} фрагментов.")

    def search(self, query: str, top_k: int = 3):
        if not self.is_ready or not self.documents:
            return []
        
        query_vector = self.model.encode([query], convert_to_numpy=True)
        distances, indices = self.index.search(query_vector, top_k)
        
        results = []
        # Фильтруем результаты (чтобы не отдавать мусор, если совпадения слабые)
        for i, idx in enumerate(indices[0]):
            if 0 <= idx < len(self.documents):
                results.append(self.documents[idx])
        return results

# Глобальный инстанс
vector_store = VectorStore()

def get_relevant_context(query: str, top_k: int = 3) -> str:
    """Возвращает строку с контекстом из базы знаний."""
    results = vector_store.search(query, top_k)
    if not results:
        return ""
    
    context_parts = []
    for res in results:
        context_parts.append(f"[{res['source']}]:\n{res['content']}")
    
    return "\n\n".join(context_parts)
