import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { AuthService } from "./modules/auth.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true
  });
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ],
    credentials: true
  });
  await app.get(AuthService).ensureBootstrapUser();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api`, "Bootstrap");
}

bootstrap();
