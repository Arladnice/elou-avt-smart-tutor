import os
import re
import math
import logging
from collections import Counter

logger = logging.getLogger(__name__)

KB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "knowledge_base"))

class VectorStore:
    def __init__(self):
        self.documents = []
        self.index = None
        self.model = None
        self.is_ready = False
        # По умолчанию включаем легкий режим (TF-IDF/BM25), чтобы потребление памяти было <60 МБ на Render Free Tier (лимит 512 МБ)
        self.use_lightweight = os.environ.get("LIGHTWEIGHT_RAG", "1") == "1"
        
        self.load_documents()
        
        if not self.use_lightweight:
            try:
                from sentence_transformers import SentenceTransformer
                import faiss
                logger.info("Загрузка модели эмбеддингов для тяжелого RAG...")
                self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
                self.faiss = faiss
                self.build_faiss_index()
                return
            except Exception as e:
                logger.warning(f"Тяжелый RAG недоступен ({e}), переключение на легкий TF-IDF RAG (RAM < 60MB).")
                self.use_lightweight = True
        
        if self.use_lightweight and self.documents:
            self.build_tfidf_index()

    def load_documents(self):
        self.documents = []
        if not os.path.exists(KB_DIR):
            return
        for filename in os.listdir(KB_DIR):
            if filename.endswith(".md"):
                filepath = os.path.join(KB_DIR, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                    chunks = [chunk.strip() for chunk in content.split("\n\n") if len(chunk.strip()) > 30]
                    for chunk in chunks:
                        self.documents.append({
                            "source": filename,
                            "content": chunk
                        })
        logger.info(f"Загружено {len(self.documents)} фрагментов базы знаний.")

    def tokenize(self, text: str):
        return re.findall(r'\b[а-яёa-z0-9_]{3,}\b', text.lower())

    def build_tfidf_index(self):
        self.doc_tokens = []
        self.doc_freq = Counter()
        num_docs = len(self.documents)
        
        for doc in self.documents:
            tokens = self.tokenize(doc["content"])
            self.doc_tokens.append(tokens)
            for word in set(tokens):
                self.doc_freq[word] += 1
                
        self.idf = {word: math.log((1 + num_docs) / (1 + freq)) + 1 for word, freq in self.doc_freq.items()}
        
        self.doc_vectors = []
        for tokens in self.doc_tokens:
            tf = Counter(tokens)
            total = len(tokens) or 1
            vec = {word: (count / total) * self.idf.get(word, 1.0) for word, count in tf.items()}
            norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
            vec_norm = {w: v / norm for w, v in vec.items()}
            self.doc_vectors.append(vec_norm)
            
        self.is_ready = True
        logger.info("Легковесный индекс TF-IDF построен (минимум потребления памяти).")

    def build_faiss_index(self):
        if not self.model or not self.documents:
            return
        texts = [doc["content"] for doc in self.documents]
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        dim = embeddings.shape[1]
        self.index = self.faiss.IndexFlatL2(dim)
        self.index.add(embeddings)
        self.is_ready = True
        logger.info(f"FAISS индекс построен: {len(self.documents)} фрагментов.")

    def search(self, query: str, top_k: int = 3):
        if not self.is_ready or not self.documents:
            return []
            
        if self.use_lightweight:
            query_tokens = self.tokenize(query)
            if not query_tokens:
                return self.documents[:top_k]
            
            tf = Counter(query_tokens)
            total = len(query_tokens) or 1
            query_vec = {word: (count / total) * self.idf.get(word, 1.0) for word, count in tf.items()}
            norm = math.sqrt(sum(v * v for v in query_vec.values())) or 1.0
            query_norm = {w: v / norm for w, v in query_vec.items()}
            
            scores = []
            for i, doc_vec in enumerate(self.doc_vectors):
                sim = sum(query_norm.get(w, 0.0) * v for w, v in doc_vec.items())
                scores.append((sim, i))
                
            scores.sort(key=lambda x: x[0], reverse=True)
            results = []
            for sim, i in scores[:top_k]:
                if sim > 0.01 or len(results) < 1:
                    results.append(self.documents[i])
            return results
        else:
            query_vector = self.model.encode([query], convert_to_numpy=True)
            distances, indices = self.index.search(query_vector, top_k)
            results = []
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
