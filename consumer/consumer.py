"""
consumer.py – RabbitMQ pipeline event consumer with reconnection logic.
"""
import json
import logging
import os
import signal
import sys
import time
from urllib.parse import urlparse

import pika
import psycopg2
from dotenv import load_dotenv

from processor import process_message

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("consumer")

DATABASE_URL   = os.environ["DATABASE_URL"]
RABBITMQ_URL   = os.environ.get("RABBITMQ_URL",   "amqp://guest:guest@localhost:5672")
RABBITMQ_QUEUE = os.environ.get("RABBITMQ_QUEUE", "pipeline.raw")
PREFETCH_COUNT = 5
RECONNECT_DELAY = 10  # seconds

stop_requested = False


# ──────────────────────────────────────────────
# Signal handling
# ──────────────────────────────────────────────
def _handle_signal(sig, _frame):
    global stop_requested
    logger.info("Signal %s received – stopping consumer", sig)
    stop_requested = True


signal.signal(signal.SIGTERM, _handle_signal)
signal.signal(signal.SIGINT,  _handle_signal)


# ──────────────────────────────────────────────
# Database
# ──────────────────────────────────────────────
def get_db_connection():
    """Return a new psycopg2 connection parsed from DATABASE_URL."""
    parsed = urlparse(DATABASE_URL)
    conn = psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=parsed.username,
        password=parsed.password,
        dbname=parsed.path.lstrip("/"),
        connect_timeout=10,
    )
    conn.autocommit = False
    return conn


# ──────────────────────────────────────────────
# RabbitMQ helpers
# ──────────────────────────────────────────────
def get_rmq_connection():
    """Return a blocking pika connection parsed from RABBITMQ_URL."""
    params = pika.URLParameters(RABBITMQ_URL)
    params.heartbeat = 60
    params.blocked_connection_timeout = 30
    return pika.BlockingConnection(params)


def make_callback(db_conn_holder: list):
    """
    Returns an on_message callback that uses the DB connection stored in
    db_conn_holder[0] so we can swap it on reconnect.
    """
    def callback(ch, method, _properties, body):
        delivery_tag = method.delivery_tag
        try:
            message = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            logger.error("Invalid JSON payload: %s – nacking (no requeue)", exc)
            ch.basic_nack(delivery_tag=delivery_tag, requeue=False)
            return

        logger.info("Received event_id=%s  status=%s",
                    message.get("event_id", "?"), message.get("status", "?"))

        # Ensure DB connection is alive
        db_conn = db_conn_holder[0]
        try:
            db_conn.cursor().execute("SELECT 1")
        except Exception:
            logger.warning("DB connection lost – reconnecting…")
            try:
                db_conn.close()
            except Exception:
                pass
            db_conn = get_db_connection()
            db_conn_holder[0] = db_conn

        success = process_message(message, db_conn)
        if success:
            ch.basic_ack(delivery_tag=delivery_tag)
        else:
            # Nack without requeue for validation / permanent errors
            ch.basic_nack(delivery_tag=delivery_tag, requeue=False)

    return callback


# ──────────────────────────────────────────────
# Main loop
# ──────────────────────────────────────────────
def run():
    global stop_requested

    db_conn = None
    rmq_conn = None
    channel  = None

    while not stop_requested:
        # ── DB ──────────────────────────────────────────────────────────
        if db_conn is None or db_conn.closed:
            try:
                db_conn = get_db_connection()
                logger.info("Connected to PostgreSQL")
            except Exception as exc:
                logger.error("Cannot connect to PostgreSQL: %s – retry in %ds", exc, RECONNECT_DELAY)
                time.sleep(RECONNECT_DELAY)
                continue

        db_conn_holder = [db_conn]

        # ── RabbitMQ ────────────────────────────────────────────────────
        try:
            rmq_conn = get_rmq_connection()
            channel  = rmq_conn.channel()

            channel.basic_qos(prefetch_count=PREFETCH_COUNT)
            channel.basic_consume(
                queue=RABBITMQ_QUEUE,
                on_message_callback=make_callback(db_conn_holder),
            )

            logger.info("Consumer ready – listening on queue '%s'", RABBITMQ_QUEUE)

            # start_consuming blocks; handle keyboard interrupt for clean stop
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as exc:
            logger.warning("RabbitMQ connection error: %s – retry in %ds", exc, RECONNECT_DELAY)
        except pika.exceptions.ChannelWrongStateError as exc:
            logger.warning("Channel error: %s – reconnecting in %ds", exc, RECONNECT_DELAY)
        except Exception as exc:
            if stop_requested:
                break
            logger.error("Unexpected error: %s – retry in %ds", exc, RECONNECT_DELAY, exc_info=True)
        finally:
            try:
                if channel and channel.is_open:
                    channel.stop_consuming()
            except Exception:
                pass
            try:
                if rmq_conn and rmq_conn.is_open:
                    rmq_conn.close()
            except Exception:
                pass
            channel  = None
            rmq_conn = None

        if not stop_requested:
            time.sleep(RECONNECT_DELAY)

    # Clean shutdown
    try:
        if db_conn and not db_conn.closed:
            db_conn.close()
            logger.info("PostgreSQL connection closed")
    except Exception:
        pass
    logger.info("Consumer stopped")


if __name__ == "__main__":
    run()
