import { Injectable } from '@nestjs/common';
import { ServiceBusClient } from '@azure/service-bus';
import { MessageModel } from '../models/message.model';

@Injectable()
export class ServiceBusListenerService {
  firstQueueName = 'first-queue-name';
  secondQueueName = 'second-queue-name';
  queues = [
    {
      name: this.firstQueueName,
      key: process.env.CONNECTION_STRING_FIRST_QUEUE_RECEIVER || '',
    },
    {
      name: this.secondQueueName,
      key: process.env.CONNECTION_STRING_SECOND_QUEUE_RECEIVER || '',
    },
  ];
  async startListening() {
    this.queues.forEach(function (queue) {
      const serviceBusClient = new ServiceBusClient(queue.key);
      const receiver = serviceBusClient.createReceiver(queue.name, {
        receiveMode: 'peekLock',
      });

      console.log(`queue is: ${queue.name}`);

      const onMessageHandler = async (message) => {
        try {
          console.log(
            `Service-Bus / Queue: ${queue.name} / 
            Received message: ${message.body}`,
          );

          await receiver.completeMessage(message);

          await MessageModel.create({
            queueName: queue.name,
            message: message.body.message,
          });
        } catch (error) {
          console.error('Error message:', error);
        }
      };

      receiver.subscribe({
        processMessage: onMessageHandler,
        processError: function (): never {
          throw new Error('Function not implemented.');
        },
      });
    });
  }
}
