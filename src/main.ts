import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('/api');
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Aspin Partners and Integrations API Documentation')
    .setDescription('The Aspin Partners and Integrations API description')
    .setVersion('1.0')
    .addTag('swagger', 'Swagger Documentation')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: 'json',
    useGlobalPrefix: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
