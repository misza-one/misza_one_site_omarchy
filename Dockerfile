# misza.one omarchy terminal site - static file server
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html /usr/share/nginx/html/
COPY favicon.png /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
