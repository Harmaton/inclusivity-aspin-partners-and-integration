import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

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

  // ✅ Create the document FIRST
  const document = SwaggerModule.createDocument(app, config);

  // ✅ Set up Swagger UI
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'json',
    useGlobalPrefix: true,
  });

  // ✅ Write the ACTUAL document (not the function)
  fs.writeFileSync('./openapi-spec.json', JSON.stringify(document, null, 2));

  console.log('✅ OpenAPI spec exported to ./openapi-spec.json');

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Server running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
