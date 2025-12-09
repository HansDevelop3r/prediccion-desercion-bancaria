# 🏦 Sistema de Predicción de Deserción de Clientes Bancarios

Sistema completo de Machine Learning para predecir la deserción de clientes bancarios utilizando **XGBoost**, **Angular** y **Node.js**.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Modelo de Machine Learning](#modelo-de-machine-learning)
- [API Endpoints](#api-endpoints)
- [Contribución](#contribución)

---

## ✨ Características

- ✅ **Predicción de Deserción** con modelo XGBoost entrenado con datos reales
- ✅ **Entrenamiento Personalizado** - Sube tu propio CSV y entrena el modelo
- ✅ **Predicción Individual** - Predice deserción para un cliente específico
- ✅ **Predicción Masiva** - Procesa archivos CSV completos
- ✅ **Feature Importance** - Visualiza qué variables son más importantes
- ✅ **Métricas Completas** - Accuracy, Precision, Recall, F1-Score, ROC-AUC
- ✅ **Historial de Predicciones** - Guarda todas las predicciones realizadas
- ✅ **Gestión de Usuarios** - Sistema de autenticación con JWT
- ✅ **Dashboard Intuitivo** - Interfaz moderna con Angular

---

## 🛠️ Tecnologías

### Frontend
- **Angular 15+** - Framework web
- **TypeScript** - Lenguaje tipado
- **RxJS** - Programación reactiva
- **CSS3** - Estilos personalizados

### Backend
- **Node.js 18+** - Servidor backend
- **Express.js** - Framework web
- **MySQL 8** - Base de datos
- **JWT** - Autenticación
- **Multer** - Manejo de archivos

### Machine Learning
- **Python 3.9+** - Lenguaje de ML
- **XGBoost** - Algoritmo de predicción
- **scikit-learn** - Preprocesamiento y métricas
- **pandas** - Manipulación de datos
- **NumPy** - Operaciones numéricas

---

## 📦 Requisitos Previos

Asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (v18 o superior)
- [Python](https://www.python.org/) (v3.9 o superior)
- [MySQL](https://www.mysql.com/) (v8 o superior)
- [Angular CLI](https://angular.io/cli) (opcional, para desarrollo)

---

## 🚀 Instalación

### 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/TU_USUARIO/prediccion-desercion-bancaria.git
cd prediccion-desercion-bancaria
```

### 2️⃣ Instalar Dependencias del Backend

```bash
cd my-angular-app/backend
npm install
```

### 3️⃣ Instalar Dependencias de Python

```bash
pip install -r backend/ml_scripts/requirements.txt
```

### 4️⃣ Instalar Dependencias del Frontend

```bash
cd ..
npm install
```

---

## ⚙️ Configuración

### 1️⃣ Base de Datos MySQL

1. Crea la base de datos:
```sql
CREATE DATABASE my_angular_app_db;
```

2. Ejecuta los scripts SQL:
```bash
mysql -u root -p my_angular_app_db < Mysql/setup_database.sql
mysql -u root -p my_angular_app_db < Mysql/my_angular_app_db_usuarios.sql
mysql -u root -p my_angular_app_db < Mysql/my_angular_app_db_modelo_ml_estado.sql
mysql -u root -p my_angular_app_db < Mysql/my_angular_app_db_predicciones_ml.sql
mysql -u root -p my_angular_app_db < Mysql/my_angular_app_db_archivos_cargados.sql
```

### 2️⃣ Configurar Variables de Entorno

Crea un archivo `.env` en `backend/`:

```env
# Backend Configuration
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=my_angular_app_db
DB_PORT=3306

# JWT
JWT_SECRET=tu_clave_secreta_muy_segura_aqui
JWT_EXPIRES_IN=24h

# ML Models
ML_MODELS_PATH=./ml_models
```

### 3️⃣ Crear Usuario Admin (Primera vez)

```bash
cd backend
node manage-users.js create admin admin@example.com password123
```

---

## 🎮 Uso

### Iniciar el Backend

```bash
cd my-angular-app/backend
node server.js
```

El backend estará corriendo en `http://localhost:3000`

### Iniciar el Frontend

```bash
cd my-angular-app
npm start
# o
ng serve
```

El frontend estará corriendo en `http://localhost:4200`

### Acceder a la Aplicación

1. Abre tu navegador en `http://localhost:4200`
2. Inicia sesión con:
   - **Usuario:** admin
   - **Password:** password123
3. Ve a la sección **"Predicción ML"**

---

## 📁 Estructura del Proyecto

```
PI1/
├── my-angular-app/
│   ├── backend/
│   │   ├── ml_scripts/
│   │   │   ├── xgboost_churn.py       # Script principal de ML
│   │   │   ├── calculate_metrics.py    # Cálculo de métricas
│   │   │   ├── requirements.txt        # Dependencias Python
│   │   │   └── ml_models/             # Modelos entrenados
│   │   ├── uploads/                   # CSVs cargados
│   │   ├── logs/                      # Logs del sistema
│   │   ├── server.js                  # Servidor Express
│   │   ├── database.js                # Conexión MySQL
│   │   ├── ml_service.js              # Servicio de ML
│   │   └── package.json               # Dependencias Node
│   ├── src/
│   │   ├── app/
│   │   │   ├── ml-prediction/         # Componente de predicción
│   │   │   ├── login/                 # Componente de login
│   │   │   ├── usuarios/              # Gestión de usuarios
│   │   │   ├── ml.service.ts          # Servicio de ML
│   │   │   └── auth.service.ts        # Servicio de autenticación
│   │   └── environments/              # Configuración de entornos
│   ├── angular.json
│   └── package.json
├── DataSet/
│   └── clientes_fuga_test_con_fuga.csv
├── Mysql/
│   └── *.sql                          # Scripts de base de datos
└── README.md
```

---

## 🤖 Modelo de Machine Learning

### Variables de Entrada

El modelo utiliza las siguientes **9 variables** para predecir deserción:

1. **edad** - Edad del cliente (18-100)
2. **sexo** - M/F
3. **estado_civil** - Soltero(S)/Casado(C)/Divorciado(D)/Viudo(V)
4. **nacionalidad** - PE/CO/VE/AR/UR
5. **nivel_educativo** - Ninguno(NIN)/Técnico(TEC)/Universitario(UNI)
6. **ingresos_mensuales** - Ingresos en moneda local
7. **ocupacion** - Empleado(EMP)/Desempleado(DESEMP)
8. **nivel_riesgo_crediticio** - Riesgo Alto(RA)/Medio(RM)/Bajo(RB)/Muy Bajo(RMB)
9. **tarjeta_credito** - Sí(S)/No(N)

### Variable Objetivo

- **fuga** - 0 (No deserta) / 1 (Deserta)

### Métricas del Modelo

Con el dataset de prueba:
- **Accuracy:** 85-95%
- **Precision:** 63-92%
- **Recall:** 5-88%
- **F1-Score:** 9-90%
- **ROC-AUC:** 69-94%

### Feature Importance (Top 5)

1. **Nivel de Riesgo Crediticio:** ~20-30%
2. **Ingresos Mensuales:** ~13-17%
3. **Sexo:** ~8-12%
4. **Nacionalidad:** ~7-12%
5. **Tarjeta de Crédito:** ~8-12%

---

## 🔌 API Endpoints

### Autenticación

```http
POST /api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

### Machine Learning

```http
# Entrenar Modelo
POST /api/ml/train
Authorization: Bearer <token>
Content-Type: multipart/form-data

csvFile: <archivo.csv>

---

# Predicción Individual
POST /api/ml/predict
Authorization: Bearer <token>
Content-Type: application/json

{
  "edad": 35,
  "sexo": "M",
  "estado_civil": "C",
  ...
}

---

# Estado del Modelo
GET /api/ml/model/status
Authorization: Bearer <token>

---

# Historial de Predicciones
GET /api/ml/predictions/history
Authorization: Bearer <token>
```

---

## 📊 Formato del CSV

El archivo CSV debe tener esta estructura:

```csv
ClienteID,edad,sexo,estado_civil,nacionalidad,nivel_educativo,ingresos_mensuales,ocupacion,nivel_riesgo_crediticio,tarjeta_credito,fuga
1,31,M,D,CO,UNI,3933,EMP,RB,N,0
2,51,F,D,VE,TEC,13005,EMP,RMB,S,0
3,25,F,D,VE,TEC,2081,EMP,RB,S,0
```

---

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

## 👥 Autores

- **Tu Nombre** - *Desarrollo Completo* - [TuGitHub](https://github.com/TU_USUARIO)

---

## 🙏 Agradecimientos

- Universidad Peruana de Ciencias Aplicadas (UPC)
- MiBanco Perú (Dataset de referencia)
- Comunidad de XGBoost y scikit-learn

---

## 📞 Contacto

- **Email:** tu_email@example.com
- **LinkedIn:** [Tu Perfil](https://linkedin.com/in/tu-perfil)
- **GitHub:** [Tu GitHub](https://github.com/TU_USUARIO)

---

⭐ **Si este proyecto te fue útil, considera darle una estrella!**
