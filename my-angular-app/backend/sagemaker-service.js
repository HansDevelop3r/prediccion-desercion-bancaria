const AWS = require('aws-sdk');
require('dotenv').config();

class SageMakerService {
  constructor() {
    // Configurar AWS
    AWS.config.update({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    this.sagemaker = new AWS.SageMaker();
    this.sagemakerRuntime = new AWS.SageMakerRuntime();
    this.s3 = new AWS.S3();
  }

  /**
   * Crear un trabajo de entrenamiento en SageMaker
   */
  async createTrainingJob(jobName, inputData) {
    try {
      const params = {
        TrainingJobName: jobName,
        RoleArn: process.env.SAGEMAKER_EXECUTION_ROLE_ARN,
        AlgorithmSpecification: {
          TrainingImage: '683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-scikit-learn:0.23-1-cpu-py3',
          TrainingInputMode: 'File'
        },
        InputDataConfig: [
          {
            ChannelName: 'training',
            DataSource: {
              S3DataSource: {
                S3DataType: 'S3Prefix',
                S3Uri: `s3://${process.env.SAGEMAKER_BUCKET_NAME}/training-data/`,
                S3DataDistributionType: 'FullyReplicated'
              }
            }
          }
        ],
        OutputDataConfig: {
          S3OutputPath: `s3://${process.env.SAGEMAKER_BUCKET_NAME}/model-output/`
        },
        ResourceConfig: {
          InstanceType: 'ml.m5.large',
          InstanceCount: 1,
          VolumeSizeInGB: 10
        },
        StoppingCondition: {
          MaxRuntimeInSeconds: 3600
        }
      };

      const result = await this.sagemaker.createTrainingJob(params).promise();
      console.log('✅ Trabajo de entrenamiento creado:', result.TrainingJobArn);
      return result;
    } catch (error) {
      console.error('❌ Error creando trabajo de entrenamiento:', error);
      throw error;
    }
  }

  /**
   * Crear un endpoint de SageMaker
   */
  async createEndpoint(endpointName, modelName) {
    try {
      // Crear configuración del endpoint
      const endpointConfigName = `${endpointName}-config`;
      const endpointConfig = {
        EndpointConfigName: endpointConfigName,
        ProductionVariants: [
          {
            ModelName: modelName,
            VariantName: 'primary',
            InitialInstanceCount: 1,
            InstanceType: 'ml.t2.medium',
            InitialVariantWeight: 1
          }
        ]
      };

      await this.sagemaker.createEndpointConfig(endpointConfig).promise();
      console.log('✅ Configuración del endpoint creada');

      // Crear el endpoint
      const endpointParams = {
        EndpointName: endpointName,
        EndpointConfigName: endpointConfigName
      };

      const result = await this.sagemaker.createEndpoint(endpointParams).promise();
      console.log('✅ Endpoint creado:', result.EndpointArn);
      return result;
    } catch (error) {
      console.error('❌ Error creando endpoint:', error);
      throw error;
    }
  }

  /**
   * Hacer una predicción usando un endpoint
   */
  async predict(endpointName, data) {
    try {
      const params = {
        EndpointName: endpointName,
        ContentType: 'application/json',
        Body: JSON.stringify(data)
      };

      const result = await this.sagemakerRuntime.invokeEndpoint(params).promise();
      const prediction = JSON.parse(result.Body.toString());
      
      console.log('✅ Predicción realizada:', prediction);
      return prediction;
    } catch (error) {
      console.error('❌ Error en predicción:', error);
      throw error;
    }
  }

  /**
   * Subir datos a S3 para entrenamiento
   */
  async uploadTrainingData(fileName, data) {
    try {
      const params = {
        Bucket: process.env.SAGEMAKER_BUCKET_NAME,
        Key: `training-data/${fileName}`,
        Body: data,
        ContentType: 'application/json'
      };

      const result = await this.s3.upload(params).promise();
      console.log('✅ Datos subidos a S3:', result.Location);
      return result;
    } catch (error) {
      console.error('❌ Error subiendo datos:', error);
      throw error;
    }
  }

  /**
   * Obtener estado de un trabajo de entrenamiento
   */
  async getTrainingJobStatus(jobName) {
    try {
      const params = { TrainingJobName: jobName };
      const result = await this.sagemaker.describeTrainingJob(params).promise();
      return result.TrainingJobStatus;
    } catch (error) {
      console.error('❌ Error obteniendo estado:', error);
      throw error;
    }
  }

  /**
   * Listar endpoints disponibles
   */
  async listEndpoints() {
    try {
      const result = await this.sagemaker.listEndpoints().promise();
      return result.Endpoints;
    } catch (error) {
      console.error('❌ Error listando endpoints:', error);
      throw error;
    }
  }
}

module.exports = SageMakerService;
