# ---- Build stage ----
FROM alpine:3.20 AS build

WORKDIR /app
COPY . .

# ---- Production stage ----
FROM nginx:1.27-alpine AS production

# Security: remove default nginx config and static files
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy frontend static files from build stage
COPY --from=build /app /usr/share/nginx/html

# Security: run nginx as non-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
	chown -R nginx:nginx /var/cache/nginx && \
	chown -R nginx:nginx /var/log/nginx && \
	touch /var/run/nginx.pid && \
	chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
