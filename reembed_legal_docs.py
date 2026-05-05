"""
Re-embeds all rows in legal_docs using BAAI/bge-large-en-v1.5 (1024 dims).
Run once after dropping idx_legal_docs_embedding and altering column to vector(1024).
Recreates the index at the end.
"""
import os
import time
import torch
from sentence_transformers import SentenceTransformer
from psycopg2.extras import execute_values
from db import get_db_connection
from dotenv import load_dotenv

load_dotenv()

BATCH_SIZE = 100

device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Using device: {device}")
model = SentenceTransformer("BAAI/bge-large-en-v1.5", device=device)


def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return embeddings.tolist()


def reembed_legal_docs():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM legal_docs;")
    total = cursor.fetchone()[0]
    print(f"Total rows to re-embed: {total}")

    cursor.execute("SELECT id, content FROM legal_docs ORDER BY id;")
    rows = cursor.fetchall()

    start_offset = 0  # Change to resume if interrupted
    if start_offset > 0:
        rows = rows[start_offset:]
        print(f"Resuming from row {start_offset}, {len(rows)} rows remaining...")

    updated = 0
    failed_ids = []
    script_start = time.time()

    for batch_start in range(0, len(rows), BATCH_SIZE):
        batch = rows[batch_start: batch_start + BATCH_SIZE]
        ids = [r[0] for r in batch]
        texts = [r[1] for r in batch]

        t0 = time.time()
        try:
            embeddings = get_embeddings_batch(texts)
        except Exception as e:
            print(f"  ❌ Embedding failed for batch {batch_start}-{batch_start + len(batch)}: {e}")
            failed_ids.extend(ids)
            continue
        embed_time = time.time() - t0

        update_cursor = conn.cursor()
        t1 = time.time()
        try:
            records = [
                (row_id, "[" + ",".join(str(v) for v in embedding) + "]")
                for row_id, embedding in zip(ids, embeddings)
            ]
            execute_values(
                update_cursor,
                """
                UPDATE legal_docs SET embedding = data.emb::vector
                FROM (VALUES %s) AS data(id, emb)
                WHERE legal_docs.id = data.id::bigint;
                """,
                records
            )
            conn.commit()
            updated += len(batch)
            db_time = time.time() - t1

            elapsed = time.time() - script_start
            rows_done = start_offset + updated
            rate = updated / elapsed if elapsed > 0 else 0
            eta_min = (total - rows_done) / rate / 60 if rate > 0 else 0

            print(f"  ✓ {rows_done}/{total} | embed: {embed_time:.1f}s  db: {db_time:.1f}s  elapsed: {elapsed:.0f}s | ETA: {eta_min:.1f} min")
        except Exception as e:
            conn.rollback()
            print(f"  ❌ DB update failed for batch at {batch_start}: {e}")
            failed_ids.extend(ids)
        finally:
            update_cursor.close()

    total_time = time.time() - script_start
    print(f"\nDone: {start_offset + updated}/{total} rows in {total_time:.1f}s ({total_time/60:.1f} min)")
    if failed_ids:
        print(f"Failed IDs ({len(failed_ids)}): {failed_ids}")

    # Recreate IVFFLAT index
    print("\nRecreating IVFFLAT index...")
    try:
        cursor.execute("""
            CREATE INDEX idx_legal_docs_embedding
            ON legal_docs
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        """)
        conn.commit()
        print("✓ Index recreated successfully")
    except Exception as e:
        print(f"❌ Index creation failed: {e}")
        print("  Run manually in Supabase:")
        print("  CREATE INDEX idx_legal_docs_embedding ON legal_docs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    reembed_legal_docs()
