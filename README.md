

# ads-microservice-template-nodejs

Generador de microservicios Node.js con NestJS + Fastify + OpenAPI

Este demo genera una estructura profesional de microservicio usando NestJS y Fastify, integrando controladores y DTOs desde un archivo OpenAPI. Está pensado para que cualquier persona, incluso sin experiencia previa, pueda levantar y probar el microservicio localmente.

---



## **1. Instalación previa del proyecto**

> **Nota:** Antes de cualquier paso, asegúrate de tener instalado [Node.js](https://nodejs.org/) (versión 18.x o superior). Puedes descargarlo desde la web oficial. Esto instalará también npm, el gestor de paquetes de Node.js.

Antes de comenzar, asegúrate de tener instalado:
- Node.js 18.x o superior
- npm 9.x o superior
- Docker y Docker Compose (para levantar MySQL y Redis)

### Instalar Yeoman y el generador

Yeoman es una herramienta que permite crear proyectos a partir de plantillas. Si no lo tienes instalado, ejecútalo:
```bash
npm install -g yo
```


Luego instala el generador localmente (en la carpeta del generador):
```bash
npm install
npm link
```
El comando `npm link` crea un enlace simbólico global de tu generador, permitiendo que puedas ejecutarlo con `yo` desde cualquier carpeta de tu sistema, como si fuera un paquete instalado globalmente.

---

## **2. Generar un nuevo microservicio**


Para crear un nuevo microservicio, usa el siguiente comando desde la carpeta donde quieras crear tu proyecto:
```bash
yo generator-ads-microservice-template-nodejs --application=app-demo --service=pet --openapi=C:\Users\Thonny\Documents\Proyectos\node2\generator-node-maven-style\pet-api-controllers-ready.yaml
```

En este repositorio se incluye el archivo de ejemplo `pet-api-controllers-ready.yaml`, que contiene una especificación OpenAPI lista para generar controladores y DTOs del recurso `pet`. Puedes usar este archivo para probar el generador y ver cómo se crean automáticamente los endpoints y modelos en tu microservicio.

**¿Qué significa cada parámetro?**
- `--application`: Nombre de la aplicación principal (por ejemplo, `app-demo11`). Este nombre se usará como prefijo en la carpeta y archivos generados.
- `--service`: Nombre del microservicio (por ejemplo, `pet`). Define el nombre del módulo y los endpoints principales.
- `--openapi`: Ruta local o URL del archivo OpenAPI (por ejemplo, un `.yaml` o `.json`). El generador usará este archivo para crear automáticamente los controladores y DTOs según la especificación.

El generador creará una carpeta con la estructura base, copiará y renombrará archivos según los parámetros, y generará los controladores y DTOs a partir del archivo OpenAPI.

---

---

## **2. Configuración requerida**

El demo puede ejecutarse localmente usando Docker Compose para levantar los servicios necesarios.


### Para ambiente local

1. Configura las variables de entorno (crea un archivo `.env` en la raíz del proyecto antes de levantar los servicios):
   ```env
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=rootpassword
   MYSQL_DATABASE=express_db
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

2. Levanta los servicios de base de datos y cache:
   ```bash
   docker-compose up -d
   ```
   Esto inicia dos contenedores:
   - **MySQL** (puerto 3306): almacena los datos de la app.
   - **Redis** (puerto 6379): cache para acelerar consultas y almacenar datos temporales.

   El archivo `docker-compose.yml` define estos servicios y sus volúmenes persistentes. Puedes modificarlo según tus necesidades.

### Para ambiente con dependencias externas

Si necesitas conectar con servicios externos, consulta la documentación generada del microservicio para ver las variables requeridas.

---

## **3. Ejecución de proyecto**

Para iniciar el proyecto en modo desarrollo:
```bash
npm run start:dev
```
Esto compila y arranca el servidor con recarga automática.

Para producción:
```bash
npm run build
npm run start:prod
```

Otros comandos útiles:
- Pruebas unitarias: `npm run test`
- Pruebas de cobertura: `npm run test:cov`
- Pruebas de estrés: `npm run stress` (usa el archivo `stress-test-users.yml` para simular usuarios concurrentes)
- Lint y formato: `npm run lint`, `npm run format`


### Uso de docker-compose.yml en este proyecto

El archivo `docker-compose.yml` ya está listo para que puedas levantar los servicios de base de datos (MySQL) y cache (Redis) necesarios para el funcionamiento del microservicio. Solo ejecuta:
```bash
docker-compose up -d
```
No necesitas instalar MySQL ni Redis manualmente; ambos servicios estarán disponibles en los puertos estándar y con persistencia de datos.

### Uso de stress-test-users.yml

El archivo `stress-test-users.yml` permite ejecutar una prueba de carga básica sobre el endpoint `/users` usando el comando:
```bash
npm run stress
```
Esto simula usuarios concurrentes accediendo al microservicio para validar que responde correctamente bajo carga.

---

## **4. Servicios disponibles**

El microservicio expone varios endpoints. Aquí algunos ejemplos y cómo probarlos:

- **/users**: CRUD de usuarios en la base de datos.
   - Crear usuario:
      ```bash
      curl -X POST 'http://localhost:3000/users' -H 'Content-Type: application/json' -d '{"name":"Firulais"}'
      ```
   - Listar usuarios:
      ```bash
      curl -X GET 'http://localhost:3000/users'
      ```
- **/redis**: Interacción con Redis.
   - Listar claves:
      ```bash
      curl -X GET 'http://localhost:3000/redis/keys'
      ```
- **/http-client**: Orquestación de llamadas HTTP resilientes.
   - Probar orquestación:
      ```bash
      curl -X GET 'http://localhost:3000/http-client/rest'
      ```

Puedes consultar la colección Bruno o Postman incluida (si aplica) para más ejemplos de uso.

---

## **5. Documentación complementaria**

- [NestJS](https://docs.nestjs.com/)
- [Yeoman](https://yeoman.io/)
- [Swagger/OpenAPI](https://swagger.io/docs/)
- [ads-commons-httpclient-nodejs-lib](https://www.npmjs.com/package/ads-commons-httpclient-nodejs-lib)
- [ioredis](https://github.com/luin/ioredis)
- [Artillery](https://artillery.io/docs/)
- [Docker Compose](https://docs.docker.com/compose/)

---

> Si tienes dudas, revisa los comentarios en el código fuente o contacta al responsable del proyecto. ¡No dudes en experimentar y romper cosas para aprender!
