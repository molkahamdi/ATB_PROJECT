FROM node:20-alpine AS builder
WORKDIR /app 
COPY package*.json ./
RUN npm ci 'signifie que les dépendances du projet sont installées en utilisant 
les fichiers package.json et package-lock.json, ce qui garantit que 
les versions exactes des dépendances sont utilisées.'
COPY . . 'signifie que tous les fichiers du projet sont copiés dans le conteneur,
 ce qui est nécessaire pour construire lapplication.'
RUN npm run build 

FROM node:20-alpine AS production 'signifie que nous utilisons une image de base Node.js 
légère pour exécuter lapplication en production, c
e qui permet de réduire la taille de limage finale et doptimiser les performances.'
WORKDIR /app 'signifie que nous définissons le répertoire de travail dans le conteneur,
 ce qui facilite la gestion des fichiers et lexécution des commandes.'
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
