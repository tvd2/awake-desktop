FROM node:22-alpine

WORKDIR /app
COPY index.html styles.css script.js dashboard.js server.js ./
RUN chmod 0644 /app/index.html /app/styles.css /app/script.js /app/dashboard.js /app/server.js

EXPOSE 80
CMD ["node", "server.js"]
