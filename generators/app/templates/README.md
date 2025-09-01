
# Demo API Petstore con NestJS

Este proyecto fue generado con **Yeoman** y el generador de APIs a partir de Swagger, consumiendo el API `pet-api-swagger-example`. Los endpoints del recurso `/pet` fueron generados automáticamente a partir del Swagger Petstore y reflejan exactamente la especificación original. El resto de la lógica y controladores (`http-client`, `oauth`, `redis`, `userDb`) fueron implementados para demostrar integración, resiliencia y buenas prácticas en NestJS.

**Funcionalidades principales:**
- Generación automática de endpoints REST a partir de Swagger (`pet-api-swagger-example`).
- Orquestación y composición de llamadas HTTP resilientes usando la librería `ads-commons-httpclient-nodejs-lib`.
- Integración con OAuth2, Redis y MySQL.
- Control de errores y logging avanzado (New Relic, OpenTelemetry, Winston).
- Pruebas unitarias y de estrés.
- Configuración flexible por variables de entorno y docker-compose.


## **1. Instalación previa del proyecto**

**Herramientas necesarias:**
- Node.js >= 18.x
- npm >= 9.x
- Docker y Docker Compose (para servicios MySQL y Redis)

Instala las dependencias del proyecto:
```bash
npm install
```

## **2. Configuración requerida**

El proyecto puede ejecutarse en ambiente local o conectado a servicios externos.


### Para ambiente local

1. Levanta los servicios de base de datos y cache con Docker Compose:
	```bash
	docker-compose up -d
	```
	Esto iniciará dos contenedores:
	- **MySQL 8**: Base de datos relacional, expuesta en el puerto 3306. Se usará para persistencia de datos del demo.
	- **Redis 6.2-alpine**: Motor de cache en memoria, expuesto en el puerto 6379. Se usará para almacenamiento temporal y aceleración de consultas.

	Puedes revisar o modificar las versiones en el archivo `docker-compose.yml` según tus necesidades.

2. Variables de entorno principales (puedes usar un archivo `.env`):
	```env
	MYSQL_HOST=localhost
	MYSQL_PORT=3306
	MYSQL_USER=root
	MYSQL_PASSWORD=rootpassword
	MYSQL_DATABASE=express_db
	REDIS_HOST=localhost
	REDIS_PORT=6379
	CLOUD=AZURE
	# ...ver sección dependencias externas para más variables
	```


### Para ambiente con dependencias externas

Para integración con servicios de nube, monitoreo y seguridad, configura las siguientes variables de entorno (ejemplo para Azure):

```env
CLOUD=AZURE
AZURE_CLIENT_ID=<tu_client_id>
AZURE_CLIENT_SECRET=<tu_client_secret>
AZURE_TENANT_ID=<tu_tenant_id>
AZURE_KEYVAULT_URL=<tu_keyvault_url>
AZURE_APPCONF_CONNSTRING=<tu_appconf_connstring>
AZURE_APPCONF_KEYFILTER=interbank.ads.observability
AZURE_APPCONF_LABELFILTER=
NEW_RELIC_SERVICE_NAME=<nombre_servicio>
NEW_RELIC_APP_NAME=<nombre_app>
NEW_RELIC_LICENSE_KEY=<tu_license_key>
```

> **Nota:** No compartas valores sensibles. Consulta la documentación de Azure y New Relic para obtener tus credenciales.

**Dependencias externas soportadas:**
- Azure Key Vault, App Configuration, Identity
- New Relic (logs, monitoreo)
- OpenTelemetry


## **3. Ejecución de proyecto**

Compila y ejecuta el proyecto en modo desarrollo:
```bash
npm run start:dev
```

Para producción:
```bash
npm run build
npm run start:prod
```

Levantar servicios externos:
```bash
docker-compose up -d
```

Otros comandos útiles:
- Ejecutar pruebas unitarias:
	```bash
	npm run test
	```
- Ejecutar pruebas en modo watch:
	```bash
	npm run test:watch
	```
- Ejecutar pruebas de cobertura:
	```bash
	npm run test:cov
	```
- Ejecutar pruebas de estrés:
	```bash
	npm run stress
	```
- Formatear código:
	```bash
	npm run format
	```
- Lint automático:
	```bash
	npm run lint
	```


## **4. Servicios disponibles**

### Endpoints generados automáticamente (`/pet`)
Los endpoints bajo `/pet` fueron generados a partir del Swagger Petstore (`pet-api-swagger-example`).
Incluyen:
- addPet
- deletePet
- findPetsByStatus
- findPetsByTags
- getPetById
- updatePet
- updatePetWithForm
- uploadFile

> **Nota:** Estos endpoints reflejan la definición Swagger y pueden requerir ajustes para funcionar en este demo.

### Endpoints implementados y funcionales


#### Orquestación HTTP (`/http-client`)

El controller `http-client` es el núcleo de la resiliencia y orquestación en este proyecto. Utiliza la librería `ads-commons-httpclient-nodejs-lib` para realizar llamadas HTTP con circuit breaker, manejo de errores y configuración avanzada.

**¿Qué hace el endpoint `/http-client/rest`?**
- Orquesta varias llamadas HTTP en secuencia y en paralelo.
- Realiza un GET para obtener un UUID, luego usa ese UUID en otra llamada GET, y finalmente ejecuta dos POST en paralelo agregando los resultados.
- Si alguna llamada falla, captura el error y lo reporta en la respuesta.

**Ejemplo de respuesta:**
```json
{
	"success": true,
	"data": {
		"uuid": "b7e6...",
		"get": { ... },
		"post1": { ... },
		"post2": { ... }
	},
	"meta": {
		"orchestrated": true,
		"composed": true,
		"aggregated": true
	},
	"errors": []
}
```

**Probar orquestación resiliente:**
```bash
curl -X GET 'http://localhost:3000/http-client/rest'
```

**Endpoint para orquestación customizada (POST):**
Permite enviar una lista de endpoints a consumir en paralelo, cada uno con su método y datos.
```bash
curl -X POST 'http://localhost:3000/http-client/custom' \
	-H 'Content-Type: application/json' \
	-d '{
		"endpoints": [
			{ "url": "https://httpbin.org/get", "method": "get", "key": "get1" },
			{ "url": "https://httpbin.org/post", "method": "post", "data": { "foo": "bar" }, "key": "post1" }
		]
	}'
```

**Endpoint con configuración custom de resiliencia:**
El endpoint `/http-client/custom-circuit` permite probar la resiliencia con parámetros personalizados de circuit breaker (timeout, porcentaje de error, volumen, etc.).
```bash
curl -X GET 'http://localhost:3000/http-client/custom-circuit'
```

**¿Cómo funciona la resiliencia?**
- El controller crea una instancia de `HttpClient` con configuración custom:
	```js
	const customCircuitBreakerConfig = {
		timeout: 2000,
		errorThresholdPercentage: 40,
		resetTimeout: 3000,
		rollingCountTimeout: 10000,
		rollingCountBuckets: 10,
		volumeThreshold: 2
	};
	const customHttpClient = new HttpClient({ circuitBreaker: customCircuitBreakerConfig });
	```
- Si el endpoint externo falla repetidamente, el circuit breaker abre y las siguientes llamadas se bloquean temporalmente, evitando sobrecarga y permitiendo recuperación.

**Ventajas:**
- Evita caídas por servicios externos lentos o inestables.
- Permite probar diferentes estrategias de resiliencia y configuración.
- Reporta errores y tiempos en la respuesta para monitoreo.

#### OAuth2 (`/oauth`)
- **Obtener token:**
	```bash
	curl -X GET 'http://localhost:3000/oauth/token'
	```
- **Consumir API externa autenticada:**
	```bash
	curl -X GET 'http://localhost:3000/oauth/test-api-call'
	```
- **Consumir API externa con circuit breaker:**
	```bash
	curl -X GET 'http://localhost:3000/oauth/test-api-call-with-circuit'
	```

#### Redis (`/redis`)
- **Listar claves:**
	```bash
	curl -X GET 'http://localhost:3000/redis/keys'
	```

#### UserDb (`/usersDb`)
- **Crear registro:**
	```bash
	curl -X POST 'http://localhost:3000/usersDb' -H 'Content-Type: application/json' -d '{"name":"Firulais"}'
	```
- **Listar registros:**
	```bash
	curl -X GET 'http://localhost:3000/usersDb'
	```


## **5. Documentación complementaria**

- [NestJS](https://docs.nestjs.com/)
- [Yeoman](https://yeoman.io/)
- [Swagger/OpenAPI Petstore](https://github.com/swagger-api/swagger-petstore)
- [ads-commons-httpclient-nodejs-lib](https://www.npmjs.com/package/ads-commons-httpclient-nodejs-lib)
- [ioredis (cliente Redis)](https://github.com/luin/ioredis)
- [Artillery (pruebas de carga)](https://artillery.io/docs/)
- [New Relic](https://docs.newrelic.com/docs/logs/enable-logs/enable-logs/)
- [OpenTelemetry](https://opentelemetry.io/docs/instrumentation/js/)

Para dudas adicionales, revisa los comentarios en el código fuente o contacta al autor del demo.
