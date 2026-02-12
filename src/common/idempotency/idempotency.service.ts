// import { Inject, Injectable } from '@nestjs/common';
// import Redis from 'ioredis';
//
// @Injectable()
// export class IdempotencyService {
//   constructor(@Inject('REDIS') private redis: Redis) {}
//
//   async checkInProgress(key: string): Promise<{ response: any } | null> {
//     const result = await this.redis.get(`idemp:${key}`);
//     return result ? JSON.parse(result) : null;
//   }
//
//   async markInProgress(key: string, metadata: any): Promise<boolean> {
//     // ATOMIC: Set only if key doesn't exist (NX) + expire after 30s (EX)
//     return (
//       (await this.redis.set(
//       `idemp:${key}`,
//       JSON.stringify({ status: 'in_progress', ...metadata }),
//       'NX', // Not eXists - prevents race conditions
//       'EX', // EXpire
//       30 // seconds
//     )) === 'OK';
//   }
//
//   async markCompleted(key: string, response: any): Promise<void> {
//     await this.redis.setex(
//       `idemp:${key}`,
//       86400, // 24h TTL
//       JSON.stringify({ status: 'completed', response })
//     );
//   }
// }
