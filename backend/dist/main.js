"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use(require('express').json({ limit: '10mb' }));
    app.use(require('express').urlencoded({ limit: '10mb', extended: true }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
    }));
    app.enableCors({
        origin: ['http://localhost:5173', 'http://localhost:3001'],
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });
    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    console.log(` Backend ATB démarré sur : http://localhost:${port}`);
    console.log(` Endpoints : http://localhost:${port}/customer`);
}
bootstrap();
//# sourceMappingURL=main.js.map