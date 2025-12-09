#!/bin/bash

# Script para probar conexión a Aurora
# Reemplaza estos valores con los datos reales de tu cluster

AURORA_ENDPOINT="demo-aurora-cluster.cluster-xyz123.us-east-1.rds.amazonaws.com"
AURORA_PORT="3306"
AURORA_DATABASE="demodb"
AURORA_USERNAME="admin"
AURORA_PASSWORD="TuPasswordReal123!"

echo "Probando conexión a Aurora..."
echo "Endpoint: $AURORA_ENDPOINT"
echo "Puerto: $AURORA_PORT"
echo "Base de datos: $AURORA_DATABASE"
echo "Usuario: $AURORA_USERNAME"

# Si tienes mysql client instalado, descomenta la siguiente línea:
# mysql -h $AURORA_ENDPOINT -P $AURORA_PORT -u $AURORA_USERNAME -p$AURORA_PASSWORD $AURORA_DATABASE -e "SELECT 1 as test_connection;"

echo "Si no tienes mysql client, usa la aplicación Spring Boot para probar."
echo "Endpoint de prueba: http://localhost:8080/api/test-connection"
