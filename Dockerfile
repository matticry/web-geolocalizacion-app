# Etapa 1: Construir el proyecto Angular en modo desarrollo
FROM node:22 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Instalar explícitamente las librerías de Leaflet
RUN npm install leaflet@1.9.4 leaflet.markercluster@1.5.3 @types/leaflet@1.9.12 @types/leaflet.markercluster@1.5.4 --save --legacy-peer-deps

COPY . .
#RUN npm run build
RUN npm run build --prod

# Etapa 2: Configurar Nginx para servir la aplicación
FROM nginx:alpine
COPY --from=build /app/dist/sakai-ng/browser /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

COPY src/assets/env.template.js  /usr/share/nginx/html/assets/env.template.js

#
EXPOSE 80
EXPOSE 443

CMD ["/bin/sh", "-c", "envsubst < /usr/share/nginx/html/assets/env.template.js > /usr/share/nginx/html/assets/env.js && nginx -g 'daemon off;'"]


#CMD ["/bin/sh", "-c", "\
#envsubst < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp && \
#mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf && \
#envsubst < /usr/share/nginx/html/assets/env.template.js > /usr/share/nginx/html/assets/env.js && \
#nginx -g 'daemon off;'"]

