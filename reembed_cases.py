"""
Re-embeds all rows in cases table using gemini-embedding-001.
Run once after dropping the idx_cases_embedding index.
Recreates the index at the end.
"""
import os
import time
from google import genai
from google.genai import types
from psycopg2.extras import execute_values
from db import get_db_connection
from dotenv import load_dotenv

load_dotenv()

BATCH_SIZE = 100
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 768
ROW_LIMIT = 1000  # Set to None to process all rows

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))


def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM),
    )
    return [e.values for e in result.embeddings]


def reembed_cases():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM cases;")
    total = cursor.fetchone()[0]
    print(f"Total rows in table: {total}")

    cursor.execute("SELECT id, content FROM cases ORDER BY id;")
    rows = cursor.fetchall()

    start_offset = 0  # Change to resume from a specific row if interrupted
    if start_offset > 0:
        rows = rows[start_offset:]
        print(f"Resuming from row {start_offset}...")

    if ROW_LIMIT is not None:
        rows = rows[:ROW_LIMIT]
        print(f"Processing first {len(rows)} rows (ROW_LIMIT={ROW_LIMIT})")

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
            time.sleep(5)
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
                UPDATE cases SET embedding = data.emb::vector
                FROM (VALUES %s) AS data(id, emb)
                WHERE cases.id = data.id::bigint;
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

            print(f"  ✓ {rows_done}/{total} | embed: {embed_time:.1f}s  db: {db_time:.1f}s  elapsed: {elapsed:.0f}s | ETA full table: {eta_min:.1f} min")
        except Exception as e:
            conn.rollback()
            print(f"  ❌ DB update failed for batch starting at {batch_start}: {e}")
            failed_ids.extend(ids)
        finally:
            update_cursor.close()

        time.sleep(0.5)

    total_time = time.time() - script_start
    print(f"\nDone: {start_offset + updated} rows updated in {total_time:.1f}s ({total_time/60:.1f} min)")
    if failed_ids:
        print(f"Failed row IDs ({len(failed_ids)}): {failed_ids}")
        print("Set start_offset to resume from a specific point and rerun.")

    if ROW_LIMIT is not None:
        rate = updated / total_time if total_time > 0 else 0
        print(f"\nProjected time for all {total} rows: {(total / rate / 60):.1f} min" if rate > 0 else "")
        print("To process all rows, set ROW_LIMIT = None and rerun.")
        return

    # Recreate IVFFLAT index
    print("\nRecreating IVFFLAT index...")
    try:
        cursor.execute("""
            CREATE INDEX idx_cases_embedding
            ON cases
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        """)
        conn.commit()
        print("✓ Index recreated successfully")
    except Exception as e:
        print(f"❌ Index creation failed: {e}")
        print("  Run manually in Supabase:")
        print("  CREATE INDEX idx_cases_embedding ON cases USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    reembed_cases()
