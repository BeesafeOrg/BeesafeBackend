import * as admin from 'firebase-admin';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FcmService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    if (!admin.apps.length) {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>(
        'FIREBASE_CLIENT_EMAIL',
      );
      const privateKey = this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  }

  async sendToDevice(token: string, title: string, body: string) {
    return admin.messaging().send({
      token,
      notification: {
        title,
        body,
      },
    });
  }

  async sendToTopic(topic: string, title: string, body: string) {
    return admin.messaging().send({
      topic,
      notification: {
        title,
        body,
      },
    });
  }

  async subscribeToTopic(tokens: string[], topic: string) {
    return admin.messaging().subscribeToTopic(tokens, topic);
  }

  async unsubscribeFromTopic(tokens: string[], topic: string) {
    return admin.messaging().unsubscribeFromTopic(tokens, topic);
  }
}
