import * as admin from 'firebase-admin';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type FCMTopicResult = {
  topic: string;
  successCount: number;
  failureCount: number;
  errors: admin.FirebaseArrayIndexError[];
};

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

  async sendToDevice(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    return admin.messaging().send({
      token,
      notification: { title, body },
      data,
    });
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    return admin.messaging().send({
      topic,
      notification: { title, body },
      data,
    });
  }

  async subscribeToTopic(tokens: string[], topics: string[]) {
    const results: FCMTopicResult[] = [];
    for (const topic of topics) {
      const res = await admin.messaging().subscribeToTopic(tokens, topic);
      results.push({ topic, ...res });
    }
    return results;
  }

  async unsubscribeFromTopic(tokens: string[], topics: string[]) {
    const results: FCMTopicResult[] = [];
    for (const topic of topics) {
      const res = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      results.push({ topic, ...res });
    }
    return results;
  }
}
