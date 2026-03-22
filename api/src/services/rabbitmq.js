import amqplib from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const RABBITMQ_URL      = process.env.RABBITMQ_URL      || 'amqp://guest:guest@localhost:5672';
const RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'ci.events';
const RABBITMQ_QUEUE    = 'pipeline.raw';
const ROUTING_KEY       = process.env.RABBITMQ_ROUTING_KEY || 'pipeline.ingest';

let channel     = null;
let connection  = null;
export let mqAvailable = false;

async function connect() {
  try {
    connection = await amqplib.connect(RABBITMQ_URL);
    channel    = await connection.createChannel();

    await channel.assertExchange(RABBITMQ_EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(RABBITMQ_QUEUE, { durable: true });
    await channel.bindQueue(RABBITMQ_QUEUE, RABBITMQ_EXCHANGE, ROUTING_KEY);

    mqAvailable = true;
    console.log('[MQ] Connected to RabbitMQ, exchange:', RABBITMQ_EXCHANGE);

    connection.on('error', (err) => {
      console.warn('[MQ] Connection error:', err.message);
      mqAvailable = false;
      scheduleReconnect();
    });

    connection.on('close', () => {
      console.warn('[MQ] Connection closed, will reconnect...');
      mqAvailable = false;
      scheduleReconnect();
    });
  } catch (err) {
    console.warn('[MQ] Could not connect to RabbitMQ:', err.message);
    console.warn('[MQ] API will continue without message queue support.');
    mqAvailable = false;
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  setTimeout(() => {
    console.log('[MQ] Attempting reconnect...');
    connect();
  }, 10000);
}

export async function publish(routingKey, message) {
  if (!mqAvailable || !channel) {
    return false;
  }
  try {
    const payload = Buffer.from(JSON.stringify(message));
    channel.publish(RABBITMQ_EXCHANGE, routingKey, payload, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Math.floor(Date.now() / 1000),
    });
    return true;
  } catch (err) {
    console.warn('[MQ] Publish error:', err.message);
    mqAvailable = false;
    return false;
  }
}

export { connect };
