# Demo Spring Boot with Amazon Aurora

Este proyecto demuestra cómo conectar una aplicación Spring Boot con Amazon Aurora MySQL.

## Configuración de Amazon Aurora

### 1. Crear el cluster Aurora
1. Accede a AWS RDS Console
2. Crea un nuevo cluster Aurora MySQL
3. Anota el endpoint del cluster
4. Configura los parámetros de seguridad (VPC, Security Groups)

### 2. Configurar las credenciales
Actualiza el archivo `application.properties` o usa variables de entorno:

```properties
spring.datasource.url=jdbc:mysql://your-aurora-cluster-endpoint:3306/your-database-name
spring.datasource.username=your-username
spring.datasource.password=your-password
```

### 3. Variables de entorno (Recomendado para producción)
```bash
export AURORA_ENDPOINT=your-aurora-cluster-endpoint
export AURORA_PORT=3306
export AURORA_DATABASE=your-database-name
export AURORA_USERNAME=your-username
export AURORA_PASSWORD=your-password
```

## Construcción y Ejecución

### Compilar el proyecto
```bash
./gradlew build
```

### Ejecutar la aplicación
```bash
# Ambiente de desarrollo
./gradlew bootRun --args='--spring.profiles.active=dev'

# Ambiente de producción
./gradlew bootRun --args='--spring.profiles.active=prod'
```

## Endpoints disponibles

### Test de conexión
- `GET /api/test-connection` - Verifica la conexión con Aurora

### CRUD de usuarios
- `POST /api/users` - Crear usuario
- `GET /api/users` - Listar todos los usuarios
- `GET /api/users/{id}` - Obtener usuario por ID
- `GET /api/users/email/{email}` - Obtener usuario por email
- `GET /api/users/search?name={name}` - Buscar usuarios por nombre
- `PUT /api/users/{id}` - Actualizar usuario
- `DELETE /api/users/{id}` - Eliminar usuario

### Ejemplo de uso

```bash
# Test de conexión
curl http://localhost:8080/api/test-connection

# Crear usuario
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Juan Pérez","email":"juan@example.com"}'

# Listar usuarios
curl http://localhost:8080/api/users
```

## Configuración de seguridad

### Security Groups
Asegúrate de que el Security Group de Aurora permita conexiones desde tu aplicación:
- Puerto: 3306
- Protocolo: TCP
- Origen: Security Group de la aplicación o IP específica

### SSL/TLS
La conexión está configurada para usar SSL por defecto. Para desarrollo local, puedes modificar la URL:
```properties
spring.datasource.url=jdbc:mysql://your-aurora-endpoint:3306/your-database?useSSL=false
```

## Optimizaciones para Aurora

### Connection Pooling
El proyecto usa HikariCP con configuraciones optimizadas para Aurora:
- Pool máximo: 20 conexiones (dev), 50 (prod)
- Timeout de conexión: 20-30 segundos
- Validación de conexiones activa

### Failover automático
Aurora maneja automáticamente el failover entre instancias. La aplicación se reconectará automáticamente.

## Monitoreo

### Health Check
Spring Boot Actuator (si se agrega) proporcionará endpoints de salud que incluyen el estado de la base de datos.

### Logs
Los logs de SQL están habilitados en desarrollo y deshabilitados en producción para optimizar rendimiento.
