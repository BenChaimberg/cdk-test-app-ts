import { Construct, Stack, StackProps } from '@aws-cdk/core';
import {
  Deployment,
  LambdaIntegration,
  Method,
  MethodLoggingLevel,
  Resource,
  RestApi,
  Stage,
} from '@aws-cdk/aws-apigateway'
import { Function, IFunction } from '@aws-cdk/aws-lambda'
import { ServicePrincipal } from '@aws-cdk/aws-iam'

export class TestAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const listFunc = Function.fromFunctionArn(this, 'List Resources', this.formatArn({ service: 'lambda', resource: 'function', resourceName: 'my-first-function', sep: ':' }));
    constructApiGateway(this, { listSomeResources: listFunc });
  }
}

interface Handlers {
  listSomeResources: IFunction;
}
interface Resources {
  someResources: Resource;
}
const constructEndpoints = (api: RestApi): Resources => {
  // Add records path
  const service = api.root.addResource('someService')
  const someResources = service.addResource('someResources')

  return {
    someResources,
  }
}

const DEFAULT_METHOD_OPTIONS = { apiKeyRequired: true }
const integrateResourcesHandlers = (resources: Resources, handlers: Handlers): Method[] => {
  const {
    someResources,
  } = resources
  const {
    listSomeResources,
  } = handlers

  // Integrations
  const listSomeResourcesIntegration = new LambdaIntegration(listSomeResources)

  // Add CORS options
  // Object.values(resources).forEach((resource: Resource) => addCorsOptions(resource))

  return [
    someResources.addMethod('GET', listSomeResourcesIntegration, DEFAULT_METHOD_OPTIONS),
  ]
}

const DEV_STAGE_NAME = 'dev'
const IS_DEV_CACHING_ENABLED = false
const DEV_THROTTLING_RATE_LIMIT = 1000
const DEV_THROTTLING_BURST_LIMIT = 200

const PROD_STAGE_NAME = 'prod-v1'
const IS_PROD_CACHING_ENABLED = false
const PROD_THROTTLING_RATE_LIMIT = 10
const PROD_THROTTLING_BURST_LIMIT = 2

interface DeploymentStages {
  dev: Stage;
  prod: Stage;
}
const constructDeploymentStages = (
  scope: Construct,
  api: RestApi,
): DeploymentStages => {
  const devDeployment = new Deployment(scope, `${DEV_STAGE_NAME}Deployment`, { api })
  const devStage = new Stage(scope, `${DEV_STAGE_NAME}Stage`, {
    stageName: DEV_STAGE_NAME,
    deployment: devDeployment,
    cachingEnabled: IS_DEV_CACHING_ENABLED,
    loggingLevel: MethodLoggingLevel.INFO,
  })

  const prodDeployment = new Deployment(scope, `${PROD_STAGE_NAME}Deployment`, { api })
  const prodStage = new Stage(scope, `${PROD_STAGE_NAME}Stage`, {
    stageName: PROD_STAGE_NAME,
    deployment: prodDeployment,
    cachingEnabled: IS_PROD_CACHING_ENABLED,
    loggingLevel: MethodLoggingLevel.ERROR,
  })

  api.deploymentStage = prodStage
  return {
    dev: devStage,
    prod: prodStage,
  }
}

const constructRateLimitApiKeys = (
  api: RestApi,
  methods: Method[],
  stages: DeploymentStages,
): void => {
  const config = [
    {
      name: 'Dev',
      rateLimit: DEV_THROTTLING_RATE_LIMIT,
      burstLimit: DEV_THROTTLING_BURST_LIMIT,
      apiKeyValue: 'env.values.API_KEY_DEV',
      stage: stages.dev,
    },
    {
      name: 'DefaultPublicAccess',
      rateLimit: PROD_THROTTLING_RATE_LIMIT,
      burstLimit: PROD_THROTTLING_BURST_LIMIT,
      apiKeyValue: 'env.values.API_KEY_DEFAULT_PUBLIC_ACCESS',
      stage: stages.prod,
    },
  ]
  config.forEach(({
    name,
    rateLimit,
    burstLimit,
    apiKeyValue,
    stage,
  }) => {
    const throttle = { rateLimit, burstLimit }

    const apiKeyName = `${name}ApiKey`
    const key = api.addApiKey(apiKeyName, {
      apiKeyName,
      value: apiKeyValue,
    })

    const planName = `${name}PlanName`
    const plan = api.addUsagePlan(planName, {
      name: planName,
      throttle,
    })
    plan.addApiKey(key)
    plan.addApiStage({
      stage,
      throttle: methods.map(method => ({ method, throttle })),
    })
    
    // The error occurred either with or without this line
    plan.node.addDependency(...methods)
  })
}

const grantLambdaInvoke = (
  api: RestApi,
  stages: DeploymentStages,
  handlers: Handlers,
): void => Object.values(stages).forEach(({ stageName }: Stage, stageIndex) => {
  const sourceArn = api.arnForExecuteApi('*', '/*', stageName)
  Object.values(handlers)
    .forEach((handler: Handlers[keyof Handlers], i) => {
      handler.addPermission(`apigatewayPermission_${stageIndex}_${i}`, {
        action: 'lambda:InvokeFunction',
        principal: new ServicePrincipal('apigateway.amazonaws.com'),
        sourceArn,
      })
    })
})

const constructApiGateway = (scope: Construct, handlers: Handlers): void => {
  const api = new RestApi(scope, 'SomeApiID', {
    restApiName: 'Some Service',
    description: 'Services for accessing some resources',
    deploy: false,
  })
  const resources = constructEndpoints(api)
  const methods = integrateResourcesHandlers(resources, handlers)
  const stages = constructDeploymentStages(scope, api)

  constructRateLimitApiKeys(api, methods, stages)
  grantLambdaInvoke(api, stages, handlers)
}
