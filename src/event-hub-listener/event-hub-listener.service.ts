import { Injectable } from '@nestjs/common';
import {
  EventHubConsumerClient,
  SubscriptionEventHandlers,
} from '@azure/event-hubs';
import { ServiceBusClient } from '@azure/service-bus';
import { Data } from 'src/models/data.model';

@Injectable()
export class EventHubListenerService {
  connectionStringReceiver =
    process.env.EVENTHUB_CONNECTION_STRING_RECEIVER || '';
  eventHubName = process.env.EVENTHUB_NAME || '';
  consumerGroup = process.env.CONSUMER_GROUP_NAME;
  async subscribeToEvents() {
    console.log(`Listening to Event Hub ${this.eventHubName}`);
    const consumerClient = new EventHubConsumerClient(
      this.consumerGroup,
      this.connectionStringReceiver,
      this.eventHubName,
    );

    const subscriptionOptions: SubscriptionEventHandlers = {
      processEvents: async (events) => {
        for (const event of events) {
          console.log('Event-Hub / Received event:', event.body);
          if (event.body.id != undefined && event.body.message != undefined)
            await this.processEvent(event.body);
        }
      },
      processError: async (err) => {
        // Handle errors
        console.error('Error occurred:', err);
      },
    };

    const subscription = consumerClient.subscribe(subscriptionOptions);
    subscription.close;
  }

  determineQueueName(eventBody: Data): { name: string; key: string } {
    if (eventBody.id < 5) {
      return {
        name: 'first-queue',
        key: process.env.CONNECTION_STRING_FIRST_QUEUE_SENDER,
      };
    } else {
      return {
        name: 'second-queue',
        key: process.env.CONNECTION_STRING_SECOND_QUEUE_SENDER,
      };
    }
  }
  async processEvent(eventBody: Data) {
    const queue = this.determineQueueName(eventBody);
    const serviceBusClient = new ServiceBusClient(queue.key);
    const sender = serviceBusClient.createSender(queue.name);

    await sender.sendMessages({
      body: eventBody,
    });

    await sender.close();
    await serviceBusClient.close();
  }
}
