import { Construct, Stack, StackProps } from '@aws-cdk/core';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipelineactions from '@aws-cdk/aws-codepipeline-actions';
import * as pipelines from '@aws-cdk/pipelines';

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const asmArtifact = new codepipeline.Artifact();
    const sourceArtifact = new codepipeline.Artifact();

    new pipelines.CdkPipeline(this, "Pipeline", {
      cloudAssemblyArtifact: asmArtifact,
      sourceAction: new codepipelineactions.CodeStarConnectionsSourceAction({
        actionName: "Source",
        connectionArn: "your-codestar-connection-arn",
        output: sourceArtifact,
        owner: "your-owner",
        repo: "your-repo",
      }),
      synthAction: new pipelines.SimpleSynthAction({
        cloudAssemblyArtifact: asmArtifact,
        sourceArtifact: sourceArtifact,
        synthCommand: "cdk synth",
      }),
    });
  }
}
